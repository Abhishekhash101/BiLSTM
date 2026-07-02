"""
Checkpoint 9: Verify all pure-function helpers and PBT suite.
Runs without Streamlit by patching st.cache_data before import.
"""

import sys
import os
import types
import warnings
import traceback

# ── Project root on path ─────────────────────────────────────────────────────
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

# ── Stub out streamlit so data_loader.py can be imported standalone ───────────
st_stub = types.ModuleType("streamlit")
st_stub.cache_data = lambda f=None, **kw: (f if f else lambda g: g)
sys.modules.setdefault("streamlit", st_stub)

import numpy as np
import pandas as pd
import plotly.graph_objects as go

# ── Lazy import helpers ───────────────────────────────────────────────────────
from utils.data_loader import (
    compute_metric_cards,
    compute_rmse_improvement,
    compute_mae_reduction,
    select_best_state,
)
from utils.demo_data_generator import generate_all, get_state, fallback_metrics, STATES
from utils.chart_helpers import (
    build_rmse_bar,
    build_r2_bar,
    build_radar,
    build_line_chart,
    build_residual_chart,
    build_residual_histogram,
)
from utils.blockchain_helpers import make_transaction, init_ledger, append_transaction

PASS = "PASS"
FAIL = "FAIL"
results = []

def check(name, fn):
    try:
        fn()
        results.append((PASS, name))
    except Exception as exc:
        results.append((FAIL, name, traceback.format_exc()))

# ─────────────────────────────────────────────────────────────────────────────
# Fixture: minimal 10-row DataFrame
# ─────────────────────────────────────────────────────────────────────────────
METRIC_DF = pd.DataFrame({
    "state":        STATES,
    "lr_rmse":      [0.082, 0.073, 0.080, 0.081, 0.078, 0.085, 0.080, 0.082, 0.083, 0.087],
    "lr_r2":        [0.872, 0.891, 0.878, 0.874, 0.883, 0.865, 0.877, 0.871, 0.868, 0.858],
    "rf_rmse":      [0.071, 0.063, 0.069, 0.070, 0.067, 0.073, 0.069, 0.071, 0.072, 0.075],
    "rf_r2":        [0.891, 0.908, 0.896, 0.893, 0.901, 0.884, 0.894, 0.889, 0.887, 0.878],
    "hyb_rmse_mean":[0.0098,0.0062,0.0089,0.0095,0.0079,0.0103,0.0092,0.0097,0.0101,0.0156],
    "hyb_r2_mean":  [0.953, 0.967, 0.957, 0.954, 0.961, 0.948, 0.955, 0.952, 0.950, 0.934],
})

# ═════════════════════════════════════════════════════════════════════════════
# SECTION 1 — utils/data_loader.py
# ═════════════════════════════════════════════════════════════════════════════

def _test_compute_metric_cards_values():
    best_rmse, best_r2, n = compute_metric_cards(METRIC_DF)
    assert best_rmse == METRIC_DF["hyb_rmse_mean"].min(), \
        f"best_rmse mismatch: {best_rmse}"
    assert best_r2 == METRIC_DF["hyb_r2_mean"].max(), \
        f"best_r2 mismatch: {best_r2}"
    assert n == len(METRIC_DF), f"n_states mismatch: {n}"

check("data_loader: compute_metric_cards returns (min_hyb_rmse, max_hyb_r2, len(df))",
      _test_compute_metric_cards_values)


def _test_compute_rmse_improvement_formula():
    lr, hyb = 0.082, 0.0098
    expected = ((lr - hyb) / lr) * 100
    actual = compute_rmse_improvement(lr, hyb)
    assert abs(actual - expected) < 1e-12, f"formula error: {actual} != {expected}"

check("data_loader: compute_rmse_improvement formula ((lr-hyb)/lr)*100",
      _test_compute_rmse_improvement_formula)


def _test_compute_rmse_improvement_zero_division():
    try:
        compute_rmse_improvement(0.0, 0.005)
        raise AssertionError("Expected ZeroDivisionError was NOT raised")
    except ZeroDivisionError:
        pass  # expected

check("data_loader: compute_rmse_improvement raises ZeroDivisionError for lr_rmse=0",
      _test_compute_rmse_improvement_zero_division)


def _test_compute_rmse_improvement_no_rounding():
    # result must carry more than 2 decimal places of precision
    lr, hyb = 0.1, 0.033333
    result = compute_rmse_improvement(lr, hyb)
    assert isinstance(result, float), "should return float"
    # round() would collapse precision; direct formula keeps it
    assert result == ((lr - hyb) / lr) * 100

check("data_loader: compute_rmse_improvement — no rounding applied",
      _test_compute_rmse_improvement_no_rounding)


