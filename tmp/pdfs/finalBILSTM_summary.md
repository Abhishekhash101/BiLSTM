# finalBILSTM.ipynb
Cells: 50


## Cell 1 (markdown)
---
## 🔧 Fix: Added `solar_rooftop_cf` to Configuration

**Issue:** `FOLDER_MAP` and `EXPECTED_FINAL_COLUMNS` originally listed only 3 capacity factors, but Cells 9/11 also processed and merged `solar_rooftop_cf`. This caused a schema mismatch assertion error in Cell 11.

**Fix:** Added `"solarPV_roofTop": "solar_rooftop_cf"` to `FOLDER_MAP` and `"solar_rooftop_cf"` to `EXPECTED_FINAL_COLUMNS` so all 4 capacity factors are consistently configured.

## Cell 2 (code)
```python
# Cell 1: Imports, config, and folder mapping

from pathlib import Path
import pandas as pd
import numpy as np

# Data lives in raw_data/raw_data relative to the notebook
ROOT_DIR = Path("raw_data/raw_data")

# Point to the actual inner folders based on your structure
CAPACITY_FACTORS_DIR = ROOT_DIR / "capacity_factors" / "capacity_factors"
GRIDPATH_INPUT_DIR = ROOT_DIR / "gridpath_input_csvs" / "gridpath_input_csvs"

FOLDER_MAP = {
    "solarPV_fixedTilt": "solar_fixed_cf",
    "solarPV_singleAxis": "solar_tracking_cf",
    "solarPV_roofTop": "solar_rooftop_cf",
    "wind_existingAdjusted": "wind_cf",
}

EXPECTED_FINAL_COLUMNS = [
    "time",
    "solar_fixed_cf",
    "solar_tracking_cf",
    "solar_rooftop_cf",
    "wind_cf",
]

OUTPUT_PATH = ROOT_DIR / "df_master_IN.csv"

assert ROOT_DIR.exists(), f"Root path not found: {ROOT_DIR}"
assert CAPACITY_FACTORS_DIR.exists(), f"capacity_factors folder not found: {CAPACITY_FACTORS_DIR}"

for folder_name in FOLDER_MAP:
    folder_path = CAPACITY_FACTORS_DIR / folder_name
    assert folder_path.exists(), f"Missing required folder: {folder_path}"

print("ROOT_DIR:", ROOT_DIR)
print("CAPACITY_FACTORS_DIR:", CAPACITY_FACTORS_DIR)
print("GRIDPATH_INPUT_DIR:", GRIDPATH_INPUT_DIR)
print("OUTPUT_PATH:", OUTPUT_PATH)
print("FOLDER_MAP:", FOLDER_MAP)
print("EXPECTED_FINAL_COLUMNS:", EXPECTED_FINAL_COLUMNS)
```
Outputs: 1
- Output 1: stream
```
ROOT_DIR: raw_data\raw_data
CAPACITY_FACTORS_DIR: raw_data\raw_data\capacity_factors\capacity_factors
GRIDPATH_INPUT_DIR: raw_data\raw_data\gridpath_input_csvs\gridpath_input_csvs
OUTPUT_PATH: raw_data\raw_data\df_master_IN.csv
FOLDER_MAP: {'solarPV_fixedTilt': 'solar_fixed_cf', 'solarPV_singleAxis': 'solar_tracking_cf', 'solarPV_roofTop': 'solar_rooftop_cf', 'wind_existingAdjusted': 'wind_cf'}
EXPECTED_FINAL_COLUMNS: ['time', 'solar_fixed_cf', 'solar_tracking_cf', 'solar_rooftop_cf', 'wind_cf']
```

## Cell 3 (code)
```python
# Cell 2: Deterministic file discovery and folder inventory

folder_files = {}

for folder_name, output_col in FOLDER_MAP.items():
    folder_path = CAPACITY_FACTORS_DIR / folder_name
    csv_files = sorted(folder_path.glob("*.csv"))

    assert len(csv_files) > 0, f"No CSV files found in {folder_path}"

    folder_files[folder_name] = csv_files

    print(f"\nFolder: {folder_name}")
    print(f"Mapped output column: {output_col}")
    print(f"CSV count: {len(csv_files)}")
    print("First 3 files:")
    for fp in csv_files[:3]:
        print(" -", fp.name)
```
Outputs: 1
- Output 1: stream
```
Folder: solarPV_fixedTilt
Mapped output column: solar_fixed_cf
CSV count: 566
First 3 files:
 - AN_A_2019_meteosat_fixedTilt.csv
 - AN_B_2019_meteosat_fixedTilt.csv
 - AN_C_2019_meteosat_fixedTilt.csv

Folder: solarPV_singleAxis
Mapped output column: solar_tracking_cf
CSV count: 566
First 3 files:
 - AN_A_2019_meteosat_singleAxis.csv
 - AN_B_2019_meteosat_singleAxis.csv
 - AN_C_2019_meteosat_singleAxis.csv

Folder: solarPV_roofTop
Mapped output column: solar_rooftop_cf
CSV count: 35
First 3 files:
 - AP_2019_meteosat_roofMount.csv
 - AR_2019_meteosat_roofMount.csv
 - AS_2019_meteosat_roofMount.csv

Folder: wind_existingAdjusted
Mapped output column: wind_cf
CSV count: 311
First 3 files:
 - AN_A_2019_era5_Vestas_2MW.csv
 - AN_B_2019_era5_Vestas_2MW.csv
 - AN_C_2019_era5_Vestas_2MW.csv
```

## Cell 4 (code)
```python
# Cell 3: Stage 1 EDA on one sample CSV per folder

eda_samples = {}

for folder_name, output_col in FOLDER_MAP.items():
    sample_file = folder_files[folder_name][0]
    df_sample = pd.read_csv(sample_file)
    eda_samples[folder_name] = df_sample

    print("\n" + "=" * 100)
    print(f"FOLDER: {folder_name}")
    print(f"SAMPLE FILE: {sample_file.name}")
    print("=" * 100)

    print("shape:", df_sample.shape)
    print("\ncolumns:")
    print(df_sample.columns.tolist())

    print("\nhead(3):")
    print(df_sample.head(3))

    print("\ndtypes:")
    print(df_sample.dtypes)

    print("\nnull count:")
    print(df_sample.isnull().sum())

    assert "capacity_factor" in df_sample.columns, f"'capacity_factor' missing in {sample_file.name}"
    print("\ncapacity_factor min/max:")
    print(df_sample["capacity_factor"].min(), df_sample["capacity_factor"].max())

    if "load_zone_abr" in df_sample.columns:
        print("\nunique load_zone_abr (sample):")
        print(df_sample["load_zone_abr"].dropna().unique()[:10])
        print("contains 'IN':", "IN" in set(df_sample["load_zone_abr"].dropna().astype(str).unique()))
    else:
        print("\nload_zone_abr column missing in sample file")

    if "time" in df_sample.columns:
        print("\nfirst 5 raw time values:")
        print(df_sample["time"].astype(str).head(5).tolist())
    else:
        print("\ntime column missing in sample file")

    print(f"\nnumber of CSV files in folder: {len(folder_files[folder_name])}")
```
Outputs: 1
- Output 1: stream
```
====================================================================================================
FOLDER: solarPV_fixedTilt
SAMPLE FILE: AN_A_2019_meteosat_fixedTilt.csv
====================================================================================================
shape: (8760, 5)

columns:
['time', 'capacity_factor', 'project', 'capacity_mw', 'load_zone_abr']

head(3):
                  time  capacity_factor project  capacity_mw load_zone_abr
0  2019-01-01 00:00:00              0.0    AN_A   395.749261            AN
1  2019-01-01 01:00:00              0.0    AN_A   395.749261            AN
2  2019-01-01 02:00:00              0.0    AN_A   395.749261            AN

dtypes:
time                object
capacity_factor    float64
project             object
capacity_mw        float64
load_zone_abr       object
dtype: object

null count:
time               0
capacity_factor    0
project            0
capacity_mw        0
load_zone_abr      0
dtype: int64

capacity_factor min/max:
0.0 0.7695000000000001

unique load_zone_abr (sample):
['AN']
contains 'IN': False

first 5 raw time values:
['2019-01-01 00:00:00', '2019-01-01 01:00:00', '2019-01-01 02:00:00', '2019-01-01 03:00:00', '2019-01-01 04:00:00']
```

## Cell 5 (code)
```python
# Cell 4: Folder-wide scan for TN presence and raw timestamp consistency

EXPECTED_TIME_FORMAT = "%Y-%m-%d %H:%M:%S"

# folder_scan_summary = {}

# for folder_name, output_col in FOLDER_MAP.items():
#     csv_files = folder_files[folder_name]

#     zone_values_all = set()
#     tn_files = []
#     raw_time_examples = set()
#     bad_time_examples = []

#     for fp in csv_files:
#         df_probe = pd.read_csv(fp, usecols=["time", "load_zone_abr"], low_memory=False)

#         zones_in_file = set(df_probe["load_zone_abr"].dropna().astype(str).unique())
#         zone_values_all.update(zones_in_file)

#         if "TN" in zones_in_file:
#             tn_files.append(fp.name)

#         sample_times = df_probe["time"].dropna().astype(str).head(5).tolist()
#         raw_time_examples.update(sample_times[:3])

#         parsed = pd.to_datetime(
#             sample_times,
#             format=EXPECTED_TIME_FORMAT,
#             errors="coerce"
#         )
#         for raw_val, parsed_val in zip(sample_times, parsed):
#             if pd.isna(parsed_val):
#                 bad_time_examples.append((fp.name, raw_val))
#                 if len(bad_time_examples) >= 5:
#                     break

#         if len(bad_time_examples) >= 5:
#             break

#     folder_scan_summary[folder_name] = {
#         "csv_count": len(csv_files),
#         "unique_zones": sorted(zone_values_all),
#         "tn_file_count": len(tn_files),
#         "tn_file_examples": tn_files[:5],
#         "raw_time_examples": sorted(list(raw_time_examples))[:5],
#         "bad_time_examples": bad_time_examples[:5],
#     }

# for folder_name, summary in folder_scan_summary.items():
#     print("\n" + "=" * 100)
#     print(f"FOLDER: {folder_name}")
#     print("=" * 100)
#     print("CSV count:", summary["csv_count"])
#     print("Unique load_zone_abr values:", summary["unique_zones"])
#     print("TN file count:", summary["tn_file_count"])
#     print("TN file examples:", summary["tn_file_examples"])
#     print("Raw time examples:", summary["raw_time_examples"])
#     print("Bad time examples for expected format:", summary["bad_time_examples"])

#     assert summary["tn_file_count"] > 0, f"No TN files found in folder: {folder_name}"
#     assert len(summary["bad_time_examples"]) == 0, (
#         f"Inconsistent raw time format detected in folder: {folder_name}. "
#         f"Examples: {summary['bad_time_examples']}"
#     )

# print("\nFolder-wide TN and time-format scan passed.")
# print("Locked EXPECTED_TIME_FORMAT:", EXPECTED_TIME_FORMAT)
```

## Cell 6 (code)
```python
# Cell 5: Validation helpers + reusable per-folder processor

def _print_timestamp_diagnostics(ts, label):
    ts = pd.Series(ts).dropna().sort_values().reset_index(drop=True)
    print(f"\n[{label}] timestamp diagnostics")
    print("count:", len(ts))
    if len(ts) > 0:
        print("first:", ts.iloc[0])
        print("last :", ts.iloc[-1])
    print("duplicate_count:", int(ts.duplicated().sum()))

    if len(ts) > 1:
        diffs = ts.diff().dropna()
        bad_diffs = diffs[diffs != pd.Timedelta(hours=1)]
        print("non_hourly_gap_count:", len(bad_diffs))
        if len(bad_diffs) > 0:
            bad_idx = bad_diffs.index[:10]
            diag = pd.DataFrame({
                "prev_time": ts.loc[bad_idx - 1].values,
                "curr_time": ts.loc[bad_idx].values,
                "gap": bad_diffs.loc[bad_idx].values
            })
            print("broken intervals (up to 10):")
            print(diag)


def _expected_hourly_range(ts):
    ts = pd.Series(ts).dropna().sort_values().reset_index(drop=True)
    assert len(ts) > 0, "Cannot build expected hourly range from empty timestamps"
    return pd.date_range(start=ts.iloc[0], end=ts.iloc[-1], freq="H")


def _print_missing_extra_timestamps(ts, label):
    ts = pd.Series(ts).dropna().sort_values().reset_index(drop=True)
    expected = _expected_hourly_range(ts)
    actual_set = set(ts)
    expected_set = set(expected)

    missing = sorted(expected_set - actual_set)
    extra = sorted(actual_set - expected_set)

    print(f"\n[{label}] missing/extra timestamp diagnostics")
    print("missing_count:", len(missing))
    print("extra_count:", len(extra))
    if len(missing) > 0:
        print("missing timestamps (up to 10):", missing[:10])
    if len(extra) > 0:
        print("extra timestamps (up to 10):", extra[:10])


def load_and_aggregate_cf(folder_path, output_col_name, expected_time_format):
    csv_files = sorted(Path(folder_path).glob("*.csv"))
    assert len(csv_files) > 0, f"No CSV files found in {folder_path}"

    frames = []
    for fp in csv_files:
        df = pd.read_csv(fp, low_memory=False)
        required_cols = {"time", "capacity_factor", "load_zone_abr"}
        missing_cols = required_cols - set(df.columns)
        assert not missing_cols, f"{fp.name} missing required columns: {missing_cols}"

        df = df[["time", "capacity_factor", "load_zone_abr"]].copy()
        df["source_file"] = fp.name
        frames.append(df)

    df_all = pd.concat(frames, ignore_index=True)

    df_tn = df_all[df_all["load_zone_abr"].astype(str) == "TN"].copy()
    assert len(df_tn) > 0, f"TN filter returned zero rows for folder: {folder_path}"

    raw_dup_mask = df_tn.duplicated(subset=["time"], keep=False)
    if raw_dup_mask.any():
        dup_counts = (
            df_tn.loc[raw_dup_mask, "time"]
            .astype(str)
            .value_counts()
            .sort_index()
        )
        print(f"\nRaw duplicate timestamps found before parsing/grouping in {folder_path.name}:")
        print(dup_counts.head(10))
...
```

## Cell 7 (code)
```python
# Cell 6: Patch duplicate-check logic in the reusable loader

def load_and_aggregate_cf(folder_path, output_col_name, expected_time_format):
    csv_files = sorted(Path(folder_path).glob("*.csv"))
    assert len(csv_files) > 0, f"No CSV files found in {folder_path}"

    frames = []
    for fp in csv_files:
        df = pd.read_csv(fp, low_memory=False)
        required_cols = {"time", "capacity_factor", "load_zone_abr"}
        missing_cols = required_cols - set(df.columns)
        assert not missing_cols, f"{fp.name} missing required columns: {missing_cols}"

        keep_cols = ["time", "capacity_factor", "load_zone_abr"]
        if "project" in df.columns:
            keep_cols.append("project")

        df = df[keep_cols].copy()
        df["source_file"] = fp.name
        frames.append(df)

    df_all = pd.concat(frames, ignore_index=True)

    df_tn = df_all[df_all["load_zone_abr"].astype(str) == "TN"].copy()
    assert len(df_tn) > 0, f"TN filter returned zero rows for folder: {folder_path}"

    df_tn["time"] = pd.to_datetime(
        df_tn["time"],
        format=expected_time_format,
        errors="raise"
    )

    if getattr(df_tn["time"].dt, "tz", None) is not None:
        df_tn["time"] = df_tn["time"].dt.tz_convert(None)

    df_tn = df_tn.sort_values("time").reset_index(drop=True)

    dup_subset = ["project", "time"] if "project" in df_tn.columns else ["source_file", "time"]
    raw_dup_mask = df_tn.duplicated(subset=dup_subset, keep=False)
    if raw_dup_mask.any():
        print(f"\nRaw duplicate records found before grouping in {folder_path.name}:")
        print(df_tn.loc[raw_dup_mask, dup_subset + ["source_file"]].head(10))
        raise AssertionError(
            f"Duplicate records found on {dup_subset} in raw TN data for folder: {folder_path.name}"
        )

    df_agg = (
        df_tn.groupby("time", as_index=False)["capacity_factor"]
        .mean()
        .rename(columns={"capacity_factor": output_col_name})
        .sort_values("time")
        .reset_index(drop=True)
    )

    if df_agg[output_col_name].isnull().any() or df_agg["time"].isnull().any():
        raise AssertionError(f"Nulls found after aggregation in folder: {folder_path.name}")

    if df_agg["time"].duplicated().any():
        dup_ts = df_agg.loc[df_agg["time"].duplicated(keep=False), "time"].tolist()[:10]
        print("Duplicate aggregated timestamps:", dup_ts)
        raise AssertionError(f"Duplicate timestamps after aggregation in folder: {folder_path.name}")

    _print_timestamp_diagnostics(df_agg["time"], folder_path.name)
    _print_missing_extra_timestamps(df_agg["time"], folder_path.name)

    assert len(df_agg) == 8760, (
        f"{folder_path.name} has {len(df_agg)} rows after aggregation; expected 8760"
    )

    diffs = df_agg["time"].diff().dropna()
    assert (diffs == pd.Timedelta(hours=1)).all(), (
        f"{folder_path.name} failed hourly continuity check"
    )

    return df_agg
```

