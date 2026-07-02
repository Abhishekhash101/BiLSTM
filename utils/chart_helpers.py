"""
utils/chart_helpers.py
Shared Plotly figure builders used across all dashboard pages to enforce
consistent dark-theme styling.
"""

import numpy as np
import pandas as pd
import plotly.graph_objects as go

# ---------------------------------------------------------------------------
# Module-level colour constants
# ---------------------------------------------------------------------------
CHART_THEME = "plotly_dark"
COLOR_ACTUAL = "#00D4FF"     # cyan  — actual/measured series
COLOR_LR = "#FF6B6B"         # coral-red — Linear Regression prediction
COLOR_HYBRID = "#51CF66"     # green — Hybrid BiLSTM prediction
COLOR_HIGHLIGHT = "#FFD43B"  # amber — best-performing state highlight
COLOR_GRID = "#2C2C3E"       # dark grid lines


# ---------------------------------------------------------------------------
# Layout helper
# ---------------------------------------------------------------------------

def apply_dark_layout(
    fig: go.Figure,
    title: str,
    xaxis_title: str,
    yaxis_title: str,
) -> go.Figure:
    """Apply shared dark-theme layout settings to any Plotly figure.

    Args:
        fig:         A ``go.Figure`` to update in-place.
        title:       Chart title text.
        xaxis_title: X-axis label.
        yaxis_title: Y-axis label.

    Returns:
        The same ``go.Figure`` with the dark layout applied (allows chaining).
    """
    fig.update_layout(
        template=CHART_THEME,
        title=title,
        xaxis_title=xaxis_title,
        yaxis_title=yaxis_title,
        xaxis=dict(gridcolor=COLOR_GRID),
        yaxis=dict(gridcolor=COLOR_GRID),
    )
    return fig


def build_rmse_bar(metrics_df: pd.DataFrame, best_state: str) -> go.Figure:
    """Grouped bar chart with three traces: LR RMSE, RF RMSE, Hybrid RMSE per state.

    The ``best_state`` bars are highlighted in amber (``COLOR_HIGHLIGHT``); all
    other bars use the trace's default colour.  Every bar trace uses
    ``hovertemplate="%{y:.6f}"`` for six-decimal-place hover tooltips.

    Args:
        metrics_df: DataFrame containing columns ``state``, ``lr_rmse``,
                    ``rf_rmse``, and ``hyb_rmse_mean``.
        best_state: State abbreviation whose bars should be highlighted in amber.

    Returns:
        A ``go.Figure`` with exactly three ``go.Bar`` traces.
    """
    states = metrics_df["state"].tolist()

    def _colors(base_color: str) -> list:
        """Return a per-bar colour list, swapping amber for best_state."""
        return [
            COLOR_HIGHLIGHT if s == best_state else base_color
            for s in states
        ]

    fig = go.Figure()

    fig.add_trace(go.Bar(
        name="LR RMSE",
        x=states,
        y=metrics_df["lr_rmse"].tolist(),
        marker_color=_colors(COLOR_LR),
        hovertemplate="%{y:.6f}",
    ))

    fig.add_trace(go.Bar(
        name="RF RMSE",
        x=states,
        y=metrics_df["rf_rmse"].tolist(),
        marker_color=_colors("#FFA94D"),  # orange
        hovertemplate="%{y:.6f}",
    ))

    fig.add_trace(go.Bar(
        name="Hybrid RMSE",
        x=states,
        y=metrics_df["hyb_rmse_mean"].tolist(),
        marker_color=_colors(COLOR_HYBRID),
        hovertemplate="%{y:.6f}",
    ))

    apply_dark_layout(fig, "RMSE Comparison by State", "State", "RMSE")
    fig.update_layout(barmode="group")

    return fig


# ---------------------------------------------------------------------------
# Line chart builder
# ---------------------------------------------------------------------------