def _test_compute_mae_reduction_formula():
    lr, hyb = 0.05, 0.02
    expected = round(((lr - hyb) / lr) * 100, 2)
    actual = compute_mae_reduction(lr, hyb)
    assert actual == expected, f"{actual} != {expected}"

check("data_loader: compute_mae_reduction formula round(((lr-hyb)/lr)*100, 2)",
      _test_compute_mae_reduction_formula)


def _test_compute_mae_reduction_zero_division():
    try:
        compute_mae_reduction(0.0, 0.01)
        raise AssertionError("Expected ZeroDivisionError was NOT raised")
    except ZeroDivisionError:
        pass

check("data_loader: compute_mae_reduction raises ZeroDivisionError for mae_lr=0",
      _test_compute_mae_reduction_zero_division)


def _test_select_best_state_basic():
    result = select_best_state(METRIC_DF)
    # GJ has min hyb_rmse_mean = 0.0062
    assert result == "GJ", f"Expected GJ, got {result}"

check("data_loader: select_best_state returns state with min hyb_rmse_mean",
      _test_select_best_state_basic)


def _test_select_best_state_tie_alpha():
    tie_df = pd.DataFrame({
        "state": ["ZZ", "AA", "MM"],
        "hyb_rmse_mean": [0.01, 0.01, 0.02],
    })
    result = select_best_state(tie_df)
    assert result == "AA", f"Tie-break should return alphabetically first; got {result}"

check("data_loader: select_best_state tie-breaking — returns alphabetically first",
      _test_select_best_state_tie_alpha)

# ═════════════════════════════════════════════════════════════════════════════
# SECTION 2 — utils/demo_data_generator.py
# ═════════════════════════════════════════════════════════════════════════════

SYNTH = generate_all(METRIC_DF)

def _test_generate_all_keys():
    assert set(SYNTH.keys()) == set(STATES), \
        f"Missing states: {set(STATES) - set(SYNTH.keys())}"

check("demo_data_generator: generate_all returns 10-state dict", _test_generate_all_keys)


def _test_generate_all_array_shapes():
    expected_keys = {"actual", "lr_pred", "hyb_pred", "residual", "correction", "remaining_error"}
    for state, data in SYNTH.items():
        assert set(data.keys()) == expected_keys, f"{state}: wrong keys {data.keys()}"
        for k, arr in data.items():
            assert arr.shape == (168,), f"{state}/{k}: shape {arr.shape} != (168,)"

check("demo_data_generator: generate_all — each state has 6 arrays of shape (168,)",
      _test_generate_all_array_shapes)


def _test_generate_all_value_range():
    for state in STATES:
        for k in ("actual", "lr_pred", "hyb_pred"):
            arr = SYNTH[state][k]
            assert np.all(arr >= 0.0) and np.all(arr <= 1.0), \
                f"{state}/{k} has values outside [0,1]: min={arr.min()}, max={arr.max()}"

check("demo_data_generator: generate_all — actual/lr_pred/hyb_pred in [0,1]",
      _test_generate_all_value_range)


def _test_generate_all_determinism():
    synth2 = generate_all(METRIC_DF)
    for state in STATES:
        for k in ("actual", "lr_pred", "hyb_pred", "residual", "correction", "remaining_error"):
            assert np.array_equal(SYNTH[state][k], synth2[state][k]), \
                f"Non-deterministic: {state}/{k} differs between calls"

check("demo_data_generator: generate_all — deterministic (two calls produce identical arrays)",
      _test_generate_all_determinism)


def _test_get_state_slicing():
    for h in (1, 24, 48, 100, 168):
        d = get_state("TN", SYNTH, hours=h)
        for k in ("actual", "lr_pred", "hyb_pred"):
            assert len(d[k]) == h, f"get_state(hours={h}): {k} has len {len(d[k])}"

check("demo_data_generator: get_state slices arrays to :hours", _test_get_state_slicing)


def _test_get_state_keyerror():
    try:
        get_state("XX", SYNTH)
        raise AssertionError("Expected KeyError was NOT raised")
    except KeyError:
        pass

check("demo_data_generator: get_state raises KeyError for unknown state",
      _test_get_state_keyerror)


def _test_fallback_metrics_shape():
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        fb = fallback_metrics()
        assert len(w) == 1 and issubclass(w[0].category, RuntimeWarning), \
            f"Expected one RuntimeWarning, got: {[x.category for x in w]}"
    assert isinstance(fb, pd.DataFrame), "fallback_metrics() should return DataFrame"
    assert len(fb) == 10, f"Expected 10 rows, got {len(fb)}"

check("demo_data_generator: fallback_metrics — 10-row DataFrame + RuntimeWarning",
      _test_fallback_metrics_shape)

