"""
Cell 42: Multi-Site Evaluation — 10 Indian States
=================================================
Run the full pipeline (data→features→LR→hybrid) for 10 states to validate
generalizability. All metrics in log-space: y = log1p(P_gen / P_peak).

Paste this cell into finalBILSTM.ipynb after Cell 41.

States chosen: TN, GJ, RJ, KA, MH, AP, MP, OR, UP, WB
These have both solar (fixed-tilt) and wind (existingAdjusted) data.
"""

import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import root_mean_squared_error, mean_absolute_error, r2_score
from scipy import stats
import tensorflow as tf
from tensorflow import keras

# ============================================================
# CONFIGURATION
# ============================================================
STATES = ['TN', 'GJ', 'RJ', 'KA', 'MH', 'AP', 'MP', 'OR', 'UP', 'WB']
LOOKBACK = 48
SEEDS = [42, 123, 456, 789, 2024]
PEAK_THRESHOLD = 0.20
SCHEDULER_THRESHOLD = 0.15

ROOT_DIR = Path("raw_data/raw_data")
CAPACITY_FACTORS_DIR = ROOT_DIR / "capacity_factors" / "capacity_factors"

FOLDER_MAP = {
    "solarPV_fixedTilt": "solar_fixed_cf",
    "solarPV_singleAxis": "solar_tracking_cf",
    "solarPV_roofTop": "solar_rooftop_cf",
    "wind_existingAdjusted": "wind_cf",
}

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def load_state_capacity_factors(state_abbr):
    """Load and aggregate capacity factors for a given state."""
    dfs = {}
    for folder_name, col_name in FOLDER_MAP.items():
        folder_path = CAPACITY_FACTORS_DIR / folder_name
        csv_files = sorted(folder_path.glob("*.csv"))
        
        frames = []
        for fp in csv_files:
            df = pd.read_csv(fp, low_memory=False)
            if 'load_zone_abr' not in df.columns:
                continue
            df_state = df[df['load_zone_abr'] == state_abbr]
            if len(df_state) > 0:
                frames.append(df_state[['time', 'capacity_factor']].copy())
        
        if len(frames) == 0:
            # State not found in this folder — skip
            continue
            
        df_all = pd.concat(frames, ignore_index=True)
        df_all['time'] = pd.to_datetime(df_all['time'])
        df_agg = df_all.groupby('time')['capacity_factor'].mean().reset_index()
        df_agg = df_agg.rename(columns={'capacity_factor': col_name})
        dfs[col_name] = df_agg
    
    if len(dfs) == 0:
        return None
    
    # Merge all on time
    result = None
    for col_name, df in dfs.items():
        if result is None:
            result = df
        else:
            result = result.merge(df, on='time', how='outer')
    
    result = result.sort_values('time').reset_index(drop=True)
    result = result.fillna(0)  # Fill missing CFs with 0
    
    # Check we have 8760 hours
    if len(result) != 8760:
        print(f"  WARNING: {state_abbr} has {len(result)} rows (expected 8760)")
        return None
    
    return result


