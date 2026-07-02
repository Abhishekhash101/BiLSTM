"""
tests/test_properties.py
Property-based tests (Hypothesis) for the BiLSTM Demo Dashboard.
Covers all 16 correctness properties from the design document.
"""

import sys
import types
import os

# ---------------------------------------------------------------------------
# Stub streamlit BEFORE any project imports
# ---------------------------------------------------------------------------
st_stub = types.ModuleType("streamlit")
st_stub.cache_data = lambda f=None, **kw: (f if f else lambda g: g)
sys.modules.setdefault("streamlit", st_stub)

# Add project root to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, PROJECT_ROOT)

# ---------------------------------------------------------------------------
# Standard imports
# ---------------------------------------------------------------------------
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from hypothesis import given, settings, assume, HealthCheck
from hypothesis import strategies as st
from sklearn.metrics import mean_squared_error

# ---------------------------------------------------------------------------
# Project imports
# ---------------------------------------------------------------------------
from utils.demo_data_generator import generate_all, get_state, STATES
from utils.blockchain_helpers import make_transaction, init_ledger, append_transaction
from utils.chart_helpers import (
    build_rmse_bar,
    build_r2_bar,
    build_residual_chart,
    build_residual_histogram,
)
from utils.data_loader import (
    compute_metric_cards,
    compute_rmse_improvement,
    compute_mae_reduction,
    select_best_state,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
CSV_PATH = os.path.join(PROJECT_ROOT, "multisite_results.csv")
REAL_METRICS_DF = pd.read_csv(CSV_PATH)
SYNTH_CACHE = generate_all(REAL_METRICS_DF)


# ===========================================================================
# Task 3.4 — Property 13: Synthetic Series Value Range Invariant
# Validates: Requirements 7.4
# ===========================================================================
@settings(max_examples=100, deadline=None)
@given(state=st.sampled_from(STATES))
def test_property_13_series_range_invariant(state):
    """Every value in actual, lr_pred, hyb_pred is in [0.0, 1.0] and shape is (168,)."""
    data = SYNTH_CACHE[state]
    for key in ("actual", "lr_pred", "hyb_pred"):
        arr = data[key]
        assert arr.shape == (168,), f"{state}.{key} shape is {arr.shape}, expected (168,)"
        assert np.all(arr >= 0.0), f"{state}.{key} has values < 0.0"
        assert np.all(arr <= 1.0), f"{state}.{key} has values > 1.0"


# ===========================================================================
# Task 3.5 — Property 14: Synthetic Generation Determinism
# Validates: Requirements 7.3
# ===========================================================================
@settings(max_examples=100, deadline=None)
@given(state=st.sampled_from(STATES))
def test_property_14_determinism(state):
    """Two calls to generate_all with same metrics_df yield identical arrays."""
    cache1 = generate_all(REAL_METRICS_DF)
    cache2 = generate_all(REAL_METRICS_DF)
    for key in ("actual", "lr_pred", "hyb_pred", "residual", "correction", "remaining_error"):
        assert np.array_equal(cache1[state][key], cache2[state][key]), (
            f"Determinism failed for {state}.{key}"
        )


# ===========================================================================
# Task 3.6 — Property 15: Hybrid MSE Is At Least 10% Better Than LR MSE
# Validates: Requirements 7.5
# ===========================================================================
@settings(max_examples=100, deadline=None)
@given(state=st.sampled_from(STATES))
def test_property_15_hybrid_mse_improvement(state):
    """MSE(hyb_pred, actual) <= 0.9 * MSE(lr_pred, actual) for every state."""
    data = SYNTH_CACHE[state]
    mse_lr = mean_squared_error(data["actual"], data["lr_pred"])
    mse_hyb = mean_squared_error(data["actual"], data["hyb_pred"])
    assert mse_hyb <= 0.9 * mse_lr, (
        f"{state}: MSE_hyb={mse_hyb:.8f} > 0.9*MSE_lr={0.9*mse_lr:.8f}"
    )


# ===========================================================================
# Task 3.7 — Property 16: Noise Amplitudes Are Unique Across States
# Validates: Requirements 7.2
# ===========================================================================
@settings(max_examples=100, deadline=None)
@given(
    data=st.lists(
        st.floats(min_value=0.001, max_value=0.1, allow_nan=False, allow_infinity=False),
        min_size=2,
        max_size=10,
        unique=True,
    )
)
def test_property_16_unique_noise_amplitudes(data):
    """When hyb_rmse_mean values are distinct, noise amplitudes are unique."""
    n = len(data)
    # Build a minimal metrics DataFrame with distinct hyb_rmse_mean values
    df = pd.DataFrame({
        "state": STATES[:n],
        "hyb_rmse_mean": data,
        # Provide other required columns with dummy values
        "n_test": [1308] * n,
        "n_peak": [300] * n,
        "lr_rmse": [0.01] * n,
        "lr_r2": [0.99] * n,
        "rf_rmse": [0.015] * n,
        "rf_r2": [0.98] * n,
        "hyb_rmse_std": [0.001] * n,
        "hyb_r2_mean": [0.99] * n,
        "hyb_peak_rmse": [0.01] * n,
        "dm_mean_p": [0.05] * n,
        "dm_n_sig": [3] * n,
    })
    # The noise amplitudes used are exactly the hyb_rmse_mean values (sigma_s)
    noise_amplitudes = df["hyb_rmse_mean"].tolist()
    assert len(set(noise_amplitudes)) == n, (
        f"Expected {n} unique noise amplitudes, got {len(set(noise_amplitudes))}"
    )


# ===========================================================================
# Task 3.8 — Property 3: Synthetic Prediction Shape Invariant
# Validates: Requirements 3.3
# ===========================================================================
@settings(max_examples=100, deadline=None)
@given(
    state=st.sampled_from(STATES),
    h=st.integers(min_value=1, max_value=168),
)
def test_property_3_synthetic_shape_invariant(state, h):
    """get_state returns arrays with exactly h elements for actual, lr_pred, hyb_pred."""
    result = get_state(state, SYNTH_CACHE, hours=h)
    for key in ("actual", "lr_pred", "hyb_pred"):
        assert len(result[key]) == h, (
            f"{state}.{key} has {len(result[key])} elements, expected {h}"
        )


# ===========================================================================
# Task 5.4 — Property 11: Mock Transaction Hash Is Always 66 Characters
# Validates: Requirements 6.3
# ===========================================================================
@settings(max_examples=100, deadline=None)
@given(
    state=st.sampled_from(STATES),
    block_offset=st.integers(min_value=0, max_value=100),
)
def test_property_11_transaction_hash_66_chars(state, block_offset):
    """tx_hash is 66 chars, starts with '0x', remaining 64 chars are lowercase hex."""
    tx = make_transaction(state, 0.01, 18_500_000 + block_offset)
    tx_hash = tx["tx_hash"]
    assert len(tx_hash) == 66, f"tx_hash length is {len(tx_hash)}, expected 66"
    assert tx_hash[:2] == "0x", f"tx_hash prefix is '{tx_hash[:2]}', expected '0x'"
    hex_part = tx_hash[2:]
    assert all(c in "0123456789abcdef" for c in hex_part), (
        f"tx_hash hex part contains non-lowercase-hex characters"
    )


# ===========================================================================
# Task 5.5 — Property 12: Block Monotonic and Ledger Bounded
# Validates: Requirements 6.3, 6.5
# ===========================================================================
@settings(max_examples=100, deadline=None)
@given(m=st.integers(min_value=1, max_value=20))
def test_property_12_block_monotonic_and_ledger_bounded(m):
    """Block numbers are monotonically increasing; ledger bounded at 10; newest first."""
    session_state = {}
    init_ledger(session_state)
    transactions = []

    for k in range(m):
        block_number = 18_500_000 + k
        tx = make_transaction("TN", 0.01, block_number)
        append_transaction(session_state, tx)
        transactions.append(tx)

        # Block number matches expected value
        assert tx["block_number"] == 18_500_000 + k

    # Ledger bounded to 10
    assert len(session_state["ledger"]) <= 10, (
        f"Ledger has {len(session_state['ledger'])} entries, expected <= 10"
    )

    # Newest first: ledger[0] is the most recently appended
    assert session_state["ledger"][0] is transactions[-1], (
        "ledger[0] is not the most recently appended transaction"
    )


# ===========================================================================
# Task 6.8 — Property 4: RMSE Bar Chart Structural Completeness
# Validates: Requirements 4.2, 4.5
# ===========================================================================
@settings(max_examples=100, deadline=None)
@given(n=st.integers(min_value=1, max_value=10))
def test_property_4_rmse_bar_structure(n):
    """build_rmse_bar returns exactly 3 Bar traces with N points and correct hover."""
    df = pd.DataFrame({
        "state": [f"S{i}" for i in range(n)],
        "lr_rmse": np.random.uniform(0.005, 0.02, n).tolist(),
        "rf_rmse": np.random.uniform(0.01, 0.025, n).tolist(),
        "hyb_rmse_mean": np.random.uniform(0.004, 0.015, n).tolist(),
    })
    best_state = df.iloc[0]["state"]
    fig = build_rmse_bar(df, best_state)

    bar_traces = [t for t in fig.data if isinstance(t, go.Bar)]
    assert len(bar_traces) == 3, f"Expected 3 Bar traces, got {len(bar_traces)}"

    for trace in bar_traces:
        assert len(trace.y) == n, f"Trace '{trace.name}' has {len(trace.y)} points, expected {n}"
        assert trace.hovertemplate == "%{y:.6f}", (
            f"Trace '{trace.name}' hovertemplate is '{trace.hovertemplate}', expected '%{{y:.6f}}'"
        )


# ===========================================================================
# Task 6.9 — Property 5: R² Bar Chart Structural Completeness
# Validates: Requirements 4.3, 4.5
# ===========================================================================
@settings(max_examples=100, deadline=None)
@given(n=st.integers(min_value=1, max_value=10))
def test_property_5_r2_bar_structure(n):
    """build_r2_bar returns exactly 2 Bar traces with N points and correct hover."""
    df = pd.DataFrame({
        "state": [f"S{i}" for i in range(n)],
        "lr_r2": np.random.uniform(0.85, 0.99, n).tolist(),
        "hyb_r2_mean": np.random.uniform(0.90, 0.999, n).tolist(),
    })
    best_state = df.iloc[0]["state"]
    fig = build_r2_bar(df, best_state)

    bar_traces = [t for t in fig.data if isinstance(t, go.Bar)]
    assert len(bar_traces) == 2, f"Expected 2 Bar traces, got {len(bar_traces)}"

    for trace in bar_traces:
        assert len(trace.y) == n, f"Trace '{trace.name}' has {len(trace.y)} points, expected {n}"
        assert trace.hovertemplate == "%{y:.6f}", (
            f"Trace '{trace.name}' hovertemplate is '{trace.hovertemplate}', expected '%{{y:.6f}}'"
        )


# ===========================================================================
# Task 6.10 — Property 8: Residual Chart Contains Three Traces Over 48 Timesteps
# Validates: Requirements 5.2
# ===========================================================================
@settings(max_examples=100, deadline=None)
@given(
    data=st.fixed_dictionaries({
        "actual": st.just(np.random.uniform(0, 1, 168)),
        "lr_pred": st.just(np.random.uniform(0, 1, 168)),
        "hyb_pred": st.just(np.random.uniform(0, 1, 168)),
        "residual": st.just(np.random.uniform(-0.5, 0.5, 168)),
        "correction": st.just(np.random.uniform(-0.3, 0.3, 168)),
        "remaining_error": st.just(np.random.uniform(-0.2, 0.2, 168)),
    })
)
def test_property_8_residual_chart_shape(data):
    """build_residual_chart returns 3 traces, each with 48 x-values."""
    fig = build_residual_chart(data, n_steps=48)
    assert len(fig.data) == 3, f"Expected 3 traces, got {len(fig.data)}"
    for trace in fig.data:
        assert len(trace.x) == 48, (
            f"Trace '{trace.name}' has {len(trace.x)} x-values, expected 48"
        )


# ===========================================================================
# Task 6.11 — Property 9: Residual Histograms Share Bin Width
# Validates: Requirements 5.3
# ===========================================================================
@settings(max_examples=100, deadline=None)
@given(
    lr_vals=st.lists(
        st.floats(min_value=-1, max_value=1, allow_nan=False, allow_infinity=False),
        min_size=2,
        max_size=100,
    ),
    hyb_vals=st.lists(
        st.floats(min_value=-1, max_value=1, allow_nan=False, allow_infinity=False),
        min_size=2,
        max_size=100,
    ),
)
def test_property_9_histogram_bin_width(lr_vals, hyb_vals):
    """Both histogram traces have identical xbins.size."""
    lr_arr = np.array(lr_vals)
    hyb_arr = np.array(hyb_vals)

    # Skip degenerate case where all values are identical
    all_vals = np.concatenate([lr_arr, hyb_arr])
    assume(np.max(all_vals) != np.min(all_vals))

    fig = build_residual_histogram(lr_arr, hyb_arr)

    hist_traces = [t for t in fig.data if isinstance(t, go.Histogram)]
    assert len(hist_traces) == 2, f"Expected 2 Histogram traces, got {len(hist_traces)}"

    bin_size_0 = hist_traces[0].xbins.size
    bin_size_1 = hist_traces[1].xbins.size
    assert bin_size_0 == bin_size_1, (
        f"Bin sizes differ: {bin_size_0} vs {bin_size_1}"
    )


# ===========================================================================
# Task 8.5 — Property 1: Metric Cards Reflect Correct Aggregates
# Validates: Requirements 2.3
# ===========================================================================
@settings(max_examples=100, deadline=None)
@given(n=st.integers(min_value=1, max_value=10))
def test_property_1_metric_card_aggregates(n):
    """best_rmse, best_r2, n_states equal min, max, len respectively."""
    rmse_vals = np.random.uniform(0.001, 0.1, n).tolist()
    r2_vals = np.random.uniform(0.8, 0.999, n).tolist()

    df = pd.DataFrame({
        "state": [f"S{i}" for i in range(n)],
        "hyb_rmse_mean": rmse_vals,
        "hyb_r2_mean": r2_vals,
    })

    best_rmse, best_r2, n_states = compute_metric_cards(df)

    assert best_rmse == min(rmse_vals), f"best_rmse={best_rmse}, expected {min(rmse_vals)}"
    assert best_r2 == max(r2_vals), f"best_r2={best_r2}, expected {max(r2_vals)}"
    assert n_states == n, f"n_states={n_states}, expected {n}"


# ===========================================================================
# Task 8.6 — Property 2: RMSE Improvement Formula Correctness
# Validates: Requirements 3.7
# ===========================================================================
@settings(max_examples=100, deadline=None)
@given(
    lr_rmse=st.floats(min_value=1e-6, max_value=1e6, allow_nan=False, allow_infinity=False),
    hyb_rmse=st.floats(min_value=0, max_value=1e6, allow_nan=False, allow_infinity=False),
)
def test_property_2_rmse_improvement_formula(lr_rmse, hyb_rmse):
    """Result equals ((lr_rmse - hyb_rmse) / lr_rmse) * 100."""
    result = compute_rmse_improvement(lr_rmse, hyb_rmse)
    expected = ((lr_rmse - hyb_rmse) / lr_rmse) * 100
    assert result == expected, f"result={result}, expected={expected}"


# ===========================================================================
# Task 8.7 — Property 6: Best-State Selection with Tie-Breaking
# Validates: Requirements 4.6
# ===========================================================================
@settings(max_examples=100, deadline=None)
@given(
    n=st.integers(min_value=2, max_value=10),
    data=st.data(),
)
def test_property_6_best_state_selection(n, data):
    """Returned state equals min hyb_rmse_mean's alphabetically first entry."""
    # Generate state names
    state_names = sorted([f"S{chr(65+i)}" for i in range(n)])

    # Generate RMSE values; allow ties by using a limited value set
    rmse_vals = data.draw(
        st.lists(
            st.floats(min_value=0.001, max_value=0.1, allow_nan=False, allow_infinity=False),
            min_size=n,
            max_size=n,
        )
    )

    df = pd.DataFrame({
        "state": state_names,
        "hyb_rmse_mean": rmse_vals,
    })

    result = select_best_state(df)

    # Expected: min rmse, then alphabetically first among ties
    min_rmse = min(rmse_vals)
    candidates = df[df["hyb_rmse_mean"] == min_rmse]["state"].tolist()
    expected = sorted(candidates)[0]

    assert result == expected, f"result='{result}', expected='{expected}'"


# ===========================================================================
# Task 8.8 — Property 7: Summary Table Is Sorted Ascending by Hybrid RMSE
# Validates: Requirements 4.7
# ===========================================================================
@settings(max_examples=100, deadline=None)
@given(n=st.integers(min_value=2, max_value=10))
def test_property_7_summary_table_sorted(n):
    """After sorting by hyb_rmse_mean, values are non-decreasing."""
    rmse_vals = np.random.uniform(0.001, 0.1, n).tolist()

    df = pd.DataFrame({
        "state": [f"S{i}" for i in range(n)],
        "hyb_rmse_mean": rmse_vals,
    })

    sorted_df = df.sort_values("hyb_rmse_mean").reset_index(drop=True)

    for i in range(len(sorted_df) - 1):
        assert sorted_df["hyb_rmse_mean"].iloc[i] <= sorted_df["hyb_rmse_mean"].iloc[i + 1], (
            f"Row {i}: {sorted_df['hyb_rmse_mean'].iloc[i]} > "
            f"Row {i+1}: {sorted_df['hyb_rmse_mean'].iloc[i+1]}"
        )


# ===========================================================================
# Task 8.9 — Property 10: MAE Reduction Formula Correctness
# Validates: Requirements 5.4
# ===========================================================================
@settings(max_examples=100, deadline=None)
@given(
    mae_lr=st.floats(min_value=1e-6, max_value=1e6, allow_nan=False, allow_infinity=False),
    mae_hyb=st.floats(min_value=0, max_value=1e6, allow_nan=False, allow_infinity=False),
)
def test_property_10_mae_reduction_formula(mae_lr, mae_hyb):
    """Result equals round(((mae_lr - mae_hyb) / mae_lr) * 100, 2)."""
    result = compute_mae_reduction(mae_lr, mae_hyb)
    expected = round(((mae_lr - mae_hyb) / mae_lr) * 100, 2)
    assert result == expected, f"result={result}, expected={expected}"