# ═════════════════════════════════════════════════════════════════════════════
# SECTION 3 — utils/chart_helpers.py
# ═════════════════════════════════════════════════════════════════════════════

STATE_DATA = get_state("TN", SYNTH, hours=168)
T = np.arange(168)

def _test_build_rmse_bar_type_and_traces():
    fig = build_rmse_bar(METRIC_DF, "GJ")
    assert isinstance(fig, go.Figure), "build_rmse_bar must return go.Figure"
    bar_traces = [t for t in fig.data if isinstance(t, go.Bar)]
    assert len(bar_traces) == 3, f"Expected 3 Bar traces, got {len(bar_traces)}"
    for tr in bar_traces:
        assert tr.hovertemplate == "%{y:.6f}", \
            f"hovertemplate wrong: {tr.hovertemplate!r}"
    for tr in bar_traces:
        assert len(tr.x) == 10, f"Expected 10 x points, got {len(tr.x)}"

check("chart_helpers: build_rmse_bar — go.Figure, 3 Bar traces, hovertemplate %{y:.6f}",
      _test_build_rmse_bar_type_and_traces)


def _test_build_r2_bar_type_and_traces():
    fig = build_r2_bar(METRIC_DF, "GJ")
    assert isinstance(fig, go.Figure)
    bar_traces = [t for t in fig.data if isinstance(t, go.Bar)]
    assert len(bar_traces) == 2, f"Expected 2 Bar traces, got {len(bar_traces)}"
    for tr in bar_traces:
        assert tr.hovertemplate == "%{y:.6f}", \
            f"hovertemplate wrong: {tr.hovertemplate!r}"

check("chart_helpers: build_r2_bar — go.Figure, 2 Bar traces, hovertemplate %{y:.6f}",
      _test_build_r2_bar_type_and_traces)


def _test_build_radar_type_and_traces():
    fig = build_radar(METRIC_DF)
    assert isinstance(fig, go.Figure)
    polar_traces = [t for t in fig.data if isinstance(t, go.Scatterpolar)]
    assert len(polar_traces) == 2, f"Expected 2 Scatterpolar traces, got {len(polar_traces)}"

check("chart_helpers: build_radar — go.Figure with 2 Scatterpolar traces",
      _test_build_radar_type_and_traces)


def _test_build_line_chart_type_and_traces():
    fig = build_line_chart(T, STATE_DATA["actual"], STATE_DATA["lr_pred"],
                           STATE_DATA["hyb_pred"], "Test Chart")
    assert isinstance(fig, go.Figure)
    scatter = [t for t in fig.data if isinstance(t, go.Scatter)]
    assert len(scatter) == 3, f"Expected 3 Scatter traces, got {len(scatter)}"

check("chart_helpers: build_line_chart — go.Figure with 3 Scatter traces",
      _test_build_line_chart_type_and_traces)


def _test_build_residual_chart_type_and_traces():
    fig = build_residual_chart(STATE_DATA, n_steps=48)
    assert isinstance(fig, go.Figure)
    scatter = [t for t in fig.data if isinstance(t, go.Scatter)]
    assert len(scatter) == 3, f"Expected 3 Scatter traces, got {len(scatter)}"
    for tr in scatter:
        assert len(tr.x) == 48, f"Expected 48 x-values, got {len(tr.x)}"

check("chart_helpers: build_residual_chart — 3 Scatter traces, each 48 x-values",
      _test_build_residual_chart_type_and_traces)


def _test_build_residual_histogram_type_and_traces():
    lr_res = STATE_DATA["residual"]
    hyb_res = STATE_DATA["remaining_error"]
    fig = build_residual_histogram(lr_res, hyb_res)
    assert isinstance(fig, go.Figure)
    hist_traces = [t for t in fig.data if isinstance(t, go.Histogram)]
    assert len(hist_traces) == 2, f"Expected 2 Histogram traces, got {len(hist_traces)}"
    # Both traces must share same xbins.size
    b0 = hist_traces[0].xbins.size
    b1 = hist_traces[1].xbins.size
    assert b0 == b1, f"xbins.size mismatch: {b0} vs {b1}"

check("chart_helpers: build_residual_histogram — 2 Histogram traces, shared xbins.size",
      _test_build_residual_histogram_type_and_traces)


def _test_build_radar_radial_range():
    fig = build_radar(METRIC_DF)
    r_range = fig.layout.polar.radialaxis.range
    assert list(r_range) == [0, 1], f"radialaxis range should be [0,1], got {r_range}"

check("chart_helpers: build_radar — radialaxis range is [0, 1]",
      _test_build_radar_radial_range)

