# Galaxy: `__SPLIT_PAIRED_AND_UNPAIRED__` accepts a sample sheet in the form, then fails the invocation on an assert

- Target: galaxyproject/galaxy (`lib/galaxy/tools/__init__.py` `SplitPairedAndUnpairedTool`). A bug, not intended: the same tool already copies sample-sheet `rows` and `column_definitions` to its outputs. Foundry tracking needed: yes, label `upstream/galaxy` (until fixed, collection notes must say "`__CONVERT_SAMPLE_SHEET__` first").
- Seen in: driver probe for /home/ubuntu/foundry-runs/prose-wb2g-chipseq-v0-2026-10-30 (`../prose-wb2g-chipseq-v0-2026-10-30.bin/probe/PROBE_RESULTS.md` §1 caveat B), Galaxy release_26.1, 2026-10-30. Not in the feedback ledger; it contradicted the golden brief's design.
- Existing issues/PRs: none (searched "SPLIT_PAIRED_AND_UNPAIRED sample sheet"). Related: galaxy PR #21465 (sample sheet support for database operation tools, which missed this assert), #22204 / PR #22282 (different IndexError in the same tool, fixed). Foundry #663, finding [28](28-sample-sheet-multilevel-grouping.md).

## Symptom
A workflow connects a `sample_sheet:paired_or_unpaired` input straight to `__SPLIT_PAIRED_AND_UNPAIRED__`. Import and connection checks accept it. The invocation fails: "Failed to create 1 job(s) for workflow step 4: Error executing tool with id '__SPLIT_PAIRED_AND_UNPAIRED__'", from an `AssertionError`. Inserting `__CONVERT_SAMPLE_SHEET__` (to `list:paired_or_unpaired`) first works and keeps identifiers.

## Root cause
Confirmed in source (release_26.1 @ d61b1ca6c6d).
- The param is `collection_type="list:paired,list,list:paired_or_unpaired"` (`lib/galaxy/tools/split_paired_and_unpaired.xml:16`), and sample-sheet types match list types for tool inputs, so the form/workflow accepts the sheet.
- `produce_outputs` asserts `collection_type in ["list", "list:paired", "list:paired_or_unpaired"]` (`lib/galaxy/tools/__init__.py:4292`) and dispatches on those exact strings (`:4326-4338`).
- Commit a0ca8bfff3f (PR #21465, "Add sample sheet support to many database operation tools") added `rows=…columns` and `column_definitions=collection.column_definitions` to this tool's outputs (`:4341-4356`) but did not widen its assert, while it widened `FilterDatasetsTool`'s to `("list", "list:paired", "sample_sheet", "sample_sheet:paired")`. So sample-sheet support here was intended and is unreachable.
- Same assert on dev (`lib/galaxy/tools/__init__.py:4115`).

## Evidence
Probe logs `probe/run1/` (failure) and `probe/run2.log` (with `__CONVERT_SAMPLE_SHEET__`, split verified, identifiers kept). `git show a0ca8bfff3f -- lib/galaxy/tools/__init__.py`.

## Proposed fix
Map `sample_sheet` → `list`, `sample_sheet:paired` → `list:paired`, `sample_sheet:paired_or_unpaired` → `list:paired_or_unpaired` before the assert and the dispatch, keeping the row propagation. Add an API test splitting a mixed sample sheet.

## Draft issue
**galaxy — Title:** `__SPLIT_PAIRED_AND_UNPAIRED__` fails on sample_sheet inputs it accepts

`SplitPairedAndUnpairedTool.produce_outputs` asserts `collection_type in ["list", "list:paired", "list:paired_or_unpaired"]` (`lib/galaxy/tools/__init__.py:4292` on release_26.1, `:4115` on dev). The tool's input accepts `sample_sheet:paired_or_unpaired` (sample sheets match list inputs), so a workflow that splits a sample sheet imports fine and then fails at scheduling: "Failed to create 1 job(s) for workflow step N: Error executing tool with id '__SPLIT_PAIRED_AND_UNPAIRED__'". #21465 already added `rows`/`column_definitions` propagation to this tool's outputs, but not the matching assert change it made for `__FILTER_FAILED_DATASETS__` and friends.

Reproduce: workflow input `sample_sheet:paired_or_unpaired` (one paired row, one unpaired row) → `__SPLIT_PAIRED_AND_UNPAIRED__`. Workaround: `__CONVERT_SAMPLE_SHEET__` first.

Fix: normalise `sample_sheet*` to the matching `list*` type for the assert and dispatch.

**Foundry tracking comment (label `upstream/galaxy`):**
> `__SPLIT_PAIRED_AND_UNPAIRED__` directly on a sample sheet fails the invocation on Galaxy ≤ 26.1 (upstream: <link>). The sample-sheet and paired_or_unpaired notes should say to run `__CONVERT_SAMPLE_SHEET__` first until the fix ships. Found in the nf-core/chipseq wb2g probe, 2026-10-30.