def engineer_features(df_master):
    """Engineer features: P_gen, P_load, SoC, cyclical time."""
    df = df_master.copy()
    
    # Get available CF columns
    cf_cols = [c for c in df.columns if c != 'time']
    
    # Installed capacities (simplified — use mean CF * nominal capacity)
    # Use a generic capacity scaling
    solar_cols = [c for c in cf_cols if 'solar' in c]
    wind_cols = [c for c in cf_cols if 'wind' in c]
    
    # P_gen: weighted sum of capacity factors (normalized)
    solar_total = df[solar_cols].sum(axis=1) if solar_cols else 0
    wind_total = df[wind_cols].sum(axis=1) if wind_cols else 0
    
    # Scale to MW-like values
    df['P_gen'] = (solar_total * 3000 + wind_total * 2000)  # Approximate installed capacity
    
    # Modeled load (deterministic daily profile)
    hours = df['time'].dt.hour
    df['P_load'] = 7000 + 7000 * np.sin(np.pi * hours / 12)
    
    # Battery SoC (simplified cycling model)
    soc = np.zeros(len(df))
    soc[0] = 0.5
    for i in range(1, len(df)):
        charge_rate = 0.1 * (df['P_gen'].iloc[i] / df['P_load'].iloc[i] - 0.5)
        soc[i] = np.clip(soc[i-1] + charge_rate, 0.1, 0.9)
    df['SoC'] = soc
    
    # Cyclical time encodings
    df['hour_sin'] = np.sin(2 * np.pi * hours / 24)
    df['hour_cos'] = np.cos(2 * np.pi * hours / 24)
    day_of_year = df['time'].dt.dayofyear
    df['day_sin'] = np.sin(2 * np.pi * day_of_year / 365)
    df['day_cos'] = np.cos(2 * np.pi * day_of_year / 365)
    
    # Target: log1p(P_gen / P_peak)
    P_peak = df['P_load'].max()
    df['y_target'] = np.log1p(df['P_gen'] / P_peak)
    
    # Feature columns
    feature_cols = cf_cols + ['P_gen', 'P_load', 'SoC', 'hour_sin', 'hour_cos', 'day_sin', 'day_cos']
    
    return df, feature_cols


def create_sequences(features, target, lookback):
    """Create lookback sequences."""
    X, y = [], []
    for i in range(lookback, len(features)):
        X.append(features[i-lookback:i])
        y.append(target[i])
    return np.array(X), np.array(y).reshape(-1, 1)


def build_attention_bilstm(input_shape):
    """Build attention-based BiLSTM residual learner."""
    inputs = keras.layers.Input(shape=input_shape)
    x = keras.layers.Bidirectional(keras.layers.LSTM(16, return_sequences=True))(inputs)
    
    # Attention
    attention = keras.layers.Dense(1, activation='tanh')(x)
    attention = keras.layers.Flatten()(attention)
    attention = keras.layers.Activation('softmax')(attention)
    attention = keras.layers.RepeatVector(32)(attention)
    attention = keras.layers.Permute([2, 1])(attention)
    
    context = keras.layers.Multiply()([x, attention])
    context = keras.layers.Lambda(lambda x: tf.reduce_sum(x, axis=1))(context)
    
    x = keras.layers.Dropout(0.2)(context)
    x = keras.layers.Dense(16, activation='relu')(x)
    x = keras.layers.Dropout(0.1)(x)
    output = keras.layers.Dense(1)(x)
    
    model = keras.Model(inputs, output)
    model.compile(optimizer='adam', loss='mse', metrics=['mae'])
    return model


def diebold_mariano_test(actual, pred1, pred2, h=1):
    """DM test: positive stat means pred2 is better."""
    e1 = actual - pred1
    e2 = actual - pred2
    d = e1**2 - e2**2
    
    n = len(d)
    mean_d = np.mean(d)
    
    # Newey-West variance estimate
    gamma_0 = np.var(d, ddof=1)
    gamma_sum = 0
    for k in range(1, h):
        gamma_k = np.cov(d[k:], d[:-k], ddof=1)[0, 1]
        gamma_sum += 2 * gamma_k
    
    var_d = (gamma_0 + gamma_sum) / n
    if var_d <= 0:
        return 0, 1.0, mean_d
    
    dm_stat = mean_d / np.sqrt(var_d)
    p_value = 2 * (1 - stats.norm.cdf(abs(dm_stat)))
    
    return dm_stat, p_value, mean_d