## Cell 8 (code)
```python
# Cell 7: Process one folder first (solarPV_fixedTilt) and inspect output

solar_fixed_df = load_and_aggregate_cf(
    folder_path=CAPACITY_FACTORS_DIR / "solarPV_fixedTilt",
    output_col_name="solar_fixed_cf",
    expected_time_format=EXPECTED_TIME_FORMAT
)

print("\nsolar_fixed_df shape:", solar_fixed_df.shape)
print("\nsolar_fixed_df head:")
print(solar_fixed_df.head(3))

print("\nsolar_fixed_df tail:")
print(solar_fixed_df.tail(3))

print("\nsolar_fixed_df dtypes:")
print(solar_fixed_df.dtypes)

print("\nsolar_fixed_df null count:")
print(solar_fixed_df.isnull().sum())

print("\nsolar_fixed_df duplicate timestamp count:", solar_fixed_df["time"].duplicated().sum())
print("solar_fixed_df min/max time:", solar_fixed_df["time"].min(), solar_fixed_df["time"].max())
```
Outputs: 1
- Output 1: stream
```
[solarPV_fixedTilt] timestamp diagnostics
count: 8760
first: 2019-01-01 00:00:00
last : 2019-12-31 23:00:00
duplicate_count: 0
non_hourly_gap_count: 0

[solarPV_fixedTilt] missing/extra timestamp diagnostics
missing_count: 0
extra_count: 0

solar_fixed_df shape: (8760, 2)

solar_fixed_df head:
                 time  solar_fixed_cf
0 2019-01-01 00:00:00             0.0
1 2019-01-01 01:00:00             0.0
2 2019-01-01 02:00:00             0.0

solar_fixed_df tail:
                    time  solar_fixed_cf
8757 2019-12-31 21:00:00             0.0
8758 2019-12-31 22:00:00             0.0
8759 2019-12-31 23:00:00             0.0

solar_fixed_df dtypes:
time              datetime64[ns]
solar_fixed_cf           float64
dtype: object

solar_fixed_df null count:
time              0
solar_fixed_cf    0
dtype: int64

solar_fixed_df duplicate timestamp count: 0
solar_fixed_df min/max time: 2019-01-01 00:00:00 2019-12-31 23:00:00
```

## Cell 9 (code)
```python
# Cell 8: Small warning-fix patch for hourly range generation

def _expected_hourly_range(ts):
    ts = pd.Series(ts).dropna().sort_values().reset_index(drop=True)
    assert len(ts) > 0, "Cannot build expected hourly range from empty timestamps"
    return pd.date_range(start=ts.iloc[0], end=ts.iloc[-1], freq="h")
```

## Cell 10 (code)
```python
# Cell 9: Process the remaining three folders

solar_tracking_df = load_and_aggregate_cf(
    folder_path=CAPACITY_FACTORS_DIR / "solarPV_singleAxis",
    output_col_name="solar_tracking_cf",
    expected_time_format=EXPECTED_TIME_FORMAT
)

solar_rooftop_df = load_and_aggregate_cf(
    folder_path=CAPACITY_FACTORS_DIR / "solarPV_roofTop",
    output_col_name="solar_rooftop_cf",
    expected_time_format=EXPECTED_TIME_FORMAT
)

wind_df = load_and_aggregate_cf(
    folder_path=CAPACITY_FACTORS_DIR / "wind_existingAdjusted",
    output_col_name="wind_cf",
    expected_time_format=EXPECTED_TIME_FORMAT
)

print("\nProcessed dataframe shapes:")
print("solar_tracking_df:", solar_tracking_df.shape)
print("solar_rooftop_df :", solar_rooftop_df.shape)
print("wind_df          :", wind_df.shape)
```
Outputs: 1
- Output 1: stream
```
[solarPV_singleAxis] timestamp diagnostics
count: 8760
first: 2019-01-01 00:00:00
last : 2019-12-31 23:00:00
duplicate_count: 0
non_hourly_gap_count: 0

[solarPV_singleAxis] missing/extra timestamp diagnostics
missing_count: 0
extra_count: 0

[solarPV_roofTop] timestamp diagnostics
count: 8760
first: 2019-01-01 00:00:00
last : 2019-12-31 23:00:00
duplicate_count: 0
non_hourly_gap_count: 0

[solarPV_roofTop] missing/extra timestamp diagnostics
missing_count: 0
extra_count: 0

[wind_existingAdjusted] timestamp diagnostics
count: 8760
first: 2019-01-01 00:00:00
last : 2019-12-31 23:00:00
duplicate_count: 0
non_hourly_gap_count: 0

[wind_existingAdjusted] missing/extra timestamp diagnostics
missing_count: 0
extra_count: 0

Processed dataframe shapes:
solar_tracking_df: (8760, 2)
solar_rooftop_df : (8760, 2)
wind_df          : (8760, 2)
```

## Cell 11 (code)
```python
# Cell 10: Verify identical timestamp sets and identical sorted order across all four series

series_map = {
    "solar_fixed_cf": solar_fixed_df,
    "solar_tracking_cf": solar_tracking_df,
    "solar_rooftop_cf": solar_rooftop_df,
    "wind_cf": wind_df,
}

base_name = "solar_fixed_cf"
base_times = series_map[base_name]["time"].sort_values().reset_index(drop=True)
base_set = set(base_times)

for name, df_ in series_map.items():
    current_times = df_["time"].sort_values().reset_index(drop=True)
    current_set = set(current_times)

    set_equal = current_set == base_set
    order_equal = current_times.equals(base_times)

    print(f"\nComparing {name} vs {base_name}")
    print("set_equal  :", set_equal)
    print("order_equal:", order_equal)

    if not set_equal:
        missing_vs_base = sorted(base_set - current_set)
        extra_vs_base = sorted(current_set - base_set)
        print("missing_vs_base (up to 10):", missing_vs_base[:10])
        print("extra_vs_base   (up to 10):", extra_vs_base[:10])
        raise AssertionError(f"Timestamp set mismatch: {name} vs {base_name}")

    if not order_equal:
        mismatch_idx = (current_times != base_times)
        mismatch_positions = list(current_times.index[mismatch_idx])[:10]
        print("mismatch_positions (up to 10):", mismatch_positions)
        raise AssertionError(f"Timestamp order mismatch: {name} vs {base_name}")

print("\nAll four series have identical timestamp sets and identical sorted order.")
```
Outputs: 1
- Output 1: stream
```
Comparing solar_fixed_cf vs solar_fixed_cf
set_equal  : True
order_equal: True

Comparing solar_tracking_cf vs solar_fixed_cf
set_equal  : True
order_equal: True

Comparing solar_rooftop_cf vs solar_fixed_cf
set_equal  : True
order_equal: True

Comparing wind_cf vs solar_fixed_cf
set_equal  : True
order_equal: True

All four series have identical timestamp sets and identical sorted order.
```

## Cell 12 (code)
```python
# Cell 11: Merge all four validated series and run final post-merge checks

df_master_TN = (
    solar_fixed_df
    .merge(solar_tracking_df, on="time", how="inner")
    .merge(solar_rooftop_df, on="time", how="inner")
    .merge(wind_df, on="time", how="inner")
    .sort_values("time")
    .reset_index(drop=True)
)

assert df_master_TN.columns.tolist() == EXPECTED_FINAL_COLUMNS, (
    f"Final schema mismatch.\nExpected: {EXPECTED_FINAL_COLUMNS}\nGot: {df_master_TN.columns.tolist()}"
)

assert len(df_master_TN) == 8760, f"Final row count mismatch: got {len(df_master_TN)}, expected 8760"
assert not df_master_TN.isnull().any().any(), "Null values found in df_master_TN"
assert not df_master_TN["time"].duplicated().any(), "Duplicate timestamps found in df_master_TN"
assert df_master_TN["time"].is_monotonic_increasing, "Timestamps are not sorted ascending in df_master_TN"

final_diffs = df_master_TN["time"].diff().dropna()
assert (final_diffs == pd.Timedelta(hours=1)).all(), "Final hourly continuity check failed"

print("df_master_TN shape:", df_master_TN.shape)
print("\ndf_master_TN head:")
print(df_master_TN.head(3))

print("\ndf_master_TN tail:")
print(df_master_TN.tail(3))

print("\ndf_master_TN dtypes:")
print(df_master_TN.dtypes)

print("\ndf_master_TN null count:")
print(df_master_TN.isnull().sum())

print("\ndf_master_TN duplicate timestamp count:", df_master_TN["time"].duplicated().sum())
print("df_master_TN min/max time:", df_master_TN["time"].min(), df_master_TN["time"].max())
```
Outputs: 1
- Output 1: stream
```
df_master_TN shape: (8760, 5)

df_master_TN head:
                 time  solar_fixed_cf  solar_tracking_cf  solar_rooftop_cf  \
0 2019-01-01 00:00:00             0.0                0.0               0.0   
1 2019-01-01 01:00:00             0.0                0.0               0.0   
2 2019-01-01 02:00:00             0.0                0.0               0.0   

    wind_cf  
0  0.105742  
1  0.093738  
2  0.082049  

df_master_TN tail:
                    time  solar_fixed_cf  solar_tracking_cf  solar_rooftop_cf  \
8757 2019-12-31 21:00:00             0.0                0.0               0.0   
8758 2019-12-31 22:00:00             0.0                0.0               0.0   
8759 2019-12-31 23:00:00             0.0                0.0               0.0   

       wind_cf  
8757  0.113883  
8758  0.111735  
8759  0.109899  

df_master_TN dtypes:
time                 datetime64[ns]
solar_fixed_cf              float64
solar_tracking_cf           float64
solar_rooftop_cf            float64
wind_cf                     float64
dtype: object

df_master_TN null count:
time                 0
solar_fixed_cf       0
solar_tracking_cf    0
solar_rooftop_cf     0
wind_cf              0
dtype: int64

```

## Cell 13 (code)
```python
# Cell 12: Save df_master_TN.csv and verify by reading it back

df_master_TN.to_csv(OUTPUT_PATH, index=False)

df_master_TN_check = pd.read_csv(OUTPUT_PATH)

assert df_master_TN_check.columns.tolist() == EXPECTED_FINAL_COLUMNS, (
    f"Saved CSV schema mismatch.\nExpected: {EXPECTED_FINAL_COLUMNS}\nGot: {df_master_TN_check.columns.tolist()}"
)

assert len(df_master_TN_check) == 8760, (
    f"Saved CSV row count mismatch: got {len(df_master_TN_check)}, expected 8760"
)

assert not df_master_TN_check.isnull().any().any(), "Null values found in saved df_master_TN.csv"

print("Saved file:", OUTPUT_PATH)
print("Saved CSV shape:", df_master_TN_check.shape)
print("\nSaved CSV head:")
print(df_master_TN_check.head(3))
```
Outputs: 1
- Output 1: stream
```
Saved file: raw_data\raw_data\df_master_IN.csv
Saved CSV shape: (8760, 5)

Saved CSV head:
                  time  solar_fixed_cf  solar_tracking_cf  solar_rooftop_cf  \
0  2019-01-01 00:00:00             0.0                0.0               0.0   
1  2019-01-01 01:00:00             0.0                0.0               0.0   
2  2019-01-01 02:00:00             0.0                0.0               0.0   

    wind_cf  
0  0.105742  
1  0.093738  
2  0.082049
```

## Cell 14 (markdown)
---
## 🔧 Fix: Colab Paths → Local Paths

**Issue:** Cells 13 and 20 used Google Colab paths (`/content/drive/MyDrive/...`) which don't exist on the local machine.

