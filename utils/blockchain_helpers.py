"""
utils/blockchain_helpers.py
Mock blockchain transaction logic using SHA-256 hashing.
No Web3 library required — pure Python hashlib + datetime.
"""

import hashlib
from datetime import datetime, timezone


def make_transaction(state: str, hyb_rmse: float, block_number: int) -> dict:
    """
    Create a mock blockchain transaction dict for a committed prediction.

    Parameters
    ----------
    state : str
        State abbreviation (e.g. "TN", "GJ").
    hyb_rmse : float
        Hybrid model RMSE value for the state.
    block_number : int
        Block number for this transaction (e.g. 18_500_000 + n).

    Returns
    -------
    dict with keys:
        tx_hash      – "0x" + SHA-256 hex digest (66 chars total)
        block_number – the block_number parameter passed in
        timestamp    – UTC ISO 8601 string, e.g. "2024-06-15T10:23:01Z"
        state        – the state parameter passed in
        rmse         – the hyb_rmse parameter passed in
        status       – "Confirmed ✓"
    """
    utc_iso: str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    tx_hash: str = (
        "0x"
        + hashlib.sha256(f"{state}:{utc_iso}".encode("utf-8")).hexdigest()
    )

    return {
        "tx_hash": tx_hash,
        "block_number": block_number,
        "timestamp": utc_iso,
        "state": state,
        "rmse": hyb_rmse,
        "status": "Confirmed ✓",
    }


def init_ledger(session_state) -> None:
    """
    Idempotently initialise ledger and block_counter in session_state.

    Uses .setdefault so that existing values are never overwritten —
    calling this multiple times has the same effect as calling it once.

    Parameters
    ----------
    session_state : dict-like (e.g. st.session_state)
        Streamlit session state or any MutableMapping.
    """
    session_state.setdefault("ledger", [])
    session_state.setdefault("block_counter", 18_500_000)


def append_transaction(session_state, tx: dict) -> None:
    """
    Prepend a transaction to the ledger so the newest entry is first,
    then trim the ledger to a maximum of 10 entries.

    Parameters
    ----------
    session_state : dict-like (e.g. st.session_state)
        Must already contain a "ledger" key (call init_ledger first).
    tx : dict
        Transaction dict (as returned by make_transaction).
    """
    session_state["ledger"].insert(0, tx)
    session_state["ledger"] = session_state["ledger"][:10]