def build_line_chart(
    t: np.ndarray,
    actual,
    lr,
    hyb,
    title: str,
) -> go.Figure:
    """Build a three-trace line chart for Actual, LR Prediction, and Hybrid Prediction.

    Args:
        t:      1-D array of time indices (x-axis values, e.g. hour numbers).
        actual: 1-D array-like of actual capacity factor values.
        lr:     1-D array-like of Linear Regression predicted values.
        hyb:    1-D array-like of Hybrid BiLSTM predicted values.
        title:  Chart title text.

    Returns:
        A ``go.Figure`` with three ``go.Scatter`` traces and a dark layout applied.
    """
    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=t,
        y=actual,
        mode="lines",
        name="Actual",
        line=dict(color=COLOR_ACTUAL),
    ))

    fig.add_trace(go.Scatter(
        x=t,
        y=lr,
        mode="lines",
        name="LR Prediction",
        line=dict(color=COLOR_LR),
    ))

    fig.add_trace(go.Scatter(
        x=t,
        y=hyb,
        mode="lines",
        name="Hybrid Prediction",
        line=dict(color=COLOR_HYBRID),
    ))

    apply_dark_layout(fig, title, "Hour", "Capacity Factor")

    return fig


# ---------------------------------------------------------------------------
# Residual chart builder
# ---------------------------------------------------------------------------

def build_residual_chart(state_data: dict, n_steps: int = 48) -> go.Figure:
    """Build a three-trace line chart for residual correction analysis.

    Plots LR Residuals, BiLSTM Correction, and Remaining Error over the first
    ``n_steps`` timesteps using a shared dark layout.

    Args:
        state_data: Dict with keys ``actual``, ``lr_pred``, ``hyb_pred``,
                    ``residual``, ``correction``, ``remaining_error``, each a
                    1-D ``np.ndarray`` of shape ``(168,)``.
        n_steps:    Number of timesteps to display (default 48).

    Returns:
        A ``go.Figure`` with three ``go.Scatter`` traces and dark layout applied.
    """
    t = np.arange(n_steps)

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=t,
        y=state_data["residual"][:n_steps],
        mode="lines",
        name="LR Residuals",
        line=dict(color="#FFA94D"),
    ))

    fig.add_trace(go.Scatter(
        x=t,
        y=state_data["correction"][:n_steps],
        mode="lines",
        name="BiLSTM Correction",
        line=dict(color="#51CF66"),
    ))

    fig.add_trace(go.Scatter(
        x=t,
        y=state_data["remaining_error"][:n_steps],
        mode="lines",
        name="Remaining Error",
        line=dict(color="#FF6B6B", dash="dash"),
    ))

    apply_dark_layout(fig, "Residual Correction Analysis", "Timestep (hours)", "Residual Value")

    return fig

# ---------------------------------------------------------------------------
# R² bar chart builder
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# R² bar chart builder
# ---------------------------------------------------------------------------

def build_r2_bar(metrics_df: pd.DataFrame, best_state: str) -> go.Figure:
    """Grouped bar chart with two traces: LR R² and Hybrid R² per state.

    The ``best_state`` bars are highlighted in amber (``COLOR_HIGHLIGHT``); all
    other bars use the trace's default colour.  Every bar trace uses
    ``hovertemplate="%{y:.6f}"`` for six-decimal-place hover tooltips.

    Args:
        metrics_df: DataFrame containing columns ``state``, ``lr_r2``, and
                    ``hyb_r2_mean``.
        best_state: State abbreviation whose bars should be highlighted in amber.

    Returns:
        A ``go.Figure`` with exactly two ``go.Bar`` traces.
    """
    states = metrics_df["state"].tolist()

    def _colors(base_color: str) -> list:
        return [
            COLOR_HIGHLIGHT if s == best_state else base_color
            for s in states
        ]

    fig = go.Figure()

    fig.add_trace(go.Bar(
        name="LR R²",
        x=states,
        y=metrics_df["lr_r2"].tolist(),
        marker_color=_colors(COLOR_LR),
        hovertemplate="%{y:.6f}",
    ))

    fig.add_trace(go.Bar(
        name="Hybrid R²",
        x=states,
        y=metrics_df["hyb_r2_mean"].tolist(),
        marker_color=_colors(COLOR_HYBRID),
        hovertemplate="%{y:.6f}",
    ))

    apply_dark_layout(fig, "R² Comparison by State", "State", "R²")
    fig.update_layout(barmode="group")

    return fig


