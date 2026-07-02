"""
pages/2_Live_Prediction.py
---------------------------
Interactive forecast chart with animated reveal for the selected state.

The user selects a state and hour range, clicks "Predict Energy", and watches
three series (Actual, LR Prediction, Hybrid Prediction) animate onto the chart
from left to right over ~3 seconds.  After the animation completes, the RMSE
improvement metric is displayed.

Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
"""

import time

import numpy as np
import plotly.graph_objects as go
import streamlit as st

from utils.chart_helpers import (
    COLOR_ACTUAL,
    COLOR_HYBRID,
    COLOR_LR,
    apply_dark_layout,
)
from utils.data_loader import compute_rmse_improvement
from utils.demo_data_generator import STATES, get_state

# ---------------------------------------------------------------------------
# Page title
# ---------------------------------------------------------------------------
st.title("Live Prediction")

# ---------------------------------------------------------------------------
# Controls row — two columns: State selector and Hour slider
# ---------------------------------------------------------------------------
col_state, col_hours = st.columns(2)

with col_state:
    state = st.selectbox("Select State", STATES)

with col_hours:
    hours = st.slider("Hour Range", 1, 168, 48, step=1)

# ---------------------------------------------------------------------------
# Run button
# ---------------------------------------------------------------------------
run_clicked = st.button("Predict Energy")

# ---------------------------------------------------------------------------
# Animation and metric display
# ---------------------------------------------------------------------------
if run_clicked:
    # Retrieve synthetic predictions — guard against failure (Req 3.4)
    try:
        state_data = get_state(state, st.session_state["synth_cache"], hours)
    except Exception as e:
        st.error(f"Failed to generate predictions: {e}")
        st.stop()

    actual = state_data["actual"]
    lr_pred = state_data["lr_pred"]
    hyb_pred = state_data["hyb_pred"]

    # Build an empty three-trace figure for the animated reveal
    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=[],
        y=[],
        mode="lines",
        name="Actual",
        line=dict(color=COLOR_ACTUAL),
    ))

    fig.add_trace(go.Scatter(
        x=[],
        y=[],
        mode="lines",
        name="LR Prediction",
        line=dict(color=COLOR_LR),
    ))

    fig.add_trace(go.Scatter(
        x=[],
        y=[],
        mode="lines",
        name="Hybrid Prediction",
        line=dict(color=COLOR_HYBRID),
    ))

    apply_dark_layout(fig, "Live Prediction — Animated Reveal", "Hour", "Capacity Factor")

    # Create a placeholder so we re-write a single chart widget each frame
    placeholder = st.empty()

    # Animated reveal loop — total time ≈ 3 seconds (Req 3.6)
    t = np.arange(hours)
    for i in range(1, hours + 1):
        fig.data[0].x = t[:i]
        fig.data[0].y = actual[:i]
        fig.data[1].x = t[:i]
        fig.data[1].y = lr_pred[:i]
        fig.data[2].x = t[:i]
        fig.data[2].y = hyb_pred[:i]

        placeholder.plotly_chart(fig, use_container_width=True)
        time.sleep(3.0 / hours)

    # -------------------------------------------------------------------
    # RMSE improvement metric (Req 3.7, 3.8)
    # -------------------------------------------------------------------
    metrics_df = st.session_state.get("metrics_df")
    if metrics_df is not None:
        state_row = metrics_df[metrics_df["state"] == state]
        if not state_row.empty:
            lr_rmse = float(state_row["lr_rmse"].iloc[0])
            hyb_rmse = float(state_row["hyb_rmse_mean"].iloc[0])
            improvement = compute_rmse_improvement(lr_rmse, hyb_rmse)
            st.metric(
                label="RMSE Improvement (Hybrid over LR)",
                value=f"{improvement:.2f}%",
            )
        else:
            st.warning("Metrics not available")
    else:
        st.warning("Metrics not available")
