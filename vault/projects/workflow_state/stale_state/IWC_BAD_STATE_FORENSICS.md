# IWC Bad State Forensics

Forensic analysis of invalid/orphaned parameters found in IWC workflow `tool_state` dictionaries. Each entry documents what's wrong, why, and how it got there.

See [TRACKING_INVALID_WORKFLOW_PARAMETERS.md](TRACKING_INVALID_WORKFLOW_PARAMETERS.md) for methodology.

---

## 1. pe-artic-variation.ga / multiqc / `saveLog`

| Field | Value |
|-------|-------|
| Workflow | `pe-artic-variation.ga` |
| Step | 25 |
| Tool ID | `toolshed.g2.bx.psu.edu/repos/iuc/multiqc/multiqc` |
| Tool version (in workflow) | `1.27+galaxy3` |
| Orphan key | `saveLog` |
| Orphan value | `"false"` (string) |
| Category | True orphan — not in any branch of the parameter tree |
| Root cause | **planemo-autoupdate bot** |

### Parameter history in tool XML

- **Added**: Present since at least multiqc 1.8 wrapper. Boolean param controlling whether to save the MultiQC log file as an output.
- **Removed**: tools-iuc commit `24152e242` (2024-08-25, Bjoern Gruening) — multiqc wrapper updated from 1.23 → 1.24.1. Commit message: *"remove the log option, seems to not be supported in the new release"*
- **Last valid wrapper version**: 1.23 (`@GALAXY_VERSION@` suffix varies)

### Parameter history in workflow

| Date | IWC commit | multiqc version | `saveLog` status |
|------|-----------|----------------|-----------------|
| 2021-02-22 | `3a18e6c67` | 1.8+galaxy1 | `false` (bool) — **valid** |
| 2021–2024 | various human commits | 1.9→1.11+galaxy1 | present — **valid** |
| 2025-03-17 | `8eb0a81e9` | **1.27+galaxy3** | `"false"` (string) — **orphaned** |

### What happened

1. `saveLog` was a valid boolean parameter in multiqc wrappers through version 1.23.
2. The underlying MultiQC software dropped log-saving support. Wrapper 1.24.1 removed `saveLog` from the XML.
3. The IWC workflow stayed on multiqc 1.11+galaxy1 (which still had `saveLog`) through 2024.
4. On 2025-03-17, **planemo-autoupdate bot** bumped the workflow from 1.11+galaxy1 to 1.27+galaxy3 in commit `8eb0a81e9`. The bot carried `saveLog` forward in `tool_state` despite it no longer existing in the tool definition. It also changed the value type from boolean `false` to string `"false"`.

### Evidence

```bash
# Confirm saveLog absent from current tool XML
git -C /path/to/tools-iuc grep saveLog -- tools/multiqc/
# (no results)

# Find removal commit
git -C /path/to/tools-iuc log --oneline -S 'saveLog' -- tools/multiqc/
# 24152e242 ... remove the log option ...

# Find IWC orphaning commit
git -C /path/to/iwc log --oneline -S '1.27+galaxy3' -- workflows/**/pe-artic-variation.ga
# 8eb0a81e9 ... Automated tool update ...
```

---

## 2. segmentation-and-counting.ga / ip_filter_standard / `radius`

| Field | Value |
|-------|-------|
| Workflow | `segmentation-and-counting.ga` |
| Step | 1 |
| Tool ID | `toolshed.g2.bx.psu.edu/repos/imgteam/2d_simple_filter/ip_filter_standard` |
| Tool version (in workflow) | `1.12.0+galaxy1` |
| Orphan key | `radius` |
| Orphan value | `"3"` (string) |
| Category | True orphan — renamed to `size` inside a new conditional structure |
| Root cause | **Human upgrade** (same person who refactored the tool) |

Note: The root-level `filter_type` key is also orphaned but is tolerated by `allow_root_level_duplicates` since it exists as `filter.filter_type` inside the new conditional.

### Parameter history in tool XML

- **Before** (version `0.0.3-3`): `radius` was a top-level `<param name="radius" type="integer" value="3" label="Radius/Sigma" />`. Flat structure — `filter_type` was a plain `<select>`, `radius` applied to all filter types. Command: `python filter_image.py '$input' '$output' $filter_type $radius`
- **Refactored**: galaxy-image-analysis commit `c045f067` (2024-04-04, Leonid Kostrykin) — "Refurbishment (#118)". Major refactoring of 23 tools. `radius` replaced by a `filter` conditional with per-filter-type `size` params (float for gaussian sigma, integer for median radius, hidden for edge-detection filters). Underlying library changed from scikit-image 0.14.2 to scipy 1.12.0.
- **Version after refactoring**: `1.12.0+galaxy0`, then `1.12.0+galaxy1` (commit `c86a1b9`, "Suppress non-fatal errors when loading images (#119)")

### Parameter history in workflow

| Date | IWC commit | tool version | `radius` status |
|------|-----------|-------------|----------------|
| 2024-02-29 | `79238343` | `0.0.3-3` | `"3"` — **valid** |
| 2024-11-07 | `0f0c9ade` | **`1.12.0+galaxy1`** | `"3"` — **orphaned** |

