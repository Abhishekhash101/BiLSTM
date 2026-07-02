"""
pages/1_Home.py
---------------
Home page for the BiLSTM Hybrid Energy Forecasting Dashboard.

Displays:
1. Project title and summary paragraph
2. Three metric cards (Best RMSE, Best R², States Covered)
3. Pipeline diagram (5-node Plotly scatter with edge traces)
4. Interactive Prediction vs Actual chart (Plotly line chart from synth_cache)

Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
"""

import numpy as np
import plotly.graph_objects as go
import streamlit as st

from utils.chart_helpers import build_line_chart
from utils.data_loader import compute_metric_cards
from utils.demo_data_generator import STATES

# ---------------------------------------------------------------------------
# 1. Title and summary
# ---------------------------------------------------------------------------

st.title("BiLSTM Hybrid Energy Forecasting")

st.markdown(
    """
    This dashboard demonstrates a **Hybrid Error-Correction Model** that combines
    Linear Regression with a Bidirectional LSTM (BiLSTM) to forecast renewable energy
    generation across 10 Indian states. The BiLSTM learns residual errors from the
    baseline Linear Regression predictions and applies corrections, yielding
    significantly lower RMSE. All results shown here are derived from pre-computed
    metrics and deterministic synthetic data — no live model inference is required.
    """
)

# ---------------------------------------------------------------------------
# 2. Metric cards
# ---------------------------------------------------------------------------

metrics_df = st.session_state["metrics_df"]
best_rmse, best_r2, n_states = compute_metric_cards(metrics_df)

col1, col2, col3 = st.columns(3)
col1.metric(label="Best Hybrid RMSE | Multisite_Metrics", value=f"{best_rmse:.6f}")
col2.metric(label="Best Hybrid R² | Multisite_Metrics", value=f"{best_r2:.4f}")
col3.metric(label="States Covered | Multisite_Metrics", value=str(n_states))

# ---------------------------------------------------------------------------
# 3. Pipeline diagram
# ---------------------------------------------------------------------------

st.subheader("Model Pipeline")

# Node definitions
node_labels = [
    "Data Ingestion",
    "Feature Engineering",
    "Target Construction",
    "Baseline Modeling",
    "Hybrid BiLSTM",
]

node_tooltips = [
    "Load hourly capacity factor CSVs and aggregate by state",
    "Compute P_gen, P_load, SoC, and cyclical time encodings",
    "Build log-transformed ratio target y = log1p(P_gen/peak_load)",
    "Train Linear Regression and Random Forest on lookback windows",
    "Predict residuals with BiLSTM; add correction to LR forecast",
]

node_x = [0, 1, 2, 3, 4]
node_y = [0, 0, 0, 0, 0]

# Build pipeline figure
fig = go.Figure()

# Edge traces (lines connecting consecutive nodes)
fig.add_trace(
    go.Scatter(
        x=node_x,
        y=node_y,
        mode="lines",
        line=dict(color="#555555", width=2),
        hoverinfo="skip",
        showlegend=False,
    )
)

# Node trace
fig.add_trace(
    go.Scatter(
        x=node_x,
        y=node_y,
        mode="markers+text",
        marker=dict(size=30, color="#00D4FF", symbol="circle"),
        text=node_labels,
        textposition="top center",
        textfont=dict(size=12, color="white"),
        hovertext=node_tooltips,
        hoverinfo="text",
        showlegend=False,
    )
)

fig.update_layout(
    template="plotly_dark",
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
    yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
    height=200,
    margin=dict(l=40, r=40, t=20, b=60),
)

st.plotly_chart(fig, use_container_width=True)

# ---------------------------------------------------------------------------
# 4. Interactive Prediction vs Actual chart
# ---------------------------------------------------------------------------

synth_cache = st.session_state.get("synth_cache")
if synth_cache is not None:
    state_data = synth_cache["TN"]
    t = np.arange(len(state_data["actual"]))
    fig_pred = build_line_chart(t, state_data["actual"], state_data["lr_pred"], state_data["hyb_pred"], "Prediction vs Actual — TN")
    st.plotly_chart(fig_pred, use_container_width=True)
else:
    st.warning("Synthetic data unavailable — chart cannot be rendered.")