# ---------------------------------------------------------------------------
# Radar chart builder
# ---------------------------------------------------------------------------

def build_radar(metrics_df: pd.DataFrame) -> go.Figure:
    """Radar chart overlaying LR R² and Hybrid R² for all states.

    Creates a ``go.Figure`` with two ``go.Scatterpolar`` traces, one for each
    model's R² values, plotted on a radar with one axis per state.  The loop
    is closed by appending the first element of both ``r`` and ``theta`` arrays.

    Args:
        metrics_df: DataFrame containing columns ``state``, ``lr_r2``, and
                    ``hyb_r2_mean``.

    Returns:
        A ``go.Figure`` with two ``go.Scatterpolar`` traces, dark theme applied,
        and radial axis scaled to ``[0, 1]``.
    """
    states = metrics_df["state"].tolist()

    # Values for each trace — close the loop by appending the first element.
    theta = states + [states[0]]

    lr_r2_values = metrics_df["lr_r2"].tolist()
    lr_r2_values = lr_r2_values + [lr_r2_values[0]]

    hyb_r2_values = metrics_df["hyb_r2_mean"].tolist()
    hyb_r2_values = hyb_r2_values + [hyb_r2_values[0]]

    fig = go.Figure()

    fig.add_trace(go.Scatterpolar(
        r=lr_r2_values,
        theta=theta,
        fill="toself",
        opacity=0.4,
        line=dict(color="#FF6B6B"),
        fillcolor="#FF6B6B",
        name="LR R²",
    ))

    fig.add_trace(go.Scatterpolar(
        r=hyb_r2_values,
        theta=theta,
        fill="toself",
        opacity=0.4,
        line=dict(color="#51CF66"),
        fillcolor="#51CF66",
        name="Hybrid R²",
    ))

    fig.update_layout(
        polar=dict(
            radialaxis=dict(range=[0, 1])
        )
    )

    fig.update_layout(
        template="plotly_dark",
        title="R² Radar Chart (All States)",
    )

    return fig


# ---------------------------------------------------------------------------
# Residual histogram builder
# ---------------------------------------------------------------------------

def build_residual_histogram(lr_residuals, hyb_residuals) -> go.Figure:
    """Overlaid histograms for LR and Hybrid residuals with a shared bin width.

    Both traces use the same ``xbins.size`` computed as
    ``(max_all - min_all) / 40``, ensuring direct visual comparison.

    Args:
        lr_residuals:  1-D array-like of LR residuals (``actual - lr_pred``).
        hyb_residuals: 1-D array-like of Hybrid residuals (``remaining_error``).

    Returns:
        A ``go.Figure`` with two ``go.Histogram`` traces, dark layout applied,
        and identical x-axis and y-axis ranges for both traces.
    """
    lr_arr = np.asarray(lr_residuals)
    hyb_arr = np.asarray(hyb_residuals)

    all_vals = np.concatenate([lr_arr, hyb_arr])
    min_all = float(np.min(all_vals))
    max_all = float(np.max(all_vals))
    bin_size = (max_all - min_all) / 40 if max_all != min_all else 1.0

    fig = go.Figure()

    fig.add_trace(go.Histogram(
        x=lr_arr,
        name="LR Residuals",
        opacity=0.6,
        marker_color=COLOR_LR,
        xbins=dict(start=min_all, end=max_all, size=bin_size),
    ))

    fig.add_trace(go.Histogram(
        x=hyb_arr,
        name="Hybrid Residuals",
        opacity=0.6,
        marker_color=COLOR_HYBRID,
        xbins=dict(start=min_all, end=max_all, size=bin_size),
    ))

    apply_dark_layout(fig, "Residual Distribution", "Residual Value", "Count")
    fig.update_layout(
        barmode="overlay",
        xaxis=dict(range=[min_all, max_all]),
    )

    return fig