def evaluate_state(state_abbr):
    """Run full pipeline for one state. Returns dict of results."""
    print(f"\n{'='*60}")
    print(f"  Processing state: {state_abbr}")
    print(f"{'='*60}")
    
    # 1. Load data
    df_master = load_state_capacity_factors(state_abbr)
    if df_master is None:
        print(f"  SKIPPED: insufficient data for {state_abbr}")
        return None
    
    # 2. Engineer features
    df, feature_cols = engineer_features(df_master)
    
    # Use only available feature columns (some states may lack certain CFs)
    available_features = [c for c in feature_cols if c in df.columns]
    n_features = len(available_features)
    print(f"  Features: {n_features}, Rows: {len(df)}")
    
    # 3. Normalize features
    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(df[available_features].values)
    target = df['y_target'].values
    
    # 4. Create sequences
    X_seq, y_seq = create_sequences(features_scaled, target, LOOKBACK)
    
    # 5. Split: train/val/test (same proportions as TN)
    n_total = len(X_seq)
    n_train = int(n_total * 0.7)
    n_val = int(n_total * 0.15)
    
    X_train, y_train = X_seq[:n_train], y_seq[:n_train]
    X_val, y_val = X_seq[n_train:n_train+n_val], y_seq[n_train:n_train+n_val]
    X_test, y_test = X_seq[n_train+n_val:], y_seq[n_train+n_val:]
    
    n_test = len(X_test)
    print(f"  Train: {n_train}, Val: {n_val}, Test: {n_test}")
    
    y_train_flat = y_train.flatten()
    y_val_flat = y_val.flatten()
    y_test_flat = y_test.flatten()
    
    # Flatten for classical models
    n_feat_flat = LOOKBACK * n_features
    X_train_flat = X_train.reshape(n_train, n_feat_flat)
    X_val_flat = X_val.reshape(n_val, n_feat_flat)
    X_test_flat = X_test.reshape(n_test, n_feat_flat)
    
    # 6. Linear Regression
    lr = LinearRegression()
    lr.fit(X_train_flat, y_train_flat)
    lr_test_pred = lr.predict(X_test_flat)
    
    lr_rmse = root_mean_squared_error(y_test_flat, lr_test_pred)
    lr_mae = mean_absolute_error(y_test_flat, lr_test_pred)
    lr_r2 = r2_score(y_test_flat, lr_test_pred)
    
    # 7. Random Forest
    rf = RandomForestRegressor(n_estimators=200, max_depth=12, min_samples_leaf=2, random_state=42, n_jobs=-1)
    rf.fit(X_train_flat, y_train_flat)
    rf_test_pred = rf.predict(X_test_flat)
    
    rf_rmse = root_mean_squared_error(y_test_flat, rf_test_pred)
    rf_r2 = r2_score(y_test_flat, rf_test_pred)
    
    # 8. Multi-seed Hybrid evaluation
    hybrid_results = []
    dm_results = []
    input_shape = (LOOKBACK, n_features)
    
    # Compute LR residuals for training
    lr_train_pred = lr.predict(X_train_flat)
    lr_val_pred = lr.predict(X_val_flat)
    residual_train = y_train_flat - lr_train_pred
    residual_val = y_val_flat - lr_val_pred
    
    for seed in SEEDS:
        tf.keras.utils.set_random_seed(seed)
        
        model = build_attention_bilstm(input_shape)
        model.fit(
            X_train, residual_train.reshape(-1, 1),
            validation_data=(X_val, residual_val.reshape(-1, 1)),
            epochs=200, batch_size=64, verbose=0,
            callbacks=[
                keras.callbacks.EarlyStopping(patience=15, restore_best_weights=True, monitor='val_loss'),
                keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=5, min_lr=1e-6)
            ]
        )
        
        # Predict residual and add to LR
        bilstm_pred = model.predict(X_test, verbose=0).flatten()
        hybrid_pred = lr_test_pred + bilstm_pred
        
        h_rmse = root_mean_squared_error(y_test_flat, hybrid_pred)
        h_mae = mean_absolute_error(y_test_flat, hybrid_pred)
        h_r2 = r2_score(y_test_flat, hybrid_pred)
        
        # Peak subset
        peak_mask = y_test_flat >= PEAK_THRESHOLD
        n_peak = peak_mask.sum()
        peak_rmse = root_mean_squared_error(y_test_flat[peak_mask], hybrid_pred[peak_mask]) if n_peak > 10 else np.nan
        
        # DM test
        dm_stat, dm_p, _ = diebold_mariano_test(y_test_flat, lr_test_pred, hybrid_pred, h=48)
        
        hybrid_results.append({
            'seed': seed, 'RMSE': h_rmse, 'MAE': h_mae, 'R2': h_r2,
            'peak_RMSE': peak_rmse
        })
        dm_results.append({'seed': seed, 'DM_stat': dm_stat, 'DM_p': dm_p})
        
        # Clean up
        del model
        keras.backend.clear_session()
    
    hybrid_df = pd.DataFrame(hybrid_results)
    dm_df = pd.DataFrame(dm_results)
    
    n_significant = (dm_df['DM_p'] < 0.05).sum()
    
    # Peak count
    peak_mask = y_test_flat >= PEAK_THRESHOLD
    n_peak = peak_mask.sum()
    
    result = {
        'state': state_abbr,
        'n_test': n_test,
        'n_peak': int(n_peak),
        'lr_rmse': lr_rmse,
        'lr_mae': lr_mae,
        'lr_r2': lr_r2,
        'rf_rmse': rf_rmse,
        'rf_r2': rf_r2,
        'hybrid_rmse_mean': hybrid_df['RMSE'].mean(),
        'hybrid_rmse_std': hybrid_df['RMSE'].std(),
        'hybrid_mae_mean': hybrid_df['MAE'].mean(),
        'hybrid_r2_mean': hybrid_df['R2'].mean(),
        'hybrid_peak_rmse_mean': hybrid_df['peak_RMSE'].mean(),
        'dm_mean_stat': dm_df['DM_stat'].mean(),
        'dm_mean_p': dm_df['DM_p'].mean(),
        'dm_n_significant': int(n_significant),
    }
    
    print(f"  LR:     RMSE={lr_rmse:.6f}, R²={lr_r2:.6f}")
    print(f"  RF:     RMSE={rf_rmse:.6f}, R²={rf_r2:.6f}")
    print(f"  Hybrid: RMSE={hybrid_df['RMSE'].mean():.6f}±{hybrid_df['RMSE'].std():.6f}, R²={hybrid_df['R2'].mean():.6f}")
    print(f"  DM:     mean_stat={dm_df['DM_stat'].mean():.4f}, mean_p={dm_df['DM_p'].mean():.4f}, significant={n_significant}/5")
    print(f"  Peak:   n={n_peak}, hybrid peak RMSE={hybrid_df['peak_RMSE'].mean():.6f}")
    
    return result


