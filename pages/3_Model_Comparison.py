"""
pages/3_Model_Comparison.py

Model Comparison page — displays RMSE and R² bar charts, a radar chart,
and a summary table comparing all 10 states from Multisite_Metrics.

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
"""

import streamlit as st
import pandas as pd

from utils.data_loader import select_best_state
from utils.chart_helpers import build_rmse_bar, build_r2_bar, build_radar

# ---------------------------------------------------------------------------
# Guard: ensure metrics_df is available in session state
# ---------------------------------------------------------------------------

if "metrics_df" not in st.session_state or st.session_state["metrics_df"] is None:
    st.error(
        "multisite_results.csv not found at expected path. "
        "Please ensure the file is loaded via the main app entry point."
    )
    st.stop()

metrics_df: pd.DataFrame = st.session_state["metrics_df"]

# ---------------------------------------------------------------------------
# Compute best-performing state (lowest Hybrid RMSE, alphabetical tie-break)
# ---------------------------------------------------------------------------

best_state: str = select_best_state(metrics_df)

# ---------------------------------------------------------------------------
# RMSE grouped bar chart (Req 4.2, 4.5, 4.6)
# ---------------------------------------------------------------------------

st.plotly_chart(build_rmse_bar(metrics_df, best_state), use_container_width=True)

# ---------------------------------------------------------------------------
# R² grouped bar chart (Req 4.3, 4.5, 4.6)
# ---------------------------------------------------------------------------

st.plotly_chart(build_r2_bar(metrics_df, best_state), use_container_width=True)

# ---------------------------------------------------------------------------
# Radar chart (Req 4.4)
# ---------------------------------------------------------------------------

st.plotly_chart(build_radar(metrics_df), use_container_width=True)

# ---------------------------------------------------------------------------
# Summary table sorted ascending by Hybrid RMSE (Req 4.7)
# ---------------------------------------------------------------------------

summary_df = (
    metrics_df
    .sort_values("hyb_rmse_mean", ascending=True)
    .rename(columns={
        "state": "State",
        "lr_rmse": "LR RMSE",
        "rf_rmse": "RF RMSE",
        "hyb_rmse_mean": "Hybrid RMSE",
        "lr_r2": "LR R²",
        "hyb_r2_mean": "Hybrid R²",
        "dm_mean_p": "DM Test p-value",
    })
    [["State", "LR RMSE", "RF RMSE", "Hybrid RMSE", "LR R²", "Hybrid R²", "DM Test p-value"]]
    .reset_index(drop=True)
)

# Format numeric columns to 6 decimal places for display
st.dataframe(
    summary_df.style.format({
        "LR RMSE": "{:.6f}",
        "RF RMSE": "{:.6f}",
        "Hybrid RMSE": "{:.6f}",
        "LR R²": "{:.6f}",
        "Hybrid R²": "{:.6f}",
        "DM Test p-value": "{:.6f}",
    }),
    use_container_width=True,
)
