"""
utils/demo_data_generator.py
-----------------------------
Deterministic synthetic time-series generator for the BiLSTM Demo Dashboard.

All data is generated algorithmically from per-state RMSE values loaded out of
multisite_results.csv.  No TensorFlow / model weights are required at runtime.

Public API
----------
generate_all(metrics_df)  -> dict[str, dict]
get_state(state, synth_cache, hours=168) -> dict
fallback_metrics()        -> pd.DataFrame
"""

import sys
import warnings

import numpy as np
import pandas as pd
from sklearn.metrics import mean_squared_error

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

STATES = ["TN", "GJ", "RJ", "KA", "MH", "AP", "MP", "OR", "UP", "WB"]

# ---------------------------------------------------------------------------
# Public functions
# ---------------------------------------------------------------------------


def generate_all(metrics_df: pd.DataFrame) -> dict:
    """
    Generate deterministic synthetic hourly time series for every state.

    Parameters
    ----------
    metrics_df : pd.DataFrame
        Must contain columns ``state`` and ``hyb_rmse_mean``.

    Returns
    -------
    dict[str, dict]
        Keyed by state abbreviation.  Each value is a dict with keys:
          - ``actual``          np.ndarray shape (168,)  range [0, 1]
          - ``lr_pred``         np.ndarray shape (168,)  range [0, 1]
          - ``hyb_pred``        np.ndarray shape (168,)  range [0, 1]
          - ``residual``        np.ndarray shape (168,)  (actual - lr_pred)
          - ``correction``      np.ndarray shape (168,)  (BiLSTM-recovered portion)
          - ``remaining_error`` np.ndarray shape (168,)  (residual - correction)

    Notes
    -----
    Seed is fixed at 42 and states are iterated in the fixed order defined by
    ``STATES`` so that two successive calls with the same ``metrics_df`` always
    produce bit-identical arrays (Requirements 7.3).

    Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
    """
    rng = np.random.default_rng(42)
    result = {}

    for state in STATES:
        # --- noise amplitude from metrics (Requirement 7.2) ----------------
        row = metrics_df[metrics_df["state"] == state]
        sigma = float(row["hyb_rmse_mean"].iloc[0])

        # Step 1: base signal — composite sinusoidal diurnal pattern
        t = np.arange(168)
        base = (
            0.35 * np.sin(2 * np.pi * t / 24 - np.pi / 2)
            + 0.15 * np.sin(2 * np.pi * t / (24 * 7))
        )
        base = np.clip(base, 0, None)  # generation is non-negative

        # Step 2: actual series (Requirement 7.4 — clipped to [0, 1])
        actual = np.clip(base + rng.normal(0, sigma * 0.5, 168), 0, 1)

        # Step 3: LR prediction — deliberately noisier than actual
        lr_pred = np.clip(actual + rng.normal(0, sigma * 1.2, 168), 0, 1)

        # Step 4: residual
        residual = actual - lr_pred

        # Step 5: BiLSTM correction (~65 % of residual recovered)
        correction = residual * 0.65 + rng.normal(0, sigma * 0.3, 168)

        # Step 6: hybrid prediction (Requirement 7.4 — clipped to [0, 1])
        hyb_pred = np.clip(lr_pred + correction, 0, 1)

        # Step 7: 10 % improvement guarantee loop — max 5 iterations
        # (Requirement 7.5)
        for _ in range(5):
            mse_lr = mean_squared_error(actual, lr_pred)
            mse_hyb = mean_squared_error(actual, hyb_pred)
            if mse_hyb <= 0.9 * mse_lr:
                break
            correction = correction * 1.1
            hyb_pred = np.clip(lr_pred + correction, 0, 1)

        # Step 8: remaining error
        remaining_error = residual - correction

        result[state] = {
            "actual": actual,
            "lr_pred": lr_pred,
            "hyb_pred": hyb_pred,
            "residual": residual,
            "correction": correction,
            "remaining_error": remaining_error,
        }

    return result


def get_state(state: str, synth_cache: dict, hours: int = 168) -> dict:
    """
    Return a sliced view of the synthetic cache for a single state.

    Parameters
    ----------
    state : str
        State abbreviation, e.g. ``"TN"``.
    synth_cache : dict
        Output of :func:`generate_all`.
    hours : int, optional
        Number of leading timesteps to return (default 168).

    Returns
    -------
    dict
        Same six-key structure as each entry in the ``generate_all`` output,
        but each array is sliced to ``[:hours]``.

    Raises
    ------
    KeyError
        If ``state`` is not a key in ``synth_cache``.

    Requirements: 3.3
    """
    if state not in synth_cache:
        raise KeyError(f"State '{state}' not found in synthetic cache.")
    state_data = synth_cache[state]
    return {key: arr[:hours] for key, arr in state_data.items()}


def fallback_metrics() -> pd.DataFrame:
    """
    Hard-coded approximate RMSE / R² values for all 10 states.

    Called when ``multisite_results.csv`` cannot be parsed.  Emits a
    ``RuntimeWarning`` to ``sys.stderr`` so callers are aware they are
    working with approximate data.

    Returns
    -------
    pd.DataFrame
        10-row DataFrame with the same column schema as the real CSV.

    Requirements: 7.6
    """
    warnings.warn(
        "multisite_results.csv could not be loaded.  "
        "Falling back to hard-coded approximate metrics.  "
        "Synthetic data quality may differ from the real-data calibration.",
        RuntimeWarning,
        stacklevel=2,
    )

    data = {
        "state":        STATES,
        "n_test":       [1260, 1260, 1260, 1260, 1260, 1260, 1260, 1260, 1260, 1260],
        "n_peak":       [315,  315,  315,  315,  315,  315,  315,  315,  315,  315],
        "lr_rmse":      [0.0821, 0.0734, 0.0798, 0.0812, 0.0776, 0.0845, 0.0803, 0.0819, 0.0831, 0.0867],
        "lr_r2":        [0.872,  0.891,  0.878,  0.874,  0.883,  0.865,  0.877,  0.871,  0.868,  0.858],
        "rf_rmse":      [0.0712, 0.0631, 0.0689, 0.0701, 0.0667, 0.0731, 0.0694, 0.0709, 0.0718, 0.0751],
        "rf_r2":        [0.891,  0.908,  0.896,  0.893,  0.901,  0.884,  0.894,  0.889,  0.887,  0.878],
        "hyb_rmse_mean":[0.0098, 0.0062, 0.0089, 0.0095, 0.0079, 0.0103, 0.0092, 0.0097, 0.0101, 0.0156],
        "hyb_rmse_std": [0.0012, 0.0008, 0.0011, 0.0013, 0.0010, 0.0014, 0.0012, 0.0013, 0.0014, 0.0019],
        "hyb_r2_mean":  [0.953,  0.967,  0.957,  0.954,  0.961,  0.948,  0.955,  0.952,  0.950,  0.934],
        "hyb_peak_rmse":[0.0121, 0.0081, 0.0109, 0.0117, 0.0097, 0.0127, 0.0113, 0.0119, 0.0124, 0.0183],
        "dm_mean_p":    [0.032,  0.018,  0.027,  0.031,  0.024,  0.036,  0.029,  0.033,  0.034,  0.041],
        "dm_n_sig":     [8, 9, 8, 8, 9, 7, 8, 8, 8, 7],
    }
    return pd.DataFrame(data)