# ═════════════════════════════════════════════════════════════════════════════
# SECTION 4 — utils/blockchain_helpers.py
# ═════════════════════════════════════════════════════════════════════════════

def _test_make_transaction_tx_hash_66_chars():
    tx = make_transaction("TN", 0.0098, 18_500_000)
    assert len(tx["tx_hash"]) == 66, \
        f"tx_hash length should be 66, got {len(tx['tx_hash'])}"
    assert tx["tx_hash"].startswith("0x"), \
        f"tx_hash should start with '0x', got {tx['tx_hash'][:4]!r}"
    hex_part = tx["tx_hash"][2:]
    assert len(hex_part) == 64, f"hex part should be 64 chars, got {len(hex_part)}"
    assert all(c in "0123456789abcdef" for c in hex_part), \
        "hex part contains non-lowercase-hex characters"

check("blockchain_helpers: make_transaction — tx_hash is 66 chars, 0x prefix, 64 lowercase hex",
      _test_make_transaction_tx_hash_66_chars)


def _test_make_transaction_fields():
    tx = make_transaction("GJ", 0.0062, 18_500_005)
    assert tx["state"] == "GJ"
    assert tx["rmse"] == 0.0062
    assert tx["block_number"] == 18_500_005
    assert tx["status"] == "Confirmed ✓"
    assert "timestamp" in tx
    assert "tx_hash" in tx

check("blockchain_helpers: make_transaction — all 6 fields present and correct",
      _test_make_transaction_fields)


def _test_init_ledger_idempotent():
    session = {}
    init_ledger(session)
    assert session["ledger"] == []
    assert session["block_counter"] == 18_500_000
    # Second call must not reset existing values
    session["ledger"].append({"dummy": True})
    session["block_counter"] = 18_500_001
    init_ledger(session)
    assert len(session["ledger"]) == 1, "init_ledger must not overwrite existing ledger"
    assert session["block_counter"] == 18_500_001, \
        "init_ledger must not overwrite existing block_counter"

check("blockchain_helpers: init_ledger — idempotent setdefault behaviour",
      _test_init_ledger_idempotent)


def _test_append_transaction_prepend_and_cap():
    session = {"ledger": []}
    # Add 12 transactions — ledger must cap at 10, newest first
    txs = []
    for i in range(12):
        tx = {"idx": i}
        txs.append(tx)
        append_transaction(session, tx)

    assert len(session["ledger"]) == 10, \
        f"Ledger should be capped at 10, got {len(session['ledger'])}"
    # ledger[0] must be the most recently appended transaction
    assert session["ledger"][0]["idx"] == 11, \
        f"ledger[0] should be last-appended (idx=11), got {session['ledger'][0]}"
    # Oldest two (idx 0,1) must have been evicted
    indices = [t["idx"] for t in session["ledger"]]
    assert 0 not in indices and 1 not in indices, \
        f"Oldest entries should be evicted, indices present: {indices}"

check("blockchain_helpers: append_transaction — prepend + cap at 10",
      _test_append_transaction_prepend_and_cap)


# ═════════════════════════════════════════════════════════════════════════════
# SECTION 5 — MSE improvement guarantee (cross-module)
# ═════════════════════════════════════════════════════════════════════════════

def _test_mse_improvement_guarantee():
    from sklearn.metrics import mean_squared_error
    for state in STATES:
        d = SYNTH[state]
        mse_lr = mean_squared_error(d["actual"], d["lr_pred"])
        mse_hyb = mean_squared_error(d["actual"], d["hyb_pred"])
        assert mse_hyb <= 0.9 * mse_lr, \
            f"{state}: hybrid MSE {mse_hyb:.6f} not ≤ 0.9 × LR MSE {mse_lr:.6f}"

check("demo_data_generator: MSE(hyb_pred, actual) ≤ 0.9 × MSE(lr_pred, actual) for all states",
      _test_mse_improvement_guarantee)

# ═════════════════════════════════════════════════════════════════════════════
# PRINT RESULTS
# ═════════════════════════════════════════════════════════════════════════════

print()
print("=" * 80)
print("CHECKPOINT 9 — Pure-Function Helper Verification Results")
print("=" * 80)

passed = [r for r in results if r[0] == PASS]
failed = [r for r in results if r[0] == FAIL]

for r in results:
    status, name = r[0], r[1]
    symbol = "✓" if status == PASS else "✗"
    print(f"  [{symbol}] {status:4s}  {name}")
    if status == FAIL:
        print()
        for line in r[2].splitlines():
            print(f"           {line}")
        print()

print()
print(f"  Total: {len(results)}  |  PASS: {len(passed)}  |  FAIL: {len(failed)}")
print("=" * 80)

if failed:
    sys.exit(1)
