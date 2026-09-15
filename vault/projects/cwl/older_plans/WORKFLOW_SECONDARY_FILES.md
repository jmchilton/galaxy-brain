# CWL Deferred Datasets & Secondary Files

## Problem

CWL workflows with default File inputs that require secondary files fail during job preparation. Three interrelated issues discovered while debugging `test_conformance_v1_2_mixed_version_v11_wf`.

The test runs a v1.1 workflow calling three tools (v1.0, v1.1, v1.2), each taking a File input with `secondaryFiles: ".2"`. The workflow input has a default `{class: File, location: hello.txt}` and the job is `null` (no user-provided inputs).

## Root Causes Found

### 1. Deferred→Materialized HDA ID Mismatch

**Flow:** `raw_to_galaxy()` creates deferred HDA (id=1) → `ensure_materialized()` creates new transient HDA (id=None) → `validated_tool_state` still references id=1 → `adapt_dataset` can't find HDA → `ValueError: Could not find HDA for dataset id 1`

**Fix:** Added `extra_hda_id_mappings` parameter through the `setup_for_runtimeify` chain:
- `evaluation.py`: `CwlToolEvaluator._setup_for_runtimeify` builds mapping from job associations (original deferred id → current materialized HDA)
- `runtime.py`: `setup_for_runtimeify` accepts and injects mappings into `hdas_by_id`
- `cwl_runtime.py`: `setup_for_cwl_runtimeify` passes through and also applies to its own `hdas_by_id`

### 2. Missing `created_from_basename`

**Flow:** `raw_to_galaxy()` didn't always set `created_from_basename` → `ensure_materialized()` creates new Dataset without it → `set_basename_and_derived_properties` falls back to `hda.name` → cwltool sees `basename: "Unnamed dataset"` instead of `"hello.txt"` → secondary file pattern yields `"Unnamed dataset.2"` instead of `"hello.txt.2"`

**Fix:** Two changes:
- `cwl_runtime.py`: `raw_to_galaxy()` now always sets `dataset.created_from_basename = name`
- `deferred.py`: `ensure_materialized()` now copies `created_from_basename` to the materialized dataset

### 3. Secondary Files Never Staged for Deferred Datasets

**Flow:** `raw_to_galaxy()` creates deferred HDA for primary file only → materialization downloads primary file → secondary files never stored in `extra_files_path/__secondary_files__/` → `discover_secondary_files()` returns `[]` → cwltool fails: `Missing required secondary file 'hello.txt.2'`

**Why secondary files are lost:**
- The CWL default value is `{class: File, location: hello.txt}` — no `secondaryFiles` listed
- Secondary file patterns (`.2`) are defined on the *input type definition*, not the *default value*
- `raw_to_galaxy()` only creates a `DatasetSource` for the primary file
- `ensure_materialized()` only streams the primary source
- The `__secondary_files__/` directory is never populated

**Fix (two layers):**

*Local source fallback (`cwl_runtime.py`):*
- `_discover_secondary_files_from_source()` — when `__secondary_files__/` doesn't exist, checks the HDA's `dataset.sources[0].source_uri` for a local `file://` path and scans the directory for files matching `{basename}*`

*Remote source staging (`evaluation.py`):*
- `CwlToolEvaluator._stage_deferred_secondary_files()` — before passing input JSON to cwltool, checks for File inputs without `secondaryFiles`, matches them to source URIs by basename, extracts secondary file patterns from the CWL tool definition, and downloads from the source URL

### 4. Wrong URL Resolution in `cwl_location_rewriter.py`

**Flow:** `rewrite_locations()` rewrites CWL default File locations from local paths to remote GitHub URLs → `base_dir` was the workflow's directory (e.g. `tests/mixed-versions/`) → `os.path.relpath()` stripped the subdirectory → URL became `https://.../tests/hello.txt` instead of `https://.../tests/mixed-versions/hello.txt` → secondary file URL 404'd

**Fix:** Changed `base_dir` from `os.path.dirname(workflow_path)` to the CWL tests root directory. Now `relpath` preserves subdirectory structure in URLs.

## Current Status: WIP

All three tools now get past cwltool validation and generate command lines. Jobs enter `running` state but **time out during execution/output collection**. The `echo` commands should complete instantly — the hang is likely in job output handling (possibly related to deferred dataset state or output collection for CWL tools with no outputs).

## Key Data Flow

```
CWL Workflow Default File Input
  ↓
cwl_location_rewriter.py: rewrite_locations()
  - pack() resolves relative paths to absolute
  - get_url() converts to GitHub raw URLs
  ↓
modules.py: raw_to_galaxy()
  - Creates deferred HDA with DatasetSource(source_uri=url)
  - NOW: always sets created_from_basename
  ↓
model/deferred.py: ensure_materialized()
  - Downloads primary file from source_uri
  - Creates new transient HDA (id=None)
  - NOW: copies created_from_basename
  - STILL MISSING: secondary files not materialized
  ↓
evaluation.py: CwlToolEvaluator.build_param_dict()
  - Builds extra_hda_id_mappings from job associations
  - Passes through setup_for_runtimeify chain
  ↓
cwl_runtime.py: adapt_dataset()
  - Looks up HDA by original deferred id via extra_hda_id_mappings
  - Calls discover_secondary_files() → fallback to source
  ↓
evaluation.py: _stage_deferred_secondary_files()
  - Downloads secondary files from source URL
  - Adds to input JSON secondaryFiles array
  ↓
cwltool: job_proxy() validates and builds command
```

## Files Modified

| File | Change |
|------|--------|
| `lib/galaxy/model/deferred.py` | Copy `created_from_basename` during materialization |
| `lib/galaxy/tools/cwl_runtime.py` | `extra_hda_id_mappings` param, `_discover_secondary_files_from_source`, always set `created_from_basename` in `raw_to_galaxy` |
| `lib/galaxy/tools/evaluation.py` | `extra_hda_id_mappings` in `_setup_for_runtimeify`, `_stage_deferred_secondary_files`, `_apply_secondary_file_pattern`, `_get_secondary_file_patterns` |
| `lib/galaxy/tools/runtime.py` | `extra_hda_id_mappings` param in `setup_for_runtimeify` |
| `lib/galaxy_test/base/cwl_location_rewriter.py` | Fix `base_dir` for URL resolution |

## Remaining Work

1. Debug why jobs hang in `running` state after command line generation
   - All 3 tools have valid `echo` command lines
   - Likely output collection issue for CWL tools with `outputs: []`
   - Or deferred dataset in original HDA still in `deferred` state causing issues
2. Consider whether `_stage_deferred_secondary_files` URL download approach is production-ready (currently uses `urllib.request.urlretrieve`)
3. The local source fallback `_discover_secondary_files_from_source` uses simple prefix matching — may need refinement for complex secondary file patterns

## Unresolved Questions

- Why do jobs hang after generating valid command lines? Is it output collection, deferred state on original HDA, or something else?
- Should `raw_to_galaxy()` be enhanced to also create deferred entries for secondary files at creation time instead of downloading them at job time?
- Is the `cwl_location_rewriter` base_dir fix correct for v1.0 tests that have a different directory structure (`v1.0/v1.0/` vs `tests/`)?
