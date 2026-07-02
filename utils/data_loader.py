"""
utils/data_loader.py

Loads and caches the pre-computed multisite metrics CSV used by the BiLSTM
Demo Dashboard.  All five pages share the single cached DataFrame returned by
load_metrics(); the @st.cache_data decorator ensures the file is read only
once per Streamlit session.
"""

from __future__ import annotations

import os

import pandas as pd
import streamlit as st

# Canonical column set expected in multisite_results.csv
EXPECTED_COLUMNS: list[str] = [
    "state",
    "n_test",
    "n_peak",
    "lr_rmse",
    "lr_r2",
    "rf_rmse",
    "rf_r2",
    "hyb_rmse_mean",
    "hyb_rmse_std",
    "hyb_r2_mean",
    "hyb_peak_rmse",
    "dm_mean_p",
    "dm_n_sig",
]


@st.cache_data
def load_metrics(path: str = "multisite_results.csv") -> pd.DataFrame:
    """Load multisite_results.csv and return it as a DataFrame.

    The file is read exactly once per Streamlit session thanks to
    ``@st.cache_data``.  Subsequent calls with the same *path* argument
    return the cached result instantly.

    Parameters
    ----------
    path:
        Relative or absolute path to ``multisite_results.csv``.
        Defaults to ``"multisite_results.csv"`` (project root when the app
        is launched with ``streamlit run app.py``).

    Returns
    -------
    pd.DataFrame
        DataFrame with columns:
        ``state, n_test, n_peak, lr_rmse, lr_r2, rf_rmse, rf_r2,
        hyb_rmse_mean, hyb_rmse_std, hyb_r2_mean, hyb_peak_rmse,
        dm_mean_p, dm_n_sig``.

    Raises
    ------
    FileNotFoundError
        If *path* does not point to an existing file.  The error message
        follows the exact format required by Requirement 1.5:
        ``"multisite_results.csv not found at expected path: {abs_path}"``
    """
    abs_path: str = os.path.abspath(path)

    if not os.path.isfile(abs_path):
        raise FileNotFoundError(
            f"multisite_results.csv not found at expected path: {abs_path}"
        )

    df: pd.DataFrame = pd.read_csv(abs_path)
    return df


# ---------------------------------------------------------------------------
# Metric-aggregation helpers  (Tasks 8.1 – 8.4)
# ---------------------------------------------------------------------------


def compute_metric_cards(
    metrics_df: pd.DataFrame,
) -> tuple[float, float, int]:
    """Return summary KPI values for the Home page metric cards.

    Parameters
    ----------
    metrics_df:
        DataFrame containing at least the columns ``hyb_rmse_mean`` and
        ``hyb_r2_mean``.

    Returns
    -------
    tuple[float, float, int]
        ``(best_rmse, best_r2, n_states)`` where

        * ``best_rmse``  – minimum value of ``hyb_rmse_mean`` across all rows
        * ``best_r2``    – maximum value of ``hyb_r2_mean`` across all rows
        * ``n_states``   – total number of rows in *metrics_df*

    Requirements: 2.3
    """
    best_rmse: float = metrics_df["hyb_rmse_mean"].min()
    best_r2: float = metrics_df["hyb_r2_mean"].max()
    n_states: int = len(metrics_df)
    return best_rmse, best_r2, n_states


def compute_rmse_improvement(lr_rmse: float, hyb_rmse: float) -> float:
    """Compute the percentage RMSE improvement of the hybrid model over LR.

    Parameters
    ----------
    lr_rmse:
        Root-mean-square error of the Linear Regression baseline.
    hyb_rmse:
        Root-mean-square error of the Hybrid BiLSTM model.

    Returns
    -------
    float
        ``((lr_rmse - hyb_rmse) / lr_rmse) * 100``  — no rounding applied.

    Raises
    ------
    ZeroDivisionError
        If ``lr_rmse == 0``.

    Requirements: 3.7
    """
    if lr_rmse == 0:
        raise ZeroDivisionError("lr_rmse must not be zero")
    return ((lr_rmse - hyb_rmse) / lr_rmse) * 100


def compute_mae_reduction(mae_lr: float, mae_hyb: float) -> float:
    """Compute the percentage MAE reduction of the hybrid model over LR.

    Parameters
    ----------
    mae_lr:
        Mean absolute error of the Linear Regression baseline.
    mae_hyb:
        Mean absolute error of the Hybrid BiLSTM model.

    Returns
    -------
    float
        ``round(((mae_lr - mae_hyb) / mae_lr) * 100, 2)``

    Raises
    ------
    ZeroDivisionError
        If ``mae_lr == 0``.

    Requirements: 5.4
    """
    if mae_lr == 0:
        raise ZeroDivisionError("mae_lr must not be zero")
    return round(((mae_lr - mae_hyb) / mae_lr) * 100, 2)


def select_best_state(metrics_df: pd.DataFrame) -> str:
    """Return the state abbreviation with the lowest ``hyb_rmse_mean``.

    Ties are broken alphabetically by state name (ascending), so the
    lexicographically first state is returned when two or more states share
    the minimum RMSE.

    Parameters
    ----------
    metrics_df:
        DataFrame containing at least the columns ``state`` and
        ``hyb_rmse_mean``.

    Returns
    -------
    str
        State abbreviation (e.g. ``"TN"``) of the best-performing state.

    Requirements: 4.6
    """
    return (
        metrics_df
        .sort_values(["hyb_rmse_mean", "state"])
        .iloc[0]["state"]
    )