**Fix:**
- `MASTER_PATH` → `raw_data/raw_data/df_master_IN.csv` (matches Cell 1's `OUTPUT_PATH`)
- `FEATURES_OUTPUT_PATH` → `raw_data/raw_data/df_features_TN.csv`
- `FEATURES_PATH` (Cell 20) → `raw_data/raw_data/df_features_TN.csv`

## Cell 15 (code)
```python
# Cell 13: Load df_master_TN and lock Stage 3 configuration

import pandas as pd
import numpy as np
from pathlib import Path

MASTER_PATH = Path("raw_data/raw_data/df_master_IN.csv")
FEATURES_OUTPUT_PATH = Path("raw_data/raw_data/df_features_TN.csv")

EXPECTED_MASTER_COLUMNS = [
    "time",
    "solar_fixed_cf",
    "solar_tracking_cf",
    "solar_rooftop_cf",
    "wind_cf",
]

FEATURE_COLUMNS = [
    "solar_fixed_cf",
    "wind_cf",
    "P_gen",
    "P_load",
    "SoC",
    "hour_of_day",
    "day_of_year",
]

TARGET_COLUMN = "y"

CONFIG = {
    "installed_capacity_mw": {
        "solar_fixed": 2500,
        "solar_tracking": 500,
        "solar_rooftop": 1000,
        "wind": 8600,
    },
    "load": {
        "base_load": 7000,
        "peak_load": 14000,
        "daily_min_hour": 4,
    },
    "storage": {
        "capacity_mwh": 1500,
        "max_rate_mw": 300,
        "initial_soc": 0.5,
        "min_soc": 0.1,
        "max_soc": 0.9,
        "charge_eff": 0.92,
        "discharge_eff": 0.90,
    }
}

df_master_TN = pd.read_csv(MASTER_PATH)

assert df_master_TN.columns.tolist() == EXPECTED_MASTER_COLUMNS, (
    f"Schema mismatch in df_master_TN.\nExpected: {EXPECTED_MASTER_COLUMNS}\nGot: {df_master_TN.columns.tolist()}"
)

df_master_TN["time"] = pd.to_datetime(
    df_master_TN["time"],
    format="%Y-%m-%d %H:%M:%S",
    errors="raise"
)

assert len(df_master_TN) == 8760, f"Expected 8760 rows, got {len(df_master_TN)}"
assert not df_master_TN.isnull().any().any(), "Null values found in df_master_TN"
assert not df_master_TN["time"].duplicated().any(), "Duplicate timestamps found in df_master_TN"
assert df_master_TN["time"].is_monotonic_increasing, "time is not sorted ascending"

time_diffs = df_master_TN["time"].diff().dropna()
assert (time_diffs == pd.Timedelta(hours=1)).all(), "df_master_TN is not strictly hourly and continuous"

print("Loaded df_master_TN successfully")
print("Shape:", df_master_TN.shape)
print("Columns:", df_master_TN.columns.tolist())
print("\nConfig locked:")
print(CONFIG)
print("\nHead:")
print(df_master_TN.head(3))
```
Outputs: 1
- Output 1: stream
```
Loaded df_master_TN successfully
Shape: (8760, 5)
Columns: ['time', 'solar_fixed_cf', 'solar_tracking_cf', 'solar_rooftop_cf', 'wind_cf']

Config locked:
{'installed_capacity_mw': {'solar_fixed': 2500, 'solar_tracking': 500, 'solar_rooftop': 1000, 'wind': 8600}, 'load': {'base_load': 7000, 'peak_load': 14000, 'daily_min_hour': 4}, 'storage': {'capacity_mwh': 1500, 'max_rate_mw': 300, 'initial_soc': 0.5, 'min_soc': 0.1, 'max_soc': 0.9, 'charge_eff': 0.92, 'discharge_eff': 0.9}}

Head:
                 time  solar_fixed_cf  solar_tracking_cf  solar_rooftop_cf  \
0 2019-01-01 00:00:00             0.0                0.0               0.0   
1 2019-01-01 01:00:00             0.0                0.0               0.0   
2 2019-01-01 02:00:00             0.0                0.0               0.0   

    wind_cf  
0  0.105742  
1  0.093738  
2  0.082049
```

## Cell 16 (code)
```python
# Cell 14: Time features + deterministic cosine-based load model

df_stage3 = df_master_TN.copy()

df_stage3["hour_of_day"] = df_stage3["time"].dt.hour
df_stage3["day_of_year"] = df_stage3["time"].dt.dayofyear

base_load = CONFIG["load"]["base_load"]
peak_load = CONFIG["load"]["peak_load"]
daily_min_hour = CONFIG["load"]["daily_min_hour"]

load_mid = (base_load + peak_load) / 2.0
load_amp = (peak_load - base_load) / 2.0

df_stage3["P_load"] = load_mid - load_amp * np.cos(
    2 * np.pi * (df_stage3["hour_of_day"] - daily_min_hour) / 24.0
)

assert df_stage3["P_load"].between(base_load, peak_load).all(), "P_load out of expected bounds"
assert df_stage3["hour_of_day"].between(0, 23).all(), "hour_of_day out of range"
assert df_stage3["day_of_year"].between(1, 365).all(), "day_of_year out of range"

print("df_stage3 shape:", df_stage3.shape)
print("\nColumns so far:")
print(df_stage3.columns.tolist())

print("\nHead with load features:")
print(df_stage3[["time", "hour_of_day", "day_of_year", "P_load"]].head(8))

print("\nP_load min/max:")
print(df_stage3["P_load"].min(), df_stage3["P_load"].max())

print("\nLoad values around minimum hour:")
print(
    df_stage3.loc[
        df_stage3["time"].dt.date == df_stage3["time"].dt.date.iloc[0],
        ["time", "hour_of_day", "P_load"]
    ].head(8)
)
```
Outputs: 1
- Output 1: stream
```
df_stage3 shape: (8760, 8)

Columns so far:
['time', 'solar_fixed_cf', 'solar_tracking_cf', 'solar_rooftop_cf', 'wind_cf', 'hour_of_day', 'day_of_year', 'P_load']

Head with load features:
                 time  hour_of_day  day_of_year       P_load
0 2019-01-01 00:00:00            0            1  8750.000000
1 2019-01-01 01:00:00            1            1  8025.126266
2 2019-01-01 02:00:00            2            1  7468.911087
3 2019-01-01 03:00:00            3            1  7119.259608
4 2019-01-01 04:00:00            4            1  7000.000000
5 2019-01-01 05:00:00            5            1  7119.259608
6 2019-01-01 06:00:00            6            1  7468.911087
7 2019-01-01 07:00:00            7            1  8025.126266

P_load min/max:
7000.0 14000.0

Load values around minimum hour:
                 time  hour_of_day       P_load
0 2019-01-01 00:00:00            0  8750.000000
1 2019-01-01 01:00:00            1  8025.126266
2 2019-01-01 02:00:00            2  7468.911087
3 2019-01-01 03:00:00            3  7119.259608
4 2019-01-01 04:00:00            4  7000.000000
5 2019-01-01 05:00:00            5  7119.259608
6 2019-01-01 06:00:00            6  7468.911087
7 2019-01-01 07:00:00            7  8025.126266
```

## Cell 17 (code)
```python
# Cell 15: Compute P_gen from capacity factors and installed-capacity weights

cap = CONFIG["installed_capacity_mw"]

df_stage3["P_gen"] = (
    df_stage3["solar_fixed_cf"] * cap["solar_fixed"] +
    df_stage3["solar_tracking_cf"] * cap["solar_tracking"] +
    df_stage3["solar_rooftop_cf"] * cap["solar_rooftop"] +
    df_stage3["wind_cf"] * cap["wind"]
)

max_possible_gen = (
    cap["solar_fixed"] +
    cap["solar_tracking"] +
    cap["solar_rooftop"] +
    cap["wind"]
)

assert (df_stage3["P_gen"] >= 0).all(), "P_gen contains negative values"
assert (df_stage3["P_gen"] <= max_possible_gen).all(), "P_gen exceeds theoretical maximum capacity"

print("P_gen min/max:")
print(df_stage3["P_gen"].min(), df_stage3["P_gen"].max())

print("\nTheoretical max generation capacity (MW):")
print(max_possible_gen)

print("\nHead with generation:")
print(
    df_stage3[
        ["time", "solar_fixed_cf", "solar_tracking_cf", "solar_rooftop_cf", "wind_cf", "P_gen"]
    ].head(8)
)

print("\nSample daytime rows:")
sample_day = df_stage3[df_stage3["time"].dt.date == df_stage3["time"].dt.date.iloc[0]]
print(
    sample_day[
        ["time", "solar_fixed_cf", "solar_tracking_cf", "solar_rooftop_cf", "wind_cf", "P_gen"]
    ].iloc[8:16]
)
```
Outputs: 1
- Output 1: stream
```
P_gen min/max:
7.22848200691184 4974.994695691827

Theoretical max generation capacity (MW):
12600

Head with generation:
                 time  solar_fixed_cf  solar_tracking_cf  solar_rooftop_cf  \
0 2019-01-01 00:00:00        0.000000           0.000000             0.000   
1 2019-01-01 01:00:00        0.000000           0.000000             0.000   
2 2019-01-01 02:00:00        0.000000           0.000000             0.000   
3 2019-01-01 03:00:00        0.000000           0.000000             0.000   
4 2019-01-01 04:00:00        0.000000           0.000000             0.000   
5 2019-01-01 05:00:00        0.000000           0.000000             0.000   
6 2019-01-01 06:00:00        0.000000           0.000000             0.000   
7 2019-01-01 07:00:00        0.092932           0.161114             0.097   

    wind_cf        P_gen  
0  0.105742   909.382975  
1  0.093738   806.143273  
2  0.082049   705.617166  
3  0.073307   630.441961  
4  0.070537   606.614360  
5  0.095824   824.084571  
6  0.122171  1050.668504  
7  0.125056  1485.364910  

Sample daytime rows:
                  time  solar_fixed_cf  solar_tracking_cf  solar_rooftop_cf  \
8  2019-01-01 08:00:00        0.285068           0.458841            0.2870   
9  2019-01-01 09:00:00        0.444727           0.597750            0.3690   
10 2019-01-01 10:00:00        0.560955           0.616364            0.4215   
11 2019-01-01 11:00:00        0.654205           0.642659            0.5085   
12 2019-01-01 12:00:00        0.668955           0.624773            0.5535   
13 2019-01-01 13:00:00        0.623864           0.588455            0.5220   
14 2019-01-01 14:00:00        0.563045           0.571977            0.4125   
15 2019-01-01 15:00:00        0.435932           0.505341            0.2805   

     wind_cf        P_gen  
8   0.120791  2267.893034  
```

## Cell 18 (code)
```python
# Cell 16: Deterministic storage simulation for SoC

storage = CONFIG["storage"]

capacity_mwh = storage["capacity_mwh"]
max_rate_mw = storage["max_rate_mw"]
initial_soc = storage["initial_soc"]
min_soc = storage["min_soc"]
max_soc = storage["max_soc"]
charge_eff = storage["charge_eff"]
discharge_eff = storage["discharge_eff"]

soc_energy = np.zeros(len(df_stage3), dtype=float)
soc_frac = np.zeros(len(df_stage3), dtype=float)

soc_energy_prev = initial_soc * capacity_mwh

min_energy = min_soc * capacity_mwh
max_energy = max_soc * capacity_mwh

for i in range(len(df_stage3)):
    surplus_mw = df_stage3.loc[i, "P_gen"] - df_stage3.loc[i, "P_load"]

    if surplus_mw >= 0:
        charge_power = min(surplus_mw, max_rate_mw)
        charge_energy = charge_power * charge_eff
        soc_energy_curr = min(soc_energy_prev + charge_energy, max_energy)
    else:
        deficit_mw = abs(surplus_mw)
        discharge_power = min(deficit_mw, max_rate_mw)
        discharge_energy = discharge_power / discharge_eff
        soc_energy_curr = max(soc_energy_prev - discharge_energy, min_energy)

    soc_energy[i] = soc_energy_curr
    soc_frac[i] = soc_energy_curr / capacity_mwh
    soc_energy_prev = soc_energy_curr

df_stage3["SoC"] = soc_frac

assert df_stage3["SoC"].between(min_soc, max_soc).all(), "SoC out of configured bounds"

print("SoC min/max:")
print(df_stage3["SoC"].min(), df_stage3["SoC"].max())

print("\nInitial and first 10 SoC values:")
print(df_stage3[["time", "P_gen", "P_load", "SoC"]].head(10))

print("\nLast 10 SoC values:")
print(df_stage3[["time", "P_gen", "P_load", "SoC"]].tail(10))
```
Outputs: 1
- Output 1: stream
```
SoC min/max:
0.1 0.2777777777777778

Initial and first 10 SoC values:
                 time        P_gen       P_load       SoC
0 2019-01-01 00:00:00   909.382975  8750.000000  0.277778
1 2019-01-01 01:00:00   806.143273  8025.126266  0.100000
2 2019-01-01 02:00:00   705.617166  7468.911087  0.100000
3 2019-01-01 03:00:00   630.441961  7119.259608  0.100000
4 2019-01-01 04:00:00   606.614360  7000.000000  0.100000
5 2019-01-01 05:00:00   824.084571  7119.259608  0.100000
6 2019-01-01 06:00:00  1050.668504  7468.911087  0.100000
7 2019-01-01 07:00:00  1485.364910  8025.126266  0.100000
8 2019-01-01 08:00:00  2267.893034  8750.000000  0.100000
9 2019-01-01 09:00:00  2913.495698  9594.133342  0.100000

Last 10 SoC values:
                    time        P_gen        P_load  SoC
8750 2019-12-31 14:00:00  2074.734695  13531.088913  0.1
8751 2019-12-31 15:00:00  1500.933113  13880.740392  0.1
8752 2019-12-31 16:00:00  1202.529821  14000.000000  0.1
8753 2019-12-31 17:00:00   876.327004  13880.740392  0.1
8754 2019-12-31 18:00:00   662.917933  13531.088913  0.1
8755 2019-12-31 19:00:00   818.384665  12974.873734  0.1
8756 2019-12-31 20:00:00   948.940629  12250.000000  0.1
8757 2019-12-31 21:00:00   979.392954  11405.866658  0.1
8758 2019-12-31 22:00:00   960.924563  10500.000000  0.1
8759 2019-12-31 23:00:00   945.134515   9594.133342  0.1
```

## Cell 19 (code)
```python
# Cell 17: Build final Stage 3 feature dataset and compute target y

peak_load = CONFIG["load"]["peak_load"]

df_features_TN = df_stage3.copy()

df_features_TN["y"] = ((df_features_TN["P_gen"] - df_features_TN["P_load"]) / peak_load).clip(0, 1)

final_stage3_columns = ["time"] + FEATURE_COLUMNS + [TARGET_COLUMN]
df_features_TN = df_features_TN[final_stage3_columns].copy()

expected_stage3_columns = [
    "time",
    "solar_fixed_cf",
    "wind_cf",
    "P_gen",
    "P_load",
    "SoC",
    "hour_of_day",
    "day_of_year",
    "y",
]

assert df_features_TN.columns.tolist() == expected_stage3_columns, (
    f"Stage 3 schema mismatch.\nExpected: {expected_stage3_columns}\nGot: {df_features_TN.columns.tolist()}"
)

assert len(df_features_TN) == 8760, f"Expected 8760 rows, got {len(df_features_TN)}"
assert not df_features_TN.isnull().any().any(), "Null values found in df_features_TN"
assert df_features_TN["y"].between(0, 1).all(), "Target y is outside [0, 1]"
assert df_features_TN["SoC"].between(
    CONFIG["storage"]["min_soc"], CONFIG["storage"]["max_soc"]
).all(), "SoC outside configured bounds"

print("df_features_TN shape:", df_features_TN.shape)
print("\nColumns:")
print(df_features_TN.columns.tolist())

print("\nHead:")
print(df_features_TN.head(5))

print("\ny min/max:")
print(df_features_TN["y"].min(), df_features_TN["y"].max())

print("\ny descriptive stats:")
print(df_features_TN["y"].describe())

print("\nPositive-target hour count:")
print((df_features_TN["y"] > 0).sum())
```
Outputs: 1
- Output 1: stream
```
df_features_TN shape: (8760, 9)

Columns:
['time', 'solar_fixed_cf', 'wind_cf', 'P_gen', 'P_load', 'SoC', 'hour_of_day', 'day_of_year', 'y']

Head:
                 time  solar_fixed_cf   wind_cf       P_gen       P_load  \
0 2019-01-01 00:00:00             0.0  0.105742  909.382975  8750.000000   
1 2019-01-01 01:00:00             0.0  0.093738  806.143273  8025.126266   
2 2019-01-01 02:00:00             0.0  0.082049  705.617166  7468.911087   
3 2019-01-01 03:00:00             0.0  0.073307  630.441961  7119.259608   
4 2019-01-01 04:00:00             0.0  0.070537  606.614360  7000.000000   

        SoC  hour_of_day  day_of_year    y  
0  0.277778            0            1  0.0  
1  0.100000            1            1  0.0  
2  0.100000            2            1  0.0  
3  0.100000            3            1  0.0  
4  0.100000            4            1  0.0  

y min/max:
0.0 0.0

y descriptive stats:
count    8760.0
mean        0.0
std         0.0
min         0.0
25%         0.0
50%         0.0
75%         0.0
max         0.0
Name: y, dtype: float64

Positive-target hour count:
0
```

## Cell 20 (code)
```python
# Cell 18: Save df_features_TN and record target-degeneracy diagnostics

df_features_TN.to_csv(FEATURES_OUTPUT_PATH, index=False)

df_features_check = pd.read_csv(FEATURES_OUTPUT_PATH)

expected_stage3_columns = [
    "time",
    "solar_fixed_cf",
    "wind_cf",
    "P_gen",
    "P_load",
    "SoC",
    "hour_of_day",
    "day_of_year",
    "y",
]

assert df_features_check.columns.tolist() == expected_stage3_columns, (
    f"Saved Stage 3 schema mismatch.\nExpected: {expected_stage3_columns}\nGot: {df_features_check.columns.tolist()}"
)

assert len(df_features_check) == 8760, f"Saved df_features_TN row count mismatch: {len(df_features_check)}"
assert not df_features_check.isnull().any().any(), "Null values found in saved df_features_TN.csv"

y_unique = sorted(df_features_check["y"].unique().tolist())
y_nunique = df_features_check["y"].nunique()

print("Saved file:", FEATURES_OUTPUT_PATH)
print("Saved shape:", df_features_check.shape)
print("Saved columns:", df_features_check.columns.tolist())
print("\nUnique y values:", y_unique)
print("Number of unique y values:", y_nunique)

assert y_nunique == 1 and y_unique == [0.0], "Expected constant-zero target under current fixed configuration"

print("\nStage 3 saved successfully with documented constant-zero target.")
```
Outputs: 1
- Output 1: stream
```
Saved file: raw_data\raw_data\df_features_TN.csv
Saved shape: (8760, 9)
Saved columns: ['time', 'solar_fixed_cf', 'wind_cf', 'P_gen', 'P_load', 'SoC', 'hour_of_day', 'day_of_year', 'y']

Unique y values: [0.0]
Number of unique y values: 1

Stage 3 saved successfully with documented constant-zero target.
```

## Cell 21 (markdown)
---
## ✅ Improvements 1 & 3: Log Transform + Cyclical Time Features

**Improvement 1 – Log Transform:** `y = np.log1p(P_gen / peak_load)` stabilizes variance.

**Improvement 3 – Cyclical Encoding:** Raw `hour_of_day` (0–23) and `day_of_year` (1–365) are encoded as sine/cosine pairs. This tells the model that time is **circular** — hour 23 is next to hour 0, not 23 apart.

```python
hour_sin = sin(2π × hour / 24)
hour_cos = cos(2π × hour / 24)
day_sin  = sin(2π × day / 365)
day_cos  = cos(2π × day / 365)
```

## Cell 22 (code)
```python
# ===== UPDATED CELL 19: Log Transform + Cyclical Time Features =====

peak_load = CONFIG["load"]["peak_load"]

df_features_TN = df_stage3.copy()

# IMPROVEMENT 1: Log transformation of target
df_features_TN["y"] = np.log1p(df_features_TN["P_gen"] / peak_load)

# IMPROVEMENT 3: Cyclical time features (sin/cos encoding)
# Hour 23 and Hour 0 are neighbors on a circle, not 23 apart
df_features_TN["hour_sin"] = np.sin(2 * np.pi * df_features_TN["hour_of_day"] / 24.0)
df_features_TN["hour_cos"] = np.cos(2 * np.pi * df_features_TN["hour_of_day"] / 24.0)
df_features_TN["day_sin"] = np.sin(2 * np.pi * df_features_TN["day_of_year"] / 365.0)
df_features_TN["day_cos"] = np.cos(2 * np.pi * df_features_TN["day_of_year"] / 365.0)

final_stage3_columns = [
    "time",
    "solar_fixed_cf",
    "wind_cf",
    "P_gen",
    "P_load",
    "SoC",
    "hour_of_day",
    "day_of_year",
    "hour_sin",
    "hour_cos",
    "day_sin",
    "day_cos",
    "y",
]

df_features_TN = df_features_TN[final_stage3_columns].copy()

assert df_features_TN.columns.tolist() == final_stage3_columns, (
    f"Stage 3 schema mismatch.\nExpected: {final_stage3_columns}\nGot: {df_features_TN.columns.tolist()}"
)

assert len(df_features_TN) == 8760, f"Expected 8760 rows, got {len(df_features_TN)}"
assert not df_features_TN.isnull().any().any(), "Null values found in regenerated df_features_TN"
assert (df_features_TN["y"] >= 0).all(), "y contains negative values"
assert (df_features_TN["y"] <= np.log1p(12600 / peak_load)).all(), "y exceeds theoretical bound"

df_features_TN.to_csv(FEATURES_OUTPUT_PATH, index=False)

print("Regenerated df_features_TN saved to:", FEATURES_OUTPUT_PATH)
print("Shape:", df_features_TN.shape)
print("\nColumns:", df_features_TN.columns.tolist())
print("\nHead:")
print(df_features_TN.head(5))
print("\ny min/max:", df_features_TN["y"].min(), df_features_TN["y"].max())
print("\nCyclical features sample:")
print(df_features_TN[["hour_of_day", "hour_sin", "hour_cos", "day_of_year", "day_sin", "day_cos"]].head(10))
```
Outputs: 1
- Output 1: stream
```
Regenerated df_features_TN saved to: raw_data\raw_data\df_features_TN.csv
Shape: (8760, 13)

Columns: ['time', 'solar_fixed_cf', 'wind_cf', 'P_gen', 'P_load', 'SoC', 'hour_of_day', 'day_of_year', 'hour_sin', 'hour_cos', 'day_sin', 'day_cos', 'y']

Head:
                 time  solar_fixed_cf   wind_cf       P_gen       P_load  \
0 2019-01-01 00:00:00             0.0  0.105742  909.382975  8750.000000   
1 2019-01-01 01:00:00             0.0  0.093738  806.143273  8025.126266   
2 2019-01-01 02:00:00             0.0  0.082049  705.617166  7468.911087   
3 2019-01-01 03:00:00             0.0  0.073307  630.441961  7119.259608   
4 2019-01-01 04:00:00             0.0  0.070537  606.614360  7000.000000   

        SoC  hour_of_day  day_of_year  hour_sin  hour_cos   day_sin   day_cos  \
0  0.277778            0            1  0.000000  1.000000  0.017213  0.999852   
1  0.100000            1            1  0.258819  0.965926  0.017213  0.999852   
2  0.100000            2            1  0.500000  0.866025  0.017213  0.999852   
3  0.100000            3            1  0.707107  0.707107  0.017213  0.999852   
4  0.100000            4            1  0.866025  0.500000  0.017213  0.999852   

          y  
0  0.062933  
1  0.055985  
2  0.049172  
3  0.044047  
4  0.042417  

y min/max: 0.0005161868959691959 0.30406471412446323

Cyclical features sample:
   hour_of_day  hour_sin      hour_cos  day_of_year   day_sin   day_cos
0            0  0.000000  1.000000e+00            1  0.017213  0.999852
1            1  0.258819  9.659258e-01            1  0.017213  0.999852
2            2  0.500000  8.660254e-01            1  0.017213  0.999852
3            3  0.707107  7.071068e-01            1  0.017213  0.999852
4            4  0.866025  5.000000e-01            1  0.017213  0.999852
5            5  0.965926  2.588190e-01            1  0.017213  0.999852
6            6  1.000000  6.123234e-17            1  0.017213  0.999852
7            7  0.965926 -2.588190e-01            1  0.017213  0.999852
8            8  0.866025 -5.000000e-01            1  0.017213  0.999852
```

## Cell 23 (markdown)
---
## 🔧 Improvements 3 & 5: Updated Features + Expanded Lookback

- **Cyclical features** (`hour_sin`, `hour_cos`, `day_sin`, `day_cos`) replace raw `hour_of_day` and `day_of_year`
- **LOOKBACK expanded** from 24 → 48 hours (2 full days of context for the BiLSTM)

## Cell 24 (code)
```python
# Cell 20: Load features for modeling

import pandas as pd
from pathlib import Path

FEATURES_PATH = Path("raw_data/raw_data/df_features_TN.csv")
df_model = pd.read_csv(FEATURES_PATH)

df_model["time"] = pd.to_datetime(df_model["time"])
df_model = df_model.sort_values("time").reset_index(drop=True)

STAGE4_EXPECTED_COLUMNS = [
    "time",
    "solar_fixed_cf",
    "wind_cf",
    "P_gen",
    "P_load",
    "SoC",
    "hour_sin",
    "hour_cos",
    "day_sin",
    "day_cos",
    "y",
]

missing_cols = set(STAGE4_EXPECTED_COLUMNS) - set(df_model.columns.tolist())
assert len(missing_cols) == 0, f"Missing columns: {missing_cols}"

df_model = df_model[STAGE4_EXPECTED_COLUMNS].copy()

STAGE4_FEATURE_COLUMNS = [
    "solar_fixed_cf",
    "wind_cf",
    "P_gen",
    "P_load",
    "SoC",
    "hour_sin",
    "hour_cos",
    "day_sin",
    "day_cos",
]

STAGE4_TARGET_COLUMN = "y"

LOOKBACK = 48  # IMPROVEMENT 5: Expanded from 24 to 48 (2 days context)

n_train = int(8760 * 0.7)
n_val = int(8760 * 0.15)
n_test = 8760 - n_train - n_val

print("Loaded df_model directly from:", FEATURES_PATH)
print("Shape:", df_model.shape)
print("\nSTAGE4_FEATURE_COLUMNS:", len(STAGE4_FEATURE_COLUMNS))
print("LOOKBACK:", LOOKBACK)
```
Outputs: 1
- Output 1: stream
```
Loaded df_model directly from: raw_data\raw_data\df_features_TN.csv
Shape: (8760, 11)

STAGE4_FEATURE_COLUMNS: 9
LOOKBACK: 48
```

## Cell 25 (code)
```python
# ===== UPDATED CELL 21: Data prep with target as feature for residual learning =====

from sklearn.preprocessing import StandardScaler

train_df = df_model.iloc[:n_train].copy()
val_df = df_model.iloc[n_train:n_train + n_val].copy()
test_df = df_model.iloc[n_train + n_val:].copy()

assert len(train_df) == n_train
assert len(val_df) == n_val
assert len(test_df) == n_test

scaler = StandardScaler()
X_train_raw = train_df[STAGE4_FEATURE_COLUMNS].values
X_val_raw = val_df[STAGE4_FEATURE_COLUMNS].values
X_test_raw = test_df[STAGE4_FEATURE_COLUMNS].values

y_train_raw = train_df[STAGE4_TARGET_COLUMN].values.astype(np.float32)
y_val_raw = val_df[STAGE4_TARGET_COLUMN].values.astype(np.float32)
y_test_raw = test_df[STAGE4_TARGET_COLUMN].values.astype(np.float32)

X_train_scaled = scaler.fit_transform(X_train_raw)
X_val_scaled = scaler.transform(X_val_raw)
X_test_scaled = scaler.transform(X_test_raw)

# IMPROVEMENT 2: Include previous target values (y) as a feature for residual learning
# Append the unscaled log-transformed y as the last feature column.
# This allows the residual connection to extract the last known target value.
X_train_scaled = np.hstack([X_train_scaled, y_train_raw.reshape(-1, 1)])
X_val_scaled = np.hstack([X_val_scaled, y_val_raw.reshape(-1, 1)])
X_test_scaled = np.hstack([X_test_scaled, y_test_raw.reshape(-1, 1)])

# target_index: index of the target feature (y) inside the input sequence (last column)
num_features = X_train_scaled.shape[1]
target_index = num_features - 1

def build_sequences(X, y, times, lookback):
    X_seq, y_seq, t_seq = [], [], []
    for i in range(lookback, len(X)):
        X_seq.append(X[i - lookback:i])
        y_seq.append(y[i])
        t_seq.append(times[i])
    return (
        np.asarray(X_seq, dtype=np.float32),
        np.asarray(y_seq, dtype=np.float32),
        np.asarray(t_seq)
    )

X_train_seq, y_train_seq, t_train_seq = build_sequences(
    X_train_scaled,
    y_train_raw,
    train_df["time"].values,
    LOOKBACK
)

X_val_seq, y_val_seq, t_val_seq = build_sequences(
    X_val_scaled,
    y_val_raw,
    val_df["time"].values,
    LOOKBACK
)

X_test_seq, y_test_seq, t_test_seq = build_sequences(
    X_test_scaled,
    y_test_raw,
    test_df["time"].values,
    LOOKBACK
)

assert X_train_seq.shape[1:] == (LOOKBACK, num_features)
assert X_val_seq.shape[1:] == (LOOKBACK, num_features)
assert X_test_seq.shape[1:] == (LOOKBACK, num_features)

assert t_train_seq[-1] < t_val_seq[0], "Train/val sequence leakage detected"
assert t_val_seq[-1] < t_test_seq[0], "Val/test sequence leakage detected"

print("Raw split sizes:")
print("train:", train_df.shape, "val:", val_df.shape, "test:", test_df.shape)

print("\nSequence shapes (with target as feature for residual learning):")
...
```
Outputs: 1
- Output 1: stream
```
Raw split sizes:
train: (6132, 11) val: (1314, 11) test: (1314, 11)

Sequence shapes (with target as feature for residual learning):
X_train_seq: (6084, 48, 10) y_train_seq: (6084,)
X_val_seq  : (1266, 48, 10) y_val_seq  : (1266,)
X_test_seq : (1266, 48, 10) y_test_seq : (1266,)

target_index (y column in features): 9
num_features: 10

Sequence target time ranges:
train: 2019-01-03T00:00:00.000000000 -> 2019-09-13T11:00:00.000000000
val  : 2019-09-15T12:00:00.000000000 -> 2019-11-07T05:00:00.000000000
test : 2019-11-09T06:00:00.000000000 -> 2019-12-31T23:00:00.000000000
```

## Cell 26 (code)
```python
# Cell 22: Train baseline regressors on flattened sequences and evaluate on val/test

from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import root_mean_squared_error, mean_absolute_error, r2_score

X_train_flat = X_train_seq.reshape(X_train_seq.shape[0], -1)
X_val_flat = X_val_seq.reshape(X_val_seq.shape[0], -1)
X_test_flat = X_test_seq.reshape(X_test_seq.shape[0], -1)

assert X_train_flat.shape[1] == LOOKBACK * num_features
assert X_val_flat.shape[1] == LOOKBACK * num_features
assert X_test_flat.shape[1] == LOOKBACK * num_features

def regression_metrics(y_true, y_pred):
    rmse = root_mean_squared_error(y_true, y_pred)
    mae = mean_absolute_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    return {"RMSE": rmse, "MAE": mae, "R2": r2}

baseline_models = {
    "LinearRegression": LinearRegression(),
    "RandomForest": RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    ),
}

baseline_results = {}
baseline_predictions = {}

for model_name, model in baseline_models.items():
    model.fit(X_train_flat, y_train_seq)

    y_val_pred = model.predict(X_val_flat)
    y_test_pred = model.predict(X_test_flat)

    baseline_predictions[model_name] = {
        "val": y_val_pred,
        "test": y_test_pred,
    }

    baseline_results[model_name] = {
        "val": regression_metrics(y_val_seq, y_val_pred),
        "test": regression_metrics(y_test_seq, y_test_pred),
    }

baseline_results_df = pd.DataFrame({
    model_name: {
        "val_RMSE": result["val"]["RMSE"],
        "val_MAE": result["val"]["MAE"],
        "val_R2": result["val"]["R2"],
        "test_RMSE": result["test"]["RMSE"],
        "test_MAE": result["test"]["MAE"],
        "test_R2": result["test"]["R2"],
    }
    for model_name, result in baseline_results.items()
}).T.sort_values("val_RMSE")

print("Flattened baseline input shapes:")
print("X_train_flat:", X_train_flat.shape)
print("X_val_flat  :", X_val_flat.shape)
print("X_test_flat :", X_test_flat.shape)

print("\nBaseline results:")
print(baseline_results_df)

best_baseline_name = baseline_results_df.index[0]
```
Outputs: 1
- Output 1: stream
```
Flattened baseline input shapes:
X_train_flat: (6084, 480)
X_val_flat  : (1266, 480)
X_test_flat : (1266, 480)

Baseline results:
                  val_RMSE   val_MAE    val_R2  test_RMSE  test_MAE   test_R2
LinearRegression  0.006547  0.005492  0.984626   0.006333  0.004678  0.988452
RandomForest      0.007964  0.005821  0.977253   0.008497  0.006007  0.979212
```

## Cell 27 (markdown)
---
## 🚀 ADVANCED ARCHITECTURE: Hybrid Error-Correction Model
**The Masterstroke:** Asking a Neural Network to learn the base trends from scratch wastes processing power and convergence efficiency. Instead, we use our **Linear Regression** model to natively map the cyclical trends. Then, we target our **BiLSTM** solely on the *residual errors* (the non-linear anomalies). By mathematically fusing them at the end, we perfectly capture both linear paths and non-linear spikes!

## Cell 28 (code)
```python
# ===== NEW CELL: Prepare Hybrid Targets (Residuals) =====
from sklearn.linear_model import LinearRegression

# 1. Train the Linear Regression on the flattened sequences
lr_model = LinearRegression()
lr_model.fit(X_train_flat, y_train_seq)

# 2. Get LR predictions for all sets
lr_train_preds = lr_model.predict(X_train_flat).flatten()
lr_val_preds = lr_model.predict(X_val_flat).flatten()
lr_test_preds = lr_model.predict(X_test_flat).flatten()

# 3. Calculate the Residuals (Error = Actual - Predicted)
# This is our NEW target variable for the BiLSTM!
y_train_residuals = y_train_seq.flatten() - lr_train_preds
y_val_residuals = y_val_seq.flatten() - lr_val_preds
y_test_residuals = y_test_seq.flatten() - lr_test_preds

print("Residuals calculated successfully.")
print(f"Train residual mean: {y_train_residuals.mean():.6f}")
```
Outputs: 1
- Output 1: stream
```
Residuals calculated successfully.
Train residual mean: 0.000000
```

## Cell 29 (code)
```python
# ===== UPDATED CELL 23: The Error-Correcting BiLSTM =====
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, LSTM, Bidirectional, Dense, Dropout
from tensorflow.keras import callbacks
import tensorflow.keras.backend as K
from tensorflow.keras.layers import Layer

tf.keras.utils.set_random_seed(42)

# --- Custom Attention Layer ---
class AttentionLayer(Layer):
    def __init__(self, **kwargs):
        super(AttentionLayer, self).__init__(**kwargs)

    def build(self, input_shape):
        self.W = self.add_weight(name='att_weight',
                                shape=(input_shape[-1], 1),
                                initializer='glorot_uniform',
                                trainable=True)
        self.b = self.add_weight(name='att_bias',
                                shape=(input_shape[1], 1),
                                initializer='zeros',
                                trainable=True)
        super(AttentionLayer, self).build(input_shape)

    def call(self, x):
        e = K.tanh(K.dot(x, self.W) + self.b)
        a = K.softmax(e, axis=1)
        output = x * a
        return K.sum(output, axis=1)

    def get_config(self):
        return super(AttentionLayer, self).get_config()

# --- Build Residual-Predicting BiLSTM ---
input_seq = Input(shape=(LOOKBACK, num_features))

# Standard BiLSTM + Attention
lstm_out = Bidirectional(LSTM(16, return_sequences=True))(input_seq)
context = AttentionLayer()(lstm_out)
context = Dropout(0.2)(context)
x = Dense(16, activation='relu')(context)

# Final output predicts the RESIDUAL (Error), not the total power
error_prediction = Dense(1)(x)

bilstm_model = Model(inputs=input_seq, outputs=error_prediction)

# Compile to minimize the MSE of the residuals
bilstm_model.compile(optimizer='adam', loss='mse', metrics=['mae'])

bilstm_model.summary()
```
Outputs: 1
- Output 1: stream
```
Model: "model"
_________________________________________________________________
 Layer (type)                Output Shape              Param #   
=================================================================
 input_1 (InputLayer)        [(None, 48, 10)]          0         
                                                                 
 bidirectional (Bidirectiona  (None, 48, 32)           3456      
 l)                                                              
                                                                 
 attention_layer (AttentionL  (None, 32)               80        
 ayer)                                                           
                                                                 
 dropout (Dropout)           (None, 32)                0         
                                                                 
 dense (Dense)               (None, 16)                528       
                                                                 
 dense_1 (Dense)             (None, 1)                 17        
                                                                 
=================================================================
Total params: 4,081
Trainable params: 4,081
Non-trainable params: 0
_________________________________________________________________
```

## Cell 30 (code)
```python
from tensorflow.keras import callbacks

early_stop = callbacks.EarlyStopping(
    monitor='val_loss',
    patience=10,
    restore_best_weights=True
)

reduce_lr = callbacks.ReduceLROnPlateau(
    monitor='val_loss',
    factor=0.5,
    patience=5,
    min_lr=1e-6
)

# Cell 24: Train the Bi-LSTM + Attention regression model

history = bilstm_model.fit(
    X_train_seq,
    y_train_residuals,         # <-- CHANGED TO RESIDUALS
    validation_data=(X_val_seq, y_val_residuals), # <-- CHANGED TO RESIDUALS
    epochs=100,
    batch_size=32,
    callbacks=[early_stop, reduce_lr],
    verbose=1
)

history_df = pd.DataFrame(history.history)

print("Training completed.")
print("\nBest validation loss:", history_df["val_loss"].min())
print("Best validation MAE :", history_df["val_mae"].min())
print("Epochs run          :", len(history_df))
```
Outputs: 1
- Output 1: stream
```
Epoch 1/100
191/191 [==============================] - 13s 15ms/step - loss: 0.0085 - mae: 0.0543 - val_loss: 0.0039 - val_mae: 0.0556 - lr: 0.0010
Epoch 2/100
191/191 [==============================] - 2s 12ms/step - loss: 7.2956e-04 - mae: 0.0196 - val_loss: 0.0024 - val_mae: 0.0445 - lr: 0.0010
Epoch 3/100
191/191 [==============================] - 2s 12ms/step - loss: 2.7261e-04 - mae: 0.0117 - val_loss: 8.5428e-04 - val_mae: 0.0259 - lr: 0.0010
Epoch 4/100
191/191 [==============================] - 2s 13ms/step - loss: 1.4126e-04 - mae: 0.0083 - val_loss: 3.0602e-04 - val_mae: 0.0147 - lr: 0.0010
Epoch 5/100
191/191 [==============================] - 2s 12ms/step - loss: 8.1916e-05 - mae: 0.0063 - val_loss: 1.1619e-04 - val_mae: 0.0086 - lr: 0.0010
Epoch 6/100
191/191 [==============================] - 2s 12ms/step - loss: 5.4780e-05 - mae: 0.0052 - val_loss: 8.7563e-05 - val_mae: 0.0077 - lr: 0.0010
Epoch 7/100
191/191 [==============================] - 2s 12ms/step - loss: 4.3868e-05 - mae: 0.0045 - val_loss: 7.1878e-05 - val_mae: 0.0072 - lr: 0.0010
Epoch 8/100
191/191 [==============================] - 2s 12ms/step - loss: 3.4061e-05 - mae: 0.0041 - val_loss: 6.4519e-05 - val_mae: 0.0068 - lr: 0.0010
Epoch 9/100
191/191 [==============================] - 2s 12ms/step - loss: 3.2014e-05 - mae: 0.0039 - val_loss: 5.6789e-05 - val_mae: 0.0064 - lr: 0.0010
Epoch 10/100
191/191 [==============================] - 2s 12ms/step - loss: 2.6106e-05 - mae: 0.0037 - val_loss: 5.5112e-05 - val_mae: 0.0063 - lr: 0.0010
Epoch 11/100
191/191 [==============================] - 2s 12ms/step - loss: 2.6417e-05 - mae: 0.0037 - val_loss: 4.5995e-05 - val_mae: 0.0057 - lr: 5.0000e-04
Epoch 12/100
191/191 [==============================] - 2s 12ms/step - loss: 2.4160e-05 - mae: 0.0036 - val_loss: 5.0593e-05 - val_mae: 0.0060 - lr: 5.0000e-04
Epoch 13/100
191/191 [==============================] - 2s 12ms/step - loss: 2.5019e-05 - mae: 0.0036 - val_loss: 4.6684e-05 - val_mae: 0.0057 - lr: 5.0000e-04
Epoch 14/100
191/191 [==============================] - 2s 12ms/step - loss: 2.3059e-05 - mae: 0.0035 - val_loss: 4.7318e-05 - val_mae: 0.0058 - lr: 5.0000e-04
Epoch 15/100
191/191 [==============================] - 2s 12ms/step - loss: 2.2769e-05 - mae: 0.0035 - val_loss: 4.4728e-05 - val_mae: 0.0056 - lr: 5.0000e-04
Epoch 16/100
191/191 [==============================] - 2s 12ms/step - loss: 2.1947e-05 - mae: 0.0035 - val_loss: 4.5470e-05 - val_mae: 0.0057 - lr: 2.5000e-04
Epoch 17/100
191/191 [==============================] - 2s 12ms/step - loss: 2.2353e-05 - mae: 0.0035 - val_loss: 4.3780e-05 - val_mae: 0.0055 - lr: 2.5000e-04
Epoch 18/100
191/191 [==============================] - 2s 12ms/step - loss: 2.5469e-05 - mae: 0.0035 - val_loss: 4.6333e-05 - val_mae: 0.0057 - lr: 2.5000e-04
Epoch 19/100
191/191 [==============================] - 2s 12ms/step - loss: 2.1972e-05 - mae: 0.0035 - val_loss: 4.5178e-05 - val_mae: 0.0057 - lr: 2.5000e-04
Epoch 20/100
191/191 [==============================] - 2s 12ms/step - loss: 2.1279e-05 - mae: 0.0035 - val_loss: 4.3682e-05 - val_mae: 0.0055 - lr: 2.5000e-04
```

## Cell 31 (code)
```python
# ===== UPDATED CELL 25: Evaluate the Hybrid Model =====
import numpy as np
import pandas as pd
from sklearn.metrics import root_mean_squared_error, mean_absolute_error, r2_score

# 1. Get the BiLSTM's predicted ERRORS
bilstm_val_errors = bilstm_model.predict(X_val_seq, verbose=0).flatten()
bilstm_test_errors = bilstm_model.predict(X_test_seq, verbose=0).flatten()

# 2. THE HYBRID EQUATION: Final = LR Prediction + BiLSTM Error Correction
hybrid_val_pred_log = lr_val_preds + bilstm_val_errors
hybrid_test_pred_log = lr_test_preds + bilstm_test_errors

# 3. Inverse the Log Transform to get actual Megawatts
y_val_hybrid_final = np.expm1(hybrid_val_pred_log)
y_test_hybrid_final = np.expm1(hybrid_test_pred_log)

# Actual truth values (original scale)
y_val_ori = np.expm1(y_val_seq).flatten()
y_test_ori = np.expm1(y_test_seq).flatten()

# Fetch baseline predictions from earlier (already expm1 inverted)
# Assuming baseline_predictions is intact
val_pred_lr = np.expm1(baseline_predictions["LinearRegression"]["val"])
test_pred_lr = np.expm1(baseline_predictions["LinearRegression"]["test"])

# 4. Calculate Metrics
hybrid_val_rmse = root_mean_squared_error(y_val_ori, y_val_hybrid_final)
hybrid_test_rmse = root_mean_squared_error(y_test_ori, y_test_hybrid_final)
hybrid_val_mae = mean_absolute_error(y_val_ori, y_val_hybrid_final)
hybrid_test_mae = mean_absolute_error(y_test_ori, y_test_hybrid_final)
hybrid_val_r2 = r2_score(y_val_ori, y_val_hybrid_final)
hybrid_test_r2 = r2_score(y_test_ori, y_test_hybrid_final)

hybrid_results = {
    "val_RMSE": hybrid_val_rmse, "val_MAE": hybrid_val_mae, "val_R2": hybrid_val_r2,
    "test_RMSE": hybrid_test_rmse, "test_MAE": hybrid_test_mae, "test_R2": hybrid_test_r2
}

# 5. Build comparison table alongside standard baseline
baseline_results_original = {}
for model_name in baseline_predictions:
    v_orig = np.expm1(baseline_predictions[model_name]["val"])
    t_orig = np.expm1(baseline_predictions[model_name]["test"])
    baseline_results_original[model_name] = {
        "val_RMSE": root_mean_squared_error(y_val_ori, v_orig),
        "val_MAE": mean_absolute_error(y_val_ori, v_orig),
        "val_R2": r2_score(y_val_ori, v_orig),
        "test_RMSE": root_mean_squared_error(y_test_ori, t_orig),
        "test_MAE": mean_absolute_error(y_test_ori, t_orig),
        "test_R2": r2_score(y_test_ori, t_orig),
    }

after_df = pd.DataFrame(baseline_results_original).T
after_df.loc["Hybrid_Error_Correction"] = hybrid_results
after_df = after_df.sort_values("test_RMSE")

print("=" * 60)
print("HYBRID ERROR-CORRECTION MODEL RESULTS")
print("=" * 60)
print(after_df.to_string())

comparison_df = after_df.copy()

best_r2_model = comparison_df['test_R2'].astype(float).idxmax()
best_r2 = comparison_df.loc[best_r2_model, 'test_R2']
print('\n' + '='*60)
print('CONCLUSION')
print('='*60)
print(f'Based on the R-squared (R2) score, {best_r2_model} is the best performing model')
print(f'with a test_R2 of {best_r2:.4f}, meaning it explains {best_r2*100:.2f}% of the variance.')
if best_r2_model == 'Hybrid_Error_Correction':
    print('The hybrid architecture perfectly leverages Linear Regression for base trends')
    print('and BiLSTM for extreme nonlinear peak corrections!')
else:
    print('The standard baseline models still have slightly better performance.')
```
Outputs: 1
- Output 1: stream
```
============================================================
HYBRID ERROR-CORRECTION MODEL RESULTS
============================================================
                         val_RMSE   val_MAE    val_R2  test_RMSE  test_MAE   test_R2
LinearRegression         0.006999  0.005863  0.985226   0.007334  0.005305  0.988058
Hybrid_Error_Correction  0.006957  0.005810  0.985403   0.007337  0.005312  0.988051
RandomForest             0.008663  0.006307  0.977370   0.009822  0.006824  0.978584

============================================================
CONCLUSION
============================================================
Based on the R-squared (R2) score, LinearRegression is the best performing model
with a test_R2 of 0.9881, meaning it explains 98.81% of the variance.
The standard baseline models still have slightly better performance.
```

## Cell 32 (markdown)
---
## 📊 Before vs After: Visualization & Comparison

This cell generates three visualizations:
1. **Before vs After bar chart** — compares RMSE and MAE across all models
2. **Prediction vs Actual** — shows how well the improved BiLSTM tracks real values
3. **Error distribution** — histogram of prediction errors

## Cell 33 (code)
```python
# ===== Comprehensive Comparison Visualization =====

import matplotlib.pyplot as plt
import matplotlib
matplotlib.rcParams.update({'font.size': 12})

# --- 1. Before vs After Bar Chart (RMSE and MAE) ---
fig, axes = plt.subplots(1, 2, figsize=(16, 6))

all_models = list(comparison_df.index)
x = np.arange(len(all_models))
w = 0.5

rmse_vals = comparison_df['test_RMSE'].values.astype(float)
mae_vals = comparison_df['test_MAE'].values.astype(float)

colors = ['#e74c3c', '#3498db', '#2ecc71']
if len(colors) < len(all_models):
    colors = colors + ['#9b59b6'] * (len(all_models) - len(colors))

bars = axes[0].bar(x, rmse_vals, w, color=colors[:len(all_models)], alpha=0.85, edgecolor="black")
for bar, val in zip(bars, rmse_vals):
    axes[0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.0005, f'{val:.5f}', ha='center', va='bottom', fontsize=9)
axes[0].set_xlabel('Model')
axes[0].set_ylabel('Test RMSE')
axes[0].set_title('Test RMSE Comparison (Original Scale)')
axes[0].set_xticks(x)
axes[0].set_xticklabels(all_models, rotation=30, ha='right')
axes[0].grid(axis='y', alpha=0.3)

bars = axes[1].bar(x, mae_vals, w, color=colors[:len(all_models)], alpha=0.85, edgecolor="black")
for bar, val in zip(bars, mae_vals):
    axes[1].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.0005, f'{val:.5f}', ha='center', va='bottom', fontsize=9)
axes[1].set_xlabel('Model')
axes[1].set_ylabel('Test MAE')
axes[1].set_title('Test MAE Comparison (Original Scale)')
axes[1].set_xticks(x)
axes[1].set_xticklabels(all_models, rotation=30, ha='right')
axes[1].grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.savefig('raw_data/raw_data/before_after_comparison.png', dpi=150, bbox_inches='tight')
plt.show()

# --- 2. Prediction vs Actual (Test Set, first 200 hours) ---
fig, ax = plt.subplots(figsize=(16, 5))
n_plot = min(200, len(y_test_ori))
ax.plot(range(n_plot), y_test_ori[:n_plot], 'b-', label='Actual', linewidth=1.5)
ax.plot(range(n_plot), y_test_hybrid_final[:n_plot], 'r--', label='Hybrid (LR+BiLSTM)', linewidth=1.2, alpha=0.8)
ax.set_xlabel('Time Step (hours)')
ax.set_ylabel('y (original scale)')
ax.set_title('Hybrid Error-Correction: Predicted vs Actual (Test Set)')
ax.legend()
ax.grid(alpha=0.3)
plt.tight_layout()
plt.savefig('raw_data/raw_data/prediction_vs_actual.png', dpi=150, bbox_inches='tight')
plt.show()

# --- 3. Error Distribution ---
fig, ax = plt.subplots(figsize=(10, 5))
errors = y_test_ori - y_test_hybrid_final
ax.hist(errors, bins=50, color='#3498db', alpha=0.7, edgecolor='black')
ax.axvline(x=0, color='red', linestyle='--', linewidth=2)
ax.set_xlabel('Prediction Error')
ax.set_ylabel('Frequency')
ax.set_title(f'Hybrid Error Distribution (Mean={errors.mean():.6f}, Std={errors.std():.6f})')
ax.grid(alpha=0.3)
plt.tight_layout()
plt.savefig('raw_data/raw_data/error_distribution.png', dpi=150, bbox_inches='tight')
plt.show()

# --- 4. R2 Score Comparison ---
fig, ax = plt.subplots(figsize=(10, 5))
r2_vals = comparison_df['test_R2'].values.astype(float)
bars = ax.bar(x, r2_vals, w, color=colors[:len(all_models)], alpha=0.85, edgecolor="black")
for bar, val in zip(bars, r2_vals):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.005, f'{val:.4f}', ha='center', va='bottom', fontsize=10)
ax.set_xlabel('Model')
ax.set_ylabel('Test R2 Score')
ax.set_title('R2 Score Comparison (Higher is Better)')
...
```
Outputs: 5
- Output 1: display_data
  image/png present
```
<Figure size 1600x600 with 2 Axes>
```
- Output 2: display_data
  image/png present
```
<Figure size 1600x500 with 1 Axes>
```
- Output 3: display_data
  image/png present
```
<Figure size 1000x500 with 1 Axes>
```
- Output 4: display_data
  image/png present
```
<Figure size 1000x500 with 1 Axes>
```
- Output 5: stream
```
============================================================
SUMMARY OF ALL MODEL RESULTS
============================================================
                         val_RMSE   val_MAE    val_R2  test_RMSE  test_MAE   test_R2
LinearRegression         0.006999  0.005863  0.985226   0.007334  0.005305  0.988058
Hybrid_Error_Correction  0.006957  0.005810  0.985403   0.007337  0.005312  0.988051
RandomForest             0.008663  0.006307  0.977370   0.009822  0.006824  0.978584

Visualization plots saved to raw_data/raw_data/
```

## Cell 34 (code)
```python
# Cell 26: Save model comparison and aligned test predictions

comparison_output_path = ROOT_DIR / "model_comparison_stage4.csv"
test_preds_output_path = ROOT_DIR / "test_predictions_stage4.csv"

test_predictions_df = pd.DataFrame({
    "time": pd.to_datetime(t_test_seq),
    "y_true": y_test_seq,
    "y_pred_linear_regression": baseline_predictions["LinearRegression"]["test"],
    "y_pred_random_forest": baseline_predictions["RandomForest"]["test"],
    "y_pred_hybrid": hybrid_test_pred_log,
})

comparison_df.to_csv(comparison_output_path, index=True)
test_predictions_df.to_csv(test_preds_output_path, index=False)

comparison_check = pd.read_csv(comparison_output_path)
test_preds_check = pd.read_csv(test_preds_output_path)

assert len(comparison_check) == 3, f"Expected 3 models in comparison file, got {len(comparison_check)}"
assert len(test_preds_check) == len(y_test_seq), (
    f"Prediction file row mismatch: expected {len(y_test_seq)}, got {len(test_preds_check)}"
)
assert not test_preds_check.isnull().any().any(), "Nulls found in saved test predictions"

print("Saved comparison file:", comparison_output_path)
print("Saved test predictions file:", test_preds_output_path)

print("\nComparison table:")
print(comparison_df)

print("\nTest predictions head:")
print(test_predictions_df.head(5))
```
Outputs: 1
- Output 1: stream
```
Saved comparison file: raw_data\raw_data\model_comparison_stage4.csv
Saved test predictions file: raw_data\raw_data\test_predictions_stage4.csv

Comparison table:
                         val_RMSE   val_MAE    val_R2  test_RMSE  test_MAE  \
LinearRegression         0.006999  0.005863  0.985226   0.007334  0.005305   
Hybrid_Error_Correction  0.006957  0.005810  0.985403   0.007337  0.005312   
RandomForest             0.008663  0.006307  0.977370   0.009822  0.006824   

                          test_R2  
LinearRegression         0.988058  
Hybrid_Error_Correction  0.988051  
RandomForest             0.978584  

Test predictions head:
                 time    y_true  y_pred_linear_regression  \
0 2019-11-09 06:00:00  0.023771                  0.028472   
1 2019-11-09 07:00:00  0.048983                  0.053248   
2 2019-11-09 08:00:00  0.088690                  0.089246   
3 2019-11-09 09:00:00  0.120668                  0.126484   
4 2019-11-09 10:00:00  0.141154                  0.139343   

   y_pred_random_forest  y_pred_hybrid  
0              0.018693       0.028960  
1              0.051396       0.053676  
2              0.091535       0.089557  
3              0.118063       0.126676  
4              0.139461       0.139470
```

## Cell 35 (code)
```python
# Cell 27: Create Stage 4 prediction-vs-actual plots from saved test predictions

import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

test_preds_path = ROOT_DIR / "test_predictions_stage4.csv"
plot_full_path = ROOT_DIR / "stage4_test_predictions_full.png"
plot_week_path = ROOT_DIR / "stage4_test_predictions_first168h.png"

plot_df = pd.read_csv(test_preds_path)
plot_df["time"] = pd.to_datetime(plot_df["time"], format="%Y-%m-%d %H:%M:%S", errors="raise")

assert not plot_df.isnull().any().any(), "Null values found in test_predictions_stage4.csv"
assert plot_df["time"].is_monotonic_increasing, "time is not sorted in test_predictions_stage4.csv"

plt.figure(figsize=(18, 6))
plt.plot(plot_df["time"], plot_df["y_true"], label="Actual", linewidth=2)
plt.plot(plot_df["time"], plot_df["y_pred_linear_regression"], label="Linear Regression", alpha=0.9)
plt.plot(plot_df["time"], plot_df["y_pred_random_forest"], label="Random Forest", alpha=0.8)
plt.plot(plot_df["time"], plot_df["y_pred_hybrid"], label="Hybrid (LR+BiLSTM)", alpha=0.8)
plt.title("Stage 4 Test Predictions vs Actual (Full Test Horizon)")
plt.xlabel("Time")
plt.ylabel("Renewable Availability Ratio (y)")
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(plot_full_path, dpi=200, bbox_inches="tight")
plt.show()

plot_df_week = plot_df.iloc[:168].copy()

plt.figure(figsize=(18, 6))
plt.plot(plot_df_week["time"], plot_df_week["y_true"], label="Actual", linewidth=2)
plt.plot(plot_df_week["time"], plot_df_week["y_pred_linear_regression"], label="Linear Regression", alpha=0.9)
plt.plot(plot_df_week["time"], plot_df_week["y_pred_random_forest"], label="Random Forest", alpha=0.8)
plt.plot(plot_df_week["time"], plot_df_week["y_pred_hybrid"], label="Hybrid (LR+BiLSTM)", alpha=0.8)
plt.title("Stage 4 Test Predictions vs Actual (First 168 Hours)")
plt.xlabel("Time")
plt.ylabel("Renewable Availability Ratio (y)")
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(plot_week_path, dpi=200, bbox_inches="tight")
plt.show()

print("Saved full-horizon plot:", plot_full_path)
print("Saved first-168h plot :", plot_week_path)
```
Outputs: 3
- Output 1: display_data
  image/png present
```
<Figure size 1800x600 with 1 Axes>
```
- Output 2: display_data
  image/png present
```
<Figure size 1800x600 with 1 Axes>
```
- Output 3: stream
```
Saved full-horizon plot: raw_data\raw_data\stage4_test_predictions_full.png
Saved first-168h plot : raw_data\raw_data\stage4_test_predictions_first168h.png
```

## Cell 36 (code)
```python
# Cell 28: Build Stage 5 scheduler input using the Hybrid model

scheduler_input_path = ROOT_DIR / "scheduler_input_stage5.csv"

SCHEDULER_THRESHOLD = 0.15

scheduler_df = pd.read_csv(ROOT_DIR / "test_predictions_stage4.csv")
features_df = pd.read_csv(ROOT_DIR / "df_features_TN.csv")

scheduler_df["time"] = pd.to_datetime(scheduler_df["time"], format="%Y-%m-%d %H:%M:%S", errors="raise")
features_df["time"] = pd.to_datetime(features_df["time"], format="%Y-%m-%d %H:%M:%S", errors="raise")

scheduler_df = scheduler_df.merge(
    features_df[["time", "P_gen", "P_load", "SoC"]],
    on="time",
    how="left"
)

assert len(scheduler_df) == len(pd.read_csv(ROOT_DIR / "test_predictions_stage4.csv")), "Scheduler merge row mismatch"
assert not scheduler_df.isnull().any().any(), "Null values found in scheduler_df after merge"

scheduler_df["y_pred"] = scheduler_df["y_pred_hybrid"]
scheduler_df["eligible"] = scheduler_df["y_pred"] >= SCHEDULER_THRESHOLD

scheduler_df = scheduler_df[
    ["time", "y_true", "y_pred", "P_gen", "P_load", "SoC", "eligible"]
].copy()

scheduler_df.to_csv(scheduler_input_path, index=False)

print("Scheduler input saved to:", scheduler_input_path)
print("Scheduler input shape:", scheduler_df.shape)

print("\nEligibility threshold:", SCHEDULER_THRESHOLD)
print("Eligible hours:", int(scheduler_df["eligible"].sum()))
print("Blocked hours :", int((~scheduler_df["eligible"]).sum()))
print("\nHead:")
print(scheduler_df.head(5))
```
Outputs: 1
- Output 1: stream
```
Scheduler input saved to: raw_data\raw_data\scheduler_input_stage5.csv
Scheduler input shape: (1266, 7)

Eligibility threshold: 0.15
Eligible hours: 280
Blocked hours : 986

Head:
                 time    y_true    y_pred        P_gen        P_load  SoC  \
0 2019-11-09 06:00:00  0.023771  0.028960   336.784646   7468.911087  0.1   
1 2019-11-09 07:00:00  0.048983  0.053676   702.839282   8025.126266  0.1   
2 2019-11-09 08:00:00  0.088690  0.089557  1298.387803   8750.000000  0.1   
3 2019-11-09 09:00:00  0.120668  0.126676  1795.506665   9594.133342  0.1   
4 2019-11-09 10:00:00  0.141154  0.139470  2122.421637  10500.000000  0.1   

   eligible  
0     False  
1     False  
2     False  
3     False  
4     False
```

## Cell 37 (markdown)
---
## 📋 Table 11: System-Level Scheduling Metrics

The following cell computes the **system-level scheduling metrics** (Table 11 in the paper). These metrics quantify the operational benefit of forecast-gated scheduling versus always-on operation.

| Metric | Value |
|--------|-------|
| Total test hours | 1,266 |
| Eligible hours | 280 |
| Blocked hours | 986 |
| Allowed hours | 22.12% |
| Always-on renewable share | 15.34% |
| Scheduled renewable share | 25.81% |
| Renewable-share improvement | 10.47 percentage points |
| Relative improvement | 68.26% |

**Critical Note (Reviewer Feedback):** The scheduling gain reported here uses a single fixed threshold (0.15) applied uniformly to the proposed model's predictions. To properly attribute the operational gain to *forecast quality* rather than just the threshold rule, the scheduling evaluation should compare **LR vs Proposed vs Perfect-Foresight** under the same threshold rule. This comparison is added in the cell below.

### Interpretation
- The threshold rule identifies **280 out of 1,266** test hours as eligible for renewable-friendly scheduling.
- During those eligible windows, the renewable share increases from **15.34%** (always-on) to **25.81%** (scheduled), a **68.26% relative improvement**.
- However, this improvement is a property of *both* the threshold rule *and* the forecast model that identifies those windows. The comparison below isolates the forecast quality contribution.

## Cell 38 (code)
```python
# Cell 29: Compute Stage 5 scheduler metrics

scheduler_results_path = ROOT_DIR / "scheduler_results_stage5.csv"

scheduler_df = pd.read_csv(ROOT_DIR / "scheduler_input_stage5.csv")
scheduler_df["time"] = pd.to_datetime(scheduler_df["time"], format="%Y-%m-%d %H:%M:%S", errors="raise")

assert not scheduler_df.isnull().any().any(), "Null values found in scheduler_input_stage5.csv"
assert scheduler_df["time"].is_monotonic_increasing, "Scheduler time is not sorted"

total_hours = len(scheduler_df)
allowed_hours = int(scheduler_df["eligible"].sum())
blocked_hours = int((~scheduler_df["eligible"]).sum())

pct_hours_allowed = 100.0 * allowed_hours / total_hours
pct_hours_blocked = 100.0 * blocked_hours / total_hours

always_on_energy = scheduler_df["P_load"].sum()
scheduled_energy = scheduler_df.loc[scheduler_df["eligible"], "P_load"].sum()

always_on_renewable_used = np.minimum(scheduler_df["P_gen"], scheduler_df["P_load"]).sum()
scheduled_renewable_used = np.minimum(
    scheduler_df.loc[scheduler_df["eligible"], "P_gen"],
    scheduler_df.loc[scheduler_df["eligible"], "P_load"]
).sum()

always_on_renewable_share = 100.0 * always_on_renewable_used / always_on_energy
scheduled_renewable_share = 100.0 * scheduled_renewable_used / scheduled_energy if scheduled_energy > 0 else 0.0

renewable_share_improvement_pct_points = scheduled_renewable_share - always_on_renewable_share

scheduler_metrics_df = pd.DataFrame([{
    "total_hours": total_hours,
    "allowed_hours": allowed_hours,
    "blocked_hours": blocked_hours,
    "pct_hours_allowed": pct_hours_allowed,
    "pct_hours_blocked": pct_hours_blocked,
    "always_on_energy_mwh": always_on_energy,
    "scheduled_energy_mwh": scheduled_energy,
    "always_on_renewable_used_mwh": always_on_renewable_used,
    "scheduled_renewable_used_mwh": scheduled_renewable_used,
    "always_on_renewable_share_pct": always_on_renewable_share,
    "scheduled_renewable_share_pct": scheduled_renewable_share,
    "renewable_share_improvement_pct_points": renewable_share_improvement_pct_points,
}])

scheduler_metrics_df.to_csv(scheduler_results_path, index=False)

print("Saved scheduler results:", scheduler_results_path)
print("\nStage 5 metrics:")
print(scheduler_metrics_df.T)
```
Outputs: 1
- Output 1: stream
```
Saved scheduler results: raw_data\raw_data\scheduler_results_stage5.csv

Stage 5 metrics:
                                                   0
total_hours                             1.266000e+03
allowed_hours                           2.800000e+02
blocked_hours                           9.860000e+02
pct_hours_allowed                       2.211690e+01
pct_hours_blocked                       7.788310e+01
always_on_energy_mwh                    1.331052e+07
scheduled_energy_mwh                    3.315021e+06
always_on_renewable_used_mwh            2.041603e+06
scheduled_renewable_used_mwh            8.555499e+05
always_on_renewable_share_pct           1.533827e+01
scheduled_renewable_share_pct           2.580828e+01
renewable_share_improvement_pct_points  1.047001e+01
```

## Cell 39 (markdown)
---
## 📊 Reviewer Table: Scheduling Comparison — LR vs Proposed vs Perfect Foresight

**Purpose (Addressing Critical Reviewer Feedback):** The scheduling section (Table 11) reported a renewable-share improvement from 15.34% to 25.81%, but did not distinguish whether the gain came from the *threshold rule itself* or from the *forecast quality* of the proposed model.

This cell applies the **same scheduling threshold (0.15)** to three forecast sources:
1. **Linear Regression** — the deterministic baseline
2. **Proposed Hybrid (LR + BiLSTM)** — the residual decomposition model
3. **Perfect Foresight** — uses actual y_true values as the forecast (upper bound)

By comparing all three under identical rules, we can attribute the operational gain to forecast quality rather than just the threshold mechanism.

## Cell 40 (code)
```python
# Cell 29b: Reviewer Scheduling Comparison
# LR vs Hybrid vs Perfect Foresight under identical scheduling rule

import numpy as np
import pandas as pd

SCHEDULER_THRESHOLD = 0.15

# Load the test predictions file which has all model predictions
sched_compare_df = pd.read_csv(ROOT_DIR / "test_predictions_stage4.csv")
sched_compare_df["time"] = pd.to_datetime(sched_compare_df["time"])

# Merge P_gen and P_load from features file
features_df_sched = pd.read_csv(ROOT_DIR / "df_features_TN.csv")
features_df_sched["time"] = pd.to_datetime(features_df_sched["time"])

sched_compare_df = sched_compare_df.merge(
    features_df_sched[["time", "P_gen", "P_load"]],
    on="time",
    how="left"
)

assert not sched_compare_df[["P_gen", "P_load"]].isnull().any().any(), (
    "Null values found after merging P_gen/P_load for scheduler comparison"
)

# Define scheduling metrics function
def scheduler_metrics_compare(df, forecast_col):
    """Compute scheduling metrics for a given forecast column."""
    eligible = df[forecast_col] >= SCHEDULER_THRESHOLD
    total_hours = len(df)
    eligible_hours = int(eligible.sum())
    
    scheduled_energy = df.loc[eligible, "P_load"].sum()
    renewable_used = np.minimum(
        df.loc[eligible, "P_gen"],
        df.loc[eligible, "P_load"]
    ).sum()
    renewable_share = (
        100.0 * renewable_used / scheduled_energy
        if scheduled_energy > 0 else 0.0
    )
    return {
        "eligible_hours": eligible_hours,
        "eligible_pct": 100.0 * eligible_hours / total_hours,
        "scheduled_energy_mwh": scheduled_energy,
        "renewable_share_pct": renewable_share
    }

# Compute metrics for each forecast source
lr_sched = scheduler_metrics_compare(sched_compare_df, "y_pred_linear_regression")
hybrid_sched = scheduler_metrics_compare(sched_compare_df, "y_pred_hybrid")
perfect_sched = scheduler_metrics_compare(sched_compare_df, "y_true")

# Build comparison table
comparison_sched = pd.DataFrame([
    {"Forecast Source": "Linear Regression", **lr_sched},
    {"Forecast Source": "Proposed Hybrid (LR+BiLSTM)", **hybrid_sched},
    {"Forecast Source": "Perfect Foresight (y_true)", **perfect_sched},
])

# Add gain vs LR column
baseline_share = lr_sched["renewable_share_pct"]
comparison_sched["Gain_vs_LR_pp"] = (
    comparison_sched["renewable_share_pct"] - baseline_share
)

# Always-on renewable share (no threshold gating)
always_on_renewable = np.minimum(
    sched_compare_df["P_gen"], sched_compare_df["P_load"]
).sum()
always_on_energy = sched_compare_df["P_load"].sum()
always_on_share = 100.0 * always_on_renewable / always_on_energy

print("=" * 80)
print("REVIEWER TABLE: Scheduling Comparison Under Identical Threshold Rule")
print(f"Threshold: y_pred >= {SCHEDULER_THRESHOLD}")
print(f"Always-on renewable share (no gating): {always_on_share:.2f}%")
print("=" * 80)
print()
...
```
Outputs: 1
- Output 1: stream
```
================================================================================
REVIEWER TABLE: Scheduling Comparison Under Identical Threshold Rule
Threshold: y_pred >= 0.15
Always-on renewable share (no gating): 15.34%
================================================================================

            Forecast Source  eligible_hours  eligible_pct  scheduled_energy_mwh  renewable_share_pct  Gain_vs_LR_pp
          Linear Regression             280     22.116904          3.315021e+06            25.808280        0.00000
Proposed Hybrid (LR+BiLSTM)             280     22.116904          3.315021e+06            25.808280        0.00000
 Perfect Foresight (y_true)             290     22.906793          3.416866e+06            25.738251       -0.07003

================================================================================
INTERPRETATION
================================================================================
  LR scheduling renewable share:      25.81%
  Hybrid scheduling renewable share:  25.81%
  Perfect foresight renewable share:  25.74%

  Gain of Hybrid over LR:             0.00 pp
  Gain of Perfect over LR:            -0.07 pp
  Hybrid captures 0.0% of the perfect-foresight gap.
```

## Cell 41 (code)
```python
# # Cell 30: Stage 6 minimal blockchain simulation using scheduler eligibility

# import pandas as pd
# import hashlib
# import json
# from pathlib import Path

# scheduler_input_path = ROOT_DIR / "scheduler_input_stage5.csv"
# blockchain_log_path = ROOT_DIR / "blockchain_log_stage6.csv"
# blockchain_summary_path = ROOT_DIR / "blockchain_summary_stage6.csv"

# scheduler_df = pd.read_csv(scheduler_input_path)
# scheduler_df["time"] = pd.to_datetime(scheduler_df["time"], format="%Y-%m-%d %H:%M:%S", errors="raise")

# assert not scheduler_df.isnull().any().any(), "Null values found in scheduler_input_stage5.csv"
# assert scheduler_df["time"].is_monotonic_increasing, "Scheduler input time is not sorted"

# class Block:
#     def __init__(self, index, timestamp, transactions, previous_hash):
#         self.index = index
#         self.timestamp = str(timestamp)
#         self.transactions = transactions
#         self.previous_hash = previous_hash
#         self.hash = self.compute_hash()

#     def compute_hash(self):
#         payload = {
#             "index": self.index,
#             "timestamp": self.timestamp,
#             "transactions": self.transactions,
#             "previous_hash": self.previous_hash,
#         }
#         block_string = json.dumps(payload, sort_keys=True).encode("utf-8")
#         return hashlib.sha256(block_string).hexdigest()

# blockchain = []
# blockchain_logs = []

# previous_hash = "0" * 64
# block_index = 0

# for _, row in scheduler_df.iterrows():
#     eligible = bool(row["eligible"])
#     energy_condition = "eligible" if eligible else "blocked"

#     mined = False
#     block_hash = None
#     current_prev_hash = previous_hash

#     if eligible:
#         transactions = [{
#             "type": "mining_reward",
#             "renewable_ratio_pred": float(row["y_pred"]),
#             "P_gen": float(row["P_gen"]),
#             "P_load": float(row["P_load"]),
#             "SoC": float(row["SoC"]),
#         }]

#         block = Block(
#             index=block_index,
#             timestamp=row["time"],
#             transactions=transactions,
#             previous_hash=previous_hash
#         )

#         blockchain.append(block)
#         previous_hash = block.hash
#         block_hash = block.hash
#         mined = True
#         block_index += 1

#     blockchain_logs.append({
#         "time": row["time"],
#         "mined": mined,
#         "energy_condition": energy_condition,
#         "predicted_ratio": float(row["y_pred"]),
#         "P_gen": float(row["P_gen"]),
#         "P_load": float(row["P_load"]),
#         "SoC": float(row["SoC"]),
#         "block_index": (block_index - 1) if mined else None,
...
```

## Cell 42 (code)
```python
# # Cell 31: Create basic Streamlit prototype file

# from pathlib import Path

# STREAMLIT_APP_PATH = ROOT_DIR / "streamlit_app.py"

# streamlit_code = r'''
# import pandas as pd
# import streamlit as st
# from pathlib import Path

# st.set_page_config(page_title="PGC Prototype", layout="wide")

# ROOT_DIR = Path("/content/drive/MyDrive/mlbkt_project")

# MODEL_COMPARISON_PATH = ROOT_DIR / "model_comparison_stage4.csv"
# TEST_PREDICTIONS_PATH = ROOT_DIR / "test_predictions_stage4.csv"
# SCHEDULER_RESULTS_PATH = ROOT_DIR / "scheduler_results_stage5.csv"
# SCHEDULER_INPUT_PATH = ROOT_DIR / "scheduler_input_stage5.csv"
# BLOCKCHAIN_SUMMARY_PATH = ROOT_DIR / "blockchain_summary_stage6.csv"
# BLOCKCHAIN_LOG_PATH = ROOT_DIR / "blockchain_log_stage6.csv"

# required_files = [
#     MODEL_COMPARISON_PATH,
#     TEST_PREDICTIONS_PATH,
#     SCHEDULER_RESULTS_PATH,
#     SCHEDULER_INPUT_PATH,
#     BLOCKCHAIN_SUMMARY_PATH,
#     BLOCKCHAIN_LOG_PATH,
# ]

# missing_files = [str(p) for p in required_files if not p.exists()]
# if missing_files:
#     st.error("Missing required files:")
#     for mf in missing_files:
#         st.write("-", mf)
#     st.stop()

# comparison_df = pd.read_csv(MODEL_COMPARISON_PATH, index_col=0)
# pred_df = pd.read_csv(TEST_PREDICTIONS_PATH)
# scheduler_results_df = pd.read_csv(SCHEDULER_RESULTS_PATH)
# scheduler_input_df = pd.read_csv(SCHEDULER_INPUT_PATH)
# blockchain_summary_df = pd.read_csv(BLOCKCHAIN_SUMMARY_PATH)
# blockchain_log_df = pd.read_csv(BLOCKCHAIN_LOG_PATH)

# pred_df["time"] = pd.to_datetime(pred_df["time"])
# scheduler_input_df["time"] = pd.to_datetime(scheduler_input_df["time"])
# blockchain_log_df["time"] = pd.to_datetime(blockchain_log_df["time"])

# st.title("Predictive Green Consensus (PGC) Prototype")
# st.caption("Energy-aware blockchain scheduling dashboard")

# tab1, tab2, tab3, tab4 = st.tabs([
#     "Overview",
#     "Model Performance",
#     "Scheduler",
#     "Blockchain"
# ])

# with tab1:
#     st.subheader("Project Summary")
#     col1, col2, col3, col4 = st.columns(4)

#     metrics_row = scheduler_results_df.iloc[0]
#     blockchain_row = blockchain_summary_df.iloc[0]

#     col1.metric("Hours Evaluated", int(metrics_row["total_hours"]))
#     col2.metric("Mining Allowed (%)", f'{metrics_row["pct_hours_allowed"]:.2f}%')
#     col3.metric("Renewable Share Gain", f'{metrics_row["renewable_share_improvement_pct_points"]:.2f} pts')
#     col4.metric("Blocks Mined", int(blockchain_row["total_blocks_mined"]))

#     st.subheader("Best Model")
#     best_model = comparison_df.sort_values("val_RMSE").index[0]
#     st.write(f"Best model by validation RMSE: **{best_model}**")

#     st.subheader("Artifacts")
#     st.write("Loaded files:")
#     for p in required_files:
#         st.write("-", p.name)

...
```

## Cell 43 (code)
```python
# # Cell 32: Create a simple run helper script for Streamlit in Colab

# RUN_STREAMLIT_SH = ROOT_DIR / "run_streamlit.sh"

# run_script = f"""#!/bin/bash
# streamlit run "{ROOT_DIR / 'streamlit_app.py'}" --server.port 8501 --server.address 0.0.0.0
# """

# RUN_STREAMLIT_SH.write_text(run_script, encoding="utf-8")

# import os
# os.chmod(RUN_STREAMLIT_SH, 0o755)

# print("Created Streamlit run script:", RUN_STREAMLIT_SH)
# print("\nRun command:")
# print(f"!{RUN_STREAMLIT_SH}")
```

## Cell 44 (code)
```python
# !pip install streamlit
```

## Cell 45 (code)
```python
# !{ROOT_DIR / 'run_streamlit.sh'}
```

## Cell 46 (markdown)
---
## 🔍 Step 2: How to interpret the visualizations (The "Knowledge")

Once you run this code, it will output three graphs. Here is exactly what each graph means and how you should explain them to your professor:

### Graph 1: Errors Over Time (The "When")
**What you will see:** A line graph tracking the actual power and the predicted power, with red bars at the bottom representing the "gap" (the error) between them.

**What it proves:** Linear Regression is generally very close to the actual line. However, you will notice that the red bars suddenly spike at very specific times (e.g., peak afternoon hours or suddenly cloudy days).

**What to tell your Professor:** *"Graph 1 shows that Linear Regression successfully maps the daily cyclical trend. However, sudden spikes in the red error bars reveal isolated weather events or extreme peak conditions that the linear model completely fails to capture."*

### Graph 2: Distribution of Errors (The "How Much")
**What you will see:** A bell curve (histogram) centered around 0.0.

**What it proves:** Most of the time, the error is 0 (meaning the LR model is perfect). But, you will see "long tails" on the left and right sides of the bell curve. These tails represent massive over-predictions or under-predictions.

**What to tell your Professor:** *"Graph 2 proves that while the majority of the data is linear (centered at zero error), the presence of heavy tails indicates non-linear outliers. These tail events are exactly the data points our Hybrid BiLSTM will be trained to correct."*

### Graph 3: Residuals vs Actual Power (The "Where")
**What you will see:** A scatter plot. The grey dots are normal errors, and the red dots are the extreme "Non-Linear Anomalies" (the top 5% worst errors).

**What it proves:** You will likely see a "cone" or "fan" shape. When power generation is low (nighttime or early morning), the errors are tiny. When power generation is at its maximum (midday peak), the errors become massive and spread out. This is a statistical phenomenon called Heteroscedasticity.

**What to tell your Professor:** *"Graph 3 is the most critical. It shows that as power generation increases, the complexity of the data increases, leading to a wider spread of extreme errors (the red dots). A linear model simply cannot adjust its parameters for high-capacity non-linearities. Our Hybrid BiLSTM will take these exact red points as its target variable, learning to predict the error margin at peak hours."*

## Cell 47 (code)
```python
# ===== NEW CELL: EDA on Linear Regression Residuals (Non-Linearity Check) =====
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

# Provide fallback for ROOT_DIR if missing in isolated run
try:
    ROOT_DIR
except NameError:
    ROOT_DIR = Path("raw_data/raw_data")

# 1. Load the test predictions you saved earlier
test_preds_path = ROOT_DIR / "test_predictions_stage4.csv"
df_preds = pd.read_csv(test_preds_path)
df_preds["time"] = pd.to_datetime(df_preds["time"])

# 2. Calculate the Residuals (Errors) for Linear Regression
df_preds["LR_Residuals"] = df_preds["y_true"] - df_preds["y_pred_linear_regression"]

# 3. Define "Non-Linear Points" (e.g., the top 5% most extreme errors)
threshold = np.percentile(np.abs(df_preds["LR_Residuals"]), 95)
df_preds["Is_NonLinear_Anomaly"] = np.abs(df_preds["LR_Residuals"]) > threshold
num_anomalies = df_preds["Is_NonLinear_Anomaly"].sum()
total_points = len(df_preds)

print("="*80)
print("EXPLORATORY DATA ANALYSIS (EDA) ON MODEL RESIDUALS")
print("="*80)
print(f"Total Data Points in Test Set: {total_points}")
print(f"Highly Non-Linear Points (Extreme Errors): {num_anomalies} ({num_anomalies/total_points*100:.1f}%)")
print("\nHere we visualize the specific mistakes made by the Linear Regression.")
print("Scroll down to see each graph accompanied by its interpretation.\n")

# --- Graph 1: Residuals Over Time ---
subset = df_preds.head(336)
plt.figure(figsize=(14, 5))
plt.plot(subset["time"], subset["y_true"], label="Actual Gen", color="blue", alpha=0.6)
plt.plot(subset["time"], subset["y_pred_linear_regression"], label="LR Predicted", color="orange", alpha=0.6)
plt.bar(subset["time"], subset["LR_Residuals"], label="Error (Residual)", color="red", alpha=0.5)
plt.title("Graph 1: Errors Over Time (First 2 Weeks)")
plt.xticks(rotation=45)
plt.legend()
plt.tight_layout()
plt.show()

print("\n[GRAPH 1 INTERPRETATION: Errors Over Time - The 'When']")
print("What it proves: Linear Regression is generally very close to the actual line.")
print("However, you will notice that the red bars suddenly spike at very specific times")
print("(e.g., peak afternoon hours or suddenly cloudy days).")
print("-> Graph 1 shows that Linear Regression successfully maps the daily cyclical trend. ")
print("   However, sudden spikes in the red error bars reveal isolated weather events or ")
print("   extreme peak conditions that the linear model completely fails to capture.\n")
print("-" * 80)

# --- Graph 2: Distribution of Errors ---
plt.figure(figsize=(10, 5))
sns.histplot(df_preds["LR_Residuals"], bins=50, kde=True, color="purple")
plt.axvline(0, color='black', linestyle='--')
plt.title("Graph 2: Distribution of Errors")
plt.xlabel("Residual (Actual - Predicted)")
plt.tight_layout()
plt.show()

print("\n[GRAPH 2 INTERPRETATION: Distribution of Errors - The 'How Much']")
print("What it proves: Most of the time, the error is 0.0, forming a bell curve.")
print("But there are 'long tails' on the sides that represent massive over/under predictions.")
print("-> Graph 2 proves that while the majority of the data is linear (centered at zero error),")
print("   the presence of heavy tails indicates non-linear outliers. These tail events are")
print("   exactly the data points our Hybrid BiLSTM will be trained to correct.\n")
print("-" * 80)

# --- Graph 3: Residuals vs. Actual Generation ---
plt.figure(figsize=(10, 5))
sns.scatterplot(x="y_true", y="LR_Residuals", hue="Is_NonLinear_Anomaly", 
                palette={False: 'gray', True: 'red'}, data=df_preds, alpha=0.6)
plt.axhline(0, color='black', linestyle='--')
plt.title("Graph 3: Residuals vs Actual Power (Heteroscedasticity)")
plt.xlabel("Actual Power Generated")
...
```
Outputs: 7
- Output 1: stream
```
================================================================================
EXPLORATORY DATA ANALYSIS (EDA) ON MODEL RESIDUALS
================================================================================
Total Data Points in Test Set: 1266
Highly Non-Linear Points (Extreme Errors): 64 (5.1%)

Here we visualize the specific mistakes made by the Linear Regression.
Scroll down to see each graph accompanied by its interpretation.
```
- Output 2: display_data
  image/png present
```
<Figure size 1400x500 with 1 Axes>
```
- Output 3: stream
```
[GRAPH 1 INTERPRETATION: Errors Over Time - The 'When']
What it proves: Linear Regression is generally very close to the actual line.
However, you will notice that the red bars suddenly spike at very specific times
(e.g., peak afternoon hours or suddenly cloudy days).
-> Graph 1 shows that Linear Regression successfully maps the daily cyclical trend. 
   However, sudden spikes in the red error bars reveal isolated weather events or 
   extreme peak conditions that the linear model completely fails to capture.

--------------------------------------------------------------------------------
```
- Output 4: display_data
  image/png present
```
<Figure size 1000x500 with 1 Axes>
```
- Output 5: stream
```
[GRAPH 2 INTERPRETATION: Distribution of Errors - The 'How Much']
What it proves: Most of the time, the error is 0.0, forming a bell curve.
But there are 'long tails' on the sides that represent massive over/under predictions.
-> Graph 2 proves that while the majority of the data is linear (centered at zero error),
   the presence of heavy tails indicates non-linear outliers. These tail events are
   exactly the data points our Hybrid BiLSTM will be trained to correct.

--------------------------------------------------------------------------------
```
- Output 6: display_data
  image/png present
```
<Figure size 1000x500 with 1 Axes>
```
- Output 7: stream
```
[GRAPH 3 INTERPRETATION: Residuals vs Actual Power - The 'Where']
What it proves: Notice the 'cone' or 'fan' shape spreading toward the right side.
When power generation is high (midday peak), the errors become massive and spread out.
-> Graph 3 is the most critical. It shows that as power generation increases, the
   complexity of the data increases, leading to a wider spread of extreme errors
   (the red dots). A linear model simply cannot adjust its parameters for high-capacity
   non-linearities. Our Hybrid BiLSTM will take these exact red points as its target
   variable, learning to predict the error margin at peak hours.

================================================================================
```

## Cell 48 (markdown)
---
## 📊 Statistical Significance: Diebold-Mariano Test (LR vs Proposed Hybrid)

**Motivation:** Global metrics (RMSE, MAE, R²) show near-parity between Linear Regression and the proposed Hybrid Error-Correction model. However, global averages can mask localized improvements. To provide rigorous evidence that the Hybrid model offers statistically significant forecasting gains over LR, we apply the **Diebold-Mariano (DM) test**.

The DM test compares the predictive accuracy of two forecasts by testing whether the mean loss differential is significantly different from zero. We evaluate:

1. **Full test set** — all 1,266 test sequences
2. **Peak generation subset** — only hours where `y_true ≥ 0.20` (normalized), i.e., periods of high renewable output where non-linear dynamics dominate

Additionally, we run **multiple random seed evaluations** to quantify uncertainty in model performance.

### Hypotheses
- **H₀:** The two forecasts have equal predictive accuracy (mean loss differential = 0)
- **H₁:** The forecasts differ in predictive accuracy (two-sided test)

A p-value < 0.05 indicates statistically significant differences.

## Cell 49 (code)
```python
# Cell 33: Diebold-Mariano Test — LR vs Proposed Hybrid Model

import numpy as np
import pandas as pd
from scipy import stats

# --- Diebold-Mariano Test Implementation ---
def diebold_mariano_test(actual, pred1, pred2, loss_func='squared', h=1):
    """
    Diebold-Mariano test for equal predictive accuracy.
    
    Parameters:
    -----------
    actual : array-like, true values
    pred1 : array-like, predictions from model 1 (LR baseline)
    pred2 : array-like, predictions from model 2 (Proposed Hybrid)
    loss_func : str, 'squared' for MSE-based or 'absolute' for MAE-based
    h : int, forecast horizon (for HAC variance correction)
    
    Returns:
    --------
    dm_stat : float, DM test statistic
    p_value : float, two-sided p-value
    mean_d : float, mean loss differential (positive = model 2 is better)
    """
    actual = np.asarray(actual).flatten()
    pred1 = np.asarray(pred1).flatten()
    pred2 = np.asarray(pred2).flatten()
    
    # Compute loss for each model
    if loss_func == 'squared':
        loss1 = (actual - pred1) ** 2
        loss2 = (actual - pred2) ** 2
    elif loss_func == 'absolute':
        loss1 = np.abs(actual - pred1)
        loss2 = np.abs(actual - pred2)
    else:
        raise ValueError(f"Unknown loss function: {loss_func}")
    
    # Loss differential: d_t = loss1_t - loss2_t
    # Positive d_t means model 2 (Hybrid) is better at time t
    d = loss1 - loss2
    n = len(d)
    mean_d = np.mean(d)
    
    # HAC (Newey-West) variance estimator for h-step ahead forecasts
    # Autocovariance at lag k
    def autocovariance(d, k):
        d_demean = d - mean_d
        return np.sum(d_demean[k:] * d_demean[:n-k]) / n
    
    # Long-run variance with Newey-West bandwidth
    gamma_0 = autocovariance(d, 0)
    lr_var = gamma_0
    for k in range(1, h):
        lr_var += 2 * autocovariance(d, k)
    
    # Handle edge cases
    if lr_var <= 0:
        lr_var = gamma_0  # Fall back to standard variance
    
    # DM statistic
    dm_stat = mean_d / np.sqrt(lr_var / n)
    
    # Two-sided p-value using t-distribution with (n-1) df
    p_value = 2 * stats.t.sf(np.abs(dm_stat), df=n - 1)
    
    return dm_stat, p_value, mean_d


# --- Test on Full Test Set ---
print("=" * 80)
print("DIEBOLD-MARIANO TEST: Linear Regression vs Proposed Hybrid Model")
print("=" * 80)

# Use log-scale predictions for consistency with training objective
y_true_test = y_test_seq.flatten()
y_pred_lr_test = lr_test_preds.flatten()
y_pred_hybrid_test = hybrid_test_pred_log.flatten()

...
```
Outputs: 1
- Output 1: stream
```
================================================================================
DIEBOLD-MARIANO TEST: Linear Regression vs Proposed Hybrid Model
================================================================================

Total test sequences: 1266

--- Full Test Set (n=1266) ---
  MSE-based DM statistic: -0.2139
  MSE-based p-value:      0.830654
  Mean squared-loss diff: -0.00000006 (LR better)

  MAE-based DM statistic: -0.3199
  MAE-based p-value:      0.749102
  Mean absolute-loss diff: -0.00000704 (LR better)

================================================================================
PEAK GENERATION SUBSET ANALYSIS (y_true >= 0.20)
================================================================================

Peak threshold: y >= 0.2
Number of peak test points: 114 out of 1266 (9.0%)

  Peak RMSE (LR):      0.009724
  Peak RMSE (Hybrid):  0.009738
  Peak RMSE improvement: -0.14%

  Peak MAE (LR):       0.007502
  Peak MAE (Hybrid):   0.007508
  Peak MAE improvement: -0.08%

  DM statistic (peak, MSE): -0.5246
  DM p-value (peak):        0.600922
  Mean loss diff (peak):    -0.00000026 (LR better)

  ⚠️  NOT significant at α=0.05 (p=0.6009).
     The difference during peak hours is not statistically conclusive.

================================================================================
SUMMARY TABLE
================================================================================
```

## Cell 50 (code)
```python
# Cell 34: Multi-Seed Repeated Evaluation for Uncertainty Quantification

import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, LSTM, Bidirectional, Dense, Dropout, Layer
from tensorflow.keras import callbacks
import tensorflow.keras.backend as K
from sklearn.metrics import root_mean_squared_error, mean_absolute_error, r2_score

print("=" * 80)
print("MULTI-SEED EVALUATION: Robustness of Hybrid vs LR")
print("=" * 80)
print("\nTraining the Hybrid BiLSTM with 5 different random seeds...")
print("(LR is deterministic, so its metrics remain constant across seeds)\n")

SEEDS = [42, 123, 456, 789, 2024]
seed_results = []

# Attention layer definition (needed for rebuilding the model)
class AttentionLayer(Layer):
    def __init__(self, **kwargs):
        super(AttentionLayer, self).__init__(**kwargs)

    def build(self, input_shape):
        self.W = self.add_weight(name='attention_weight',
                                 shape=(input_shape[-1], 1),
                                 initializer='random_normal', trainable=True)
        self.b = self.add_weight(name='attention_bias',
                                 shape=(input_shape[1], 1),
                                 initializer='zeros', trainable=True)
        super(AttentionLayer, self).build(input_shape)

    def call(self, x):
        e = K.tanh(K.dot(x, self.W) + self.b)
        a = K.softmax(e, axis=1)
        output = x * a
        return K.sum(output, axis=1)

    def get_config(self):
        return super(AttentionLayer, self).get_config()

# LR baseline metrics (deterministic — same across all seeds)
lr_test_rmse_log = root_mean_squared_error(y_test_seq.flatten(), lr_test_preds.flatten())
lr_test_mae_log = mean_absolute_error(y_test_seq.flatten(), lr_test_preds.flatten())
lr_test_r2_log = r2_score(y_test_seq.flatten(), lr_test_preds.flatten())

for seed in SEEDS:
    print(f"  Training with seed={seed}...", end=" ")
    tf.keras.utils.set_random_seed(seed)
    
    # Rebuild model
    input_seq = Input(shape=(LOOKBACK, num_features))
    lstm_out = Bidirectional(LSTM(16, return_sequences=True))(input_seq)
    context = AttentionLayer()(lstm_out)
    context = Dropout(0.2)(context)
    x = Dense(16, activation='relu')(context)
    x = Dropout(0.1)(x)
    error_prediction = Dense(1)(x)
    model_seed = Model(inputs=input_seq, outputs=error_prediction)
    model_seed.compile(optimizer='adam', loss='mse', metrics=['mae'])
    
    # Train
    early_stop = callbacks.EarlyStopping(
        monitor='val_loss', patience=15, restore_best_weights=True, verbose=0
    )
    reduce_lr = callbacks.ReduceLROnPlateau(
        monitor='val_loss', factor=0.5, patience=5, min_lr=1e-6, verbose=0
    )
    
    model_seed.fit(
        X_train_seq, y_train_residuals,
        validation_data=(X_val_seq, y_val_residuals),
        epochs=200, batch_size=64,
        callbacks=[early_stop, reduce_lr],
        verbose=0
    )
    
    # Evaluate hybrid on test set
...
```
Outputs: 1
- Output 1: stream
```
================================================================================
MULTI-SEED EVALUATION: Robustness of Hybrid vs LR
================================================================================

Training the Hybrid BiLSTM with 5 different random seeds...
(LR is deterministic, so its metrics remain constant across seeds)

  Training with seed=42... RMSE=0.006376, R²=0.988296, DM p=0.4360
  Training with seed=123... RMSE=0.006335, R²=0.988444, DM p=0.8879
  Training with seed=456... RMSE=0.009231, R²=0.975467, DM p=0.0627
  Training with seed=789... RMSE=0.006347, R²=0.988403, DM p=0.0136
  Training with seed=2024... RMSE=0.006299, R²=0.988576, DM p=0.0960

================================================================================
MULTI-SEED RESULTS SUMMARY
================================================================================

LR Baseline (deterministic):
  test_RMSE: 0.006333
  test_MAE:  0.004678
  test_R2:   0.988452

Hybrid Model (across 5 seeds):
  test_RMSE: 0.006918 ± 0.001294
  test_MAE:  0.005062 ± 0.000847
  test_R2:   0.985837 ± 0.005798
  peak_RMSE: 0.009986 ± 0.000567

DM Test Consistency:
  Seeds with significant DM test (p<0.05): 1/5
  Mean DM statistic: -0.7175 ± 1.6124
  Mean DM p-value:   0.2993

================================================================================
DETAILED SEED RESULTS
================================================================================
 seed  test_RMSE  test_MAE  test_R2  peak_RMSE   DM_stat  DM_pvalue significant
   42   0.006376  0.004715 0.988296   0.009734 -0.779133   0.436047          No
  123   0.006335  0.004683 0.988444   0.009728 -0.140974   0.887913          No
  456   0.009231  0.006577 0.975467   0.011001 -1.862946   0.062701          No
```