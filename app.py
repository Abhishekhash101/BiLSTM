"""
app.py — Streamlit entry point for the BiLSTM Demo Dashboard.

Launches the five-page dashboard with:
  streamlit run app.py

This file MUST be the first module executed by Streamlit.  It:
1. Sets page configuration (title, icon, layout).
2. Injects global dark-theme CSS.
3. Loads multisite_results.csv into session state.
4. Generates synthetic prediction data into session state.
5. Renders a minimal welcome message directing users to the sidebar.

Requirements: 1.1, 1.2, 1.4, 1.5
"""

import streamlit as st

from utils.data_loader import load_metrics
from utils.demo_data_generator import generate_all

# ---------------------------------------------------------------------------
# 1. Page configuration — MUST be the first Streamlit command
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="BiLSTM Energy Forecasting Dashboard",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------------------------------------------------------------------
# 2. Global dark-theme CSS injection
# ---------------------------------------------------------------------------
st.markdown(
    """
    <style>
        .stApp {
            background-color: #0E1117;
            color: #FAFAFA;
        }
    </style>
    """,
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# 3. Load metrics CSV — halt on missing file
# ---------------------------------------------------------------------------
try:
    metrics_df = load_metrics()
except FileNotFoundError as exc:
    st.error(str(exc))
    st.stop()

st.session_state["metrics_df"] = metrics_df

# ---------------------------------------------------------------------------
# 4. Generate synthetic predictions and cache in session state
# ---------------------------------------------------------------------------
if "synth_cache" not in st.session_state:
    st.session_state["synth_cache"] = generate_all(metrics_df)

# ---------------------------------------------------------------------------
# 5. Welcome / landing content
# ---------------------------------------------------------------------------
st.title("⚡ BiLSTM Energy Forecasting Dashboard")
st.markdown(
    """
    Welcome to the **BiLSTM Hybrid Energy Forecasting** demo dashboard.

    Use the **sidebar** to navigate between pages:
    - **Home** — Project overview, pipeline diagram, and key metrics
    - **Live Prediction** — Interactive animated forecast chart
    - **Model Comparison** — Multi-state RMSE and R² visualizations
    - **Error Analysis** — Residual correction deep-dive
    - **Blockchain** — Simulated on-chain prediction storage
    """
)