### What happened

1. Leonid Kostrykin created the IWC workflow on 2024-02-29 with tool version `0.0.3-3`. At that version, `radius` was a valid top-level integer param.
2. On 2024-04-04, Leonid refactored the tool itself (Refurbishment #118), replacing the flat `filter_type`+`radius` structure with a `filter` conditional containing per-type `size` params.
3. On 2024-11-07, Leonid upgraded the workflow to `1.12.0+galaxy1`. He correctly added the new conditional state (`"filter": {"filter_type": "gaussian", "__current_case__": 0, "size": "3.0"}`) but **did not remove** the old flat keys (`"radius": "3"` and `"filter_type": "gaussian"`).
4. This is **not a bot bug** — the same person who refactored the tool also upgraded the workflow, but Galaxy's export preserved the old keys (the `params_to_strings` serialization bug).

### Evidence

```bash
# Confirm radius absent from current tool XML
git -C ~/projects/repositories/galaxy-image-analysis grep radius -- tools/2d_simple_filter/
# (no results)

# Find refactoring commit
git -C ~/projects/repositories/galaxy-image-analysis log --oneline -S 'radius' -- tools/2d_simple_filter/
# c045f067 Refurbishment (#118)

# Find IWC upgrade commit
git -C ~/projects/repositories/iwc log --oneline -S '1.12.0+galaxy1' -- workflows/**/segmentation-and-counting.ga
# 0f0c9ade ...
```

---

## 3. segmentation-and-counting.ga / ip_threshold / `dark_bg`

| Field | Value |
|-------|-------|
| Workflow | `segmentation-and-counting.ga` |
| Step | 3 |
| Tool ID | `toolshed.g2.bx.psu.edu/repos/imgteam/2d_auto_threshold/ip_threshold` |
| Tool version (in workflow) | `0.18.1+galaxy3` |
| Orphan keys | `dark_bg`, `block_size` (root-level copy) |
| Orphan values | `"true"` (string), `"5"` (string) |
| Category | True orphan (`dark_bg` renamed to `invert_output`); duplicate (`block_size` moved into `th_method` conditional) |
| Root cause | **Human upgrade** (same person who refactored the tool) |

Note: Root-level `block_size` is tolerated by `allow_root_level_duplicates` since it exists inside `th_method` conditional. `dark_bg` is the true orphan that causes the validation failure.

### Parameter history in tool XML

- **Before** (version `0.0.5-2`): `dark_bg` was a top-level `<param name="dark_bg" type="boolean" checked="true" ...>`. `block_size` was also top-level. `th_method` was a flat `<select>`.
- **Refactored**: galaxy-image-analysis commit `8b9f24c` (2024-03-11, Leonid Kostrykin) — PR #109 "Update Threshold image tool". Commit message includes: *"Replace `dark_bg` by `invert_output`"*. Changes:
  - `dark_bg` (boolean) → `invert_output` (boolean) — renamed
  - `th_method` became a `<conditional>` with per-method nested params
  - `block_size` moved from top-level into `th_method` conditional (only for methods that use it)
  - Tool version jumped from `0.0.5-2` to `0.18.1+galaxy0`
- **Version trail**: `0.18.1+galaxy0` → `galaxy1` → `galaxy2` → `galaxy3` (workflow version)

### Parameter history in workflow

| Date | IWC commit | tool version | `dark_bg` status |
|------|-----------|-------------|-----------------|
| 2024-02-29 | `79238343` | `0.0.5-2` | `"true"` — **valid** |
| 2024-11-07 | `0f0c9ade` | **`0.18.1+galaxy3`** | `"true"` — **orphaned** |

### What happened

1. Leonid Kostrykin created the IWC workflow on 2024-02-29 with tool version `0.0.5-2`. At that version, `dark_bg` and top-level `block_size` were valid params.
2. On 2024-03-11, Leonid refactored the tool (PR #109), renaming `dark_bg` to `invert_output` and restructuring `th_method` into a conditional with `block_size` nested inside.
3. On 2024-11-07, Leonid upgraded the workflow to `0.18.1+galaxy3`. Galaxy's save/export added the new structure (`invert_output`, nested `th_method` conditional with inner `block_size: "0"`) but **did not strip** the old keys (`dark_bg: "true"`, root `block_size: "5"`).
4. The root-level `block_size` value (`"5"`) actually diverges from the nested value (`"0"`) — the root copy is stale from the old version.

### Evidence

```bash
# Confirm dark_bg absent from current tool XML
git -C ~/projects/repositories/galaxy-image-analysis grep dark_bg -- tools/2d_auto_threshold/
# (no results)

# Find refactoring commit
git -C ~/projects/repositories/galaxy-image-analysis log --oneline -S 'dark_bg' -- tools/2d_auto_threshold/
# 8b9f24c Update Threshold image tool (#109)

# Same IWC upgrade commit as entry 2 (same workflow, same date)
git -C ~/projects/repositories/iwc log --oneline -S '0.18.1+galaxy3' -- workflows/**/segmentation-and-counting.ga
# 0f0c9ade ...
```
