"""
pages/4_Error_Analysis.py
--------------------------
Error Analysis page for the BiLSTM Demo Dashboard.

Displays residual correction charts, residual distribution histograms,
MAE metrics, and static figures for before/after comparison and ablation study.

Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
"""

import os

import numpy as np
import streamlit as st

from utils.chart_helpers import build_residual_chart, build_residual_histogram
from utils.data_loader import compute_mae_reduction
from utils.demo_data_generator import get_state, STATES

# ---------------------------------------------------------------------------
# Page title
# ---------------------------------------------------------------------------

st.title("Error Analysis")

# ---------------------------------------------------------------------------
# 1. State selector (default TN)
# ---------------------------------------------------------------------------

state = st.selectbox("Select State", STATES, index=0)

# ---------------------------------------------------------------------------
# 2. Fetch state data from synthetic cache
# ---------------------------------------------------------------------------

state_data = get_state(state, st.session_state["synth_cache"])

# ---------------------------------------------------------------------------
# 3. Static figures side by side with os.path.exists guards
# ---------------------------------------------------------------------------

col_left, col_right = st.columns(2)

with col_left:
    if os.path.exists("figures/before_after_comparison.png"):
        st.image(
            "figures/before_after_comparison.png",
            caption="Before/After Correction",
        )

with col_right:
    if os.path.exists("figures/error_distribution.png"):
        st.image(
            "figures/error_distribution.png",
            caption="Error Distribution",
        )

# ---------------------------------------------------------------------------
# 4. Residual correction chart (48 timesteps)
# ---------------------------------------------------------------------------

residual_fig = build_residual_chart(state_data, n_steps=48)
st.plotly_chart(residual_fig, use_container_width=True)

# ---------------------------------------------------------------------------
# 5. Residual histogram
# ---------------------------------------------------------------------------

lr_residuals = state_data["residual"]
hyb_residuals = state_data["remaining_error"]

hist_fig = build_residual_histogram(lr_residuals, hyb_residuals)
st.plotly_chart(hist_fig, use_container_width=True)

# ---------------------------------------------------------------------------
# 6. MAE metrics
# ---------------------------------------------------------------------------

mae_lr = np.mean(np.abs(lr_residuals))
mae_hyb = np.mean(np.abs(hyb_residuals))
mae_reduction = compute_mae_reduction(mae_lr, mae_hyb)

col1, col2, col3 = st.columns(3)

with col1:
    st.metric("Mean Absolute LR Residual", f"{mae_lr:.6f}")

with col2:
    st.metric("Mean Absolute Hybrid Residual", f"{mae_hyb:.6f}")

with col3:
    st.metric("MAE Reduction %", f"{mae_reduction:.2f}%")

# ---------------------------------------------------------------------------
# 7. Ablation figure
# ---------------------------------------------------------------------------

if os.path.exists("figures/ablation_comparison.png"):
    st.image("figures/ablation_comparison.png", caption="Ablation Study")
