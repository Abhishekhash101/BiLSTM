"""
pages/6_Dataset.py
------------------
Dataset page for the BiLSTM Hybrid Energy Forecasting Dashboard.

Displays information about the GridPath-India long-term electricity planning
dataset used as the raw data source for the forecasting pipeline.

Content:
1. Dataset title and DOI hyperlink
2. Metadata fields (Temporal Resolution, Geographic Coverage, Time Horizon)
3. Bulleted list of 9 data categories
4. Pipeline description (how CSVs feed into the BiLSTM pipeline)

Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
"""

import streamlit as st

# ---------------------------------------------------------------------------
# Dataset metadata (static content — no session state needed)
# ---------------------------------------------------------------------------

DATASET_INFO = {
    "title": "GridPath India — Long-term Electricity Planning Data",
    "doi": "10.5061/dryad.dz08kpsbm",
    "doi_url": "https://doi.org/10.5061/dryad.dz08kpsbm",
    "temporal_resolution": "Hourly — 8760 timesteps per year",
    "geographic_coverage": "35 Indian states/UTs",
    "time_horizon": "2020–2050",
    "categories": [
        "Solar PV capacity factors (fixed-tilt)",
        "Solar PV capacity factors (single-axis tracking)",
        "Solar PV capacity factors (rooftop)",
        "Onshore wind capacity factors (existing)",
        "Onshore wind capacity factors (adjusted)",
        "Onshore wind capacity factors (new)",
        "Offshore wind capacity factors",
        "Demand profiles",
        "Technology costs",
    ],
}

# ---------------------------------------------------------------------------
# 1. Title
# ---------------------------------------------------------------------------

st.title(DATASET_INFO["title"])

# ---------------------------------------------------------------------------
# 2. DOI hyperlink
# ---------------------------------------------------------------------------

st.markdown(
    f"**DOI:** [{DATASET_INFO['doi']}]({DATASET_INFO['doi_url']})"
)

# ---------------------------------------------------------------------------
# 3. Metadata fields
# ---------------------------------------------------------------------------

st.markdown(f"**Temporal Resolution:** {DATASET_INFO['temporal_resolution']}")
st.markdown(f"**Geographic Coverage:** {DATASET_INFO['geographic_coverage']}")
st.markdown(f"**Time Horizon:** {DATASET_INFO['time_horizon']}")

# ---------------------------------------------------------------------------
# 4. Data categories
# ---------------------------------------------------------------------------

st.subheader("Data Categories")

categories_md = "\n".join(
    f"- {category}" for category in DATASET_INFO["categories"]
)
st.markdown(categories_md)

# ---------------------------------------------------------------------------
# 5. Pipeline description
# ---------------------------------------------------------------------------

st.subheader("Data Pipeline")

st.markdown(
    """
    The raw dataset provides hourly capacity factor CSVs for each renewable
    technology across all Indian states. During ingestion, these CSVs are
    aggregated by state to produce a single unified time-series per region,
    capturing solar and wind generation potential at 8760 hourly timesteps per
    year. The aggregated state-level features — including derived quantities such
    as synthetic load and battery state-of-charge — are then used as input to the
    BiLSTM hybrid error-correction pipeline, which predicts residuals from a
    Linear Regression baseline and applies learned corrections to improve forecast
    accuracy.
    """
)
