"""
pages/5_Blockchain.py

Blockchain page — simulates storing predictions on-chain using mock
SHA-256 transactions. Displays a commit interface, transaction card,
and a block ledger table.

Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
"""

import streamlit as st
import pandas as pd

from utils.blockchain_helpers import make_transaction, init_ledger, append_transaction

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
# Contract description (Req 6.1, 6.7)
# ---------------------------------------------------------------------------

st.title("Blockchain — Prediction Storage")

st.markdown(
    """
The **PredictionStorage.sol** smart contract provides an immutable on-chain ledger for
recording energy generation forecasts. Each committed prediction is stored with its
state identifier, Hybrid RMSE accuracy metric, a SHA-256 transaction hash, and a UTC
timestamp — ensuring full auditability and tamper-proof provenance of model outputs.

*This is a simulated demo using deterministic mock data, not a live blockchain connection.*
"""
)

# ---------------------------------------------------------------------------
# Commit controls (Req 6.2)
# ---------------------------------------------------------------------------

states_in_metrics = metrics_df["state"].tolist()

col_select, col_commit = st.columns(2)

with col_select:
    selected_state = st.selectbox("Select State", states_in_metrics)

with col_commit:
    if selected_state:
        commit_clicked = st.button("Commit Prediction to Chain")
    else:
        st.button("Commit Prediction to Chain", disabled=True)
        st.info("Please select a state to commit.")
        commit_clicked = False

# ---------------------------------------------------------------------------
# On commit: generate transaction and append to ledger (Req 6.3, 6.5, 6.6)
# ---------------------------------------------------------------------------

if commit_clicked and selected_state:
    init_ledger(st.session_state)

    # Look up Hybrid RMSE for the selected state
    state_row = metrics_df[metrics_df["state"] == selected_state]
    hyb_rmse = state_row["hyb_rmse_mean"].iloc[0]

    tx = make_transaction(selected_state, hyb_rmse, st.session_state["block_counter"])
    append_transaction(st.session_state, tx)
    st.session_state["block_counter"] += 1

    # -------------------------------------------------------------------
    # Transaction card (Req 6.4)
    # -------------------------------------------------------------------
    with st.container():
        st.markdown(
            f"""
<div style="border: 1px solid #00D4FF; border-radius: 8px; padding: 16px; margin: 12px 0;">
    <h4 style="color: #00D4FF; margin-top: 0;">✅ Transaction Confirmed</h4>
    <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 4px 8px; color: #aaa;">Transaction Hash</td>
            <td style="padding: 4px 8px; font-family: monospace;">{tx["tx_hash"]}</td></tr>
        <tr><td style="padding: 4px 8px; color: #aaa;">Block Number</td>
            <td style="padding: 4px 8px;">{tx["block_number"]:,}</td></tr>
        <tr><td style="padding: 4px 8px; color: #aaa;">Timestamp</td>
            <td style="padding: 4px 8px;">{tx["timestamp"]}</td></tr>
        <tr><td style="padding: 4px 8px; color: #aaa;">State</td>
            <td style="padding: 4px 8px;">{tx["state"]}</td></tr>
        <tr><td style="padding: 4px 8px; color: #aaa;">RMSE Committed</td>
            <td style="padding: 4px 8px;">{tx["rmse"]:.6f}</td></tr>
        <tr><td style="padding: 4px 8px; color: #aaa;">Status</td>
            <td style="padding: 4px 8px;">{tx["status"]}</td></tr>
    </table>
</div>
""",
            unsafe_allow_html=True,
        )

# ---------------------------------------------------------------------------
# Block Ledger table (Req 6.5)
# ---------------------------------------------------------------------------

init_ledger(st.session_state)

if st.session_state["ledger"]:
    st.subheader("Block Ledger")
    st.dataframe(pd.DataFrame(st.session_state["ledger"]), use_container_width=True)