# ============================================================
# MAIN EXECUTION
# ============================================================
if __name__ == "__main__":
    print("=" * 80)
    print("MULTI-SITE EVALUATION: 10 Indian States")
    print("All metrics in log-transformed space: y = log1p(P_gen/P_peak)")
    print("=" * 80)
    
    all_results = []
    for state in STATES:
        result = evaluate_state(state)
        if result is not None:
            all_results.append(result)
    
    # Summary table
    print("\n\n" + "=" * 80)
    print("MULTI-SITE RESULTS SUMMARY (FOR PAPER)")
    print("=" * 80)
    
    results_df = pd.DataFrame(all_results)
    
    print("\n--- Per-State Results ---")
    print(results_df[['state', 'n_test', 'n_peak', 'lr_rmse', 'hybrid_rmse_mean', 'hybrid_rmse_std', 'dm_mean_p', 'dm_n_significant']].to_string(index=False))
    
    print(f"\n--- Aggregate Across {len(all_results)} States ---")
    print(f"  LR mean RMSE:     {results_df['lr_rmse'].mean():.6f} ± {results_df['lr_rmse'].std():.6f}")
    print(f"  Hybrid mean RMSE: {results_df['hybrid_rmse_mean'].mean():.6f} ± {results_df['hybrid_rmse_mean'].std():.6f}")
    print(f"  LR mean R²:       {results_df['lr_r2'].mean():.6f}")
    print(f"  Hybrid mean R²:   {results_df['hybrid_r2_mean'].mean():.6f}")
    print(f"  States where DM significant (any seed): {(results_df['dm_n_significant'] > 0).sum()}/{len(results_df)}")
    print(f"  Mean DM p-value:  {results_df['dm_mean_p'].mean():.4f}")
    
    # Save results
    results_df.to_csv("multisite_results.csv", index=False)
    print(f"\nResults saved to multisite_results.csv")
    print("\nDone! Copy these numbers into the paper's multi-site table.")
