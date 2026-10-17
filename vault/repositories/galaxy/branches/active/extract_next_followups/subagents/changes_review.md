# Review: retarget + E5–E7 (2026-10-17)

A normal review subagent and an independent Codex review both covered the retarget and `9b393176656..95344d96109`. Both found the same two E7 bugs, and both are now fixed red-to-green in `a6353d0f60a`:
- **Implicitly converted inputs.** A job records the converted dataset, which shares its source's hid but isn't a copy, so keying by original left the tool input unconnected. The fix maps a converted dataset back to its source.
- **Copies sent under one name got a 400.** The service checked raw names for duplicates before grouping copies. The fix adds `group_hid_inputs_by_original`, used by both the validation and `extract_steps`.

I also acted on two smaller points:
- The by-ids path had the same conversion bug, already present on 26.2. It now uses the same `_unconverted` helper, with a twin test.
- A test now covers the collection-copy improvement: a collection copied in from another history used to 400 on the hid path.

Not acted on:
- **`HidInputGroup` duplicates `InputGroup`.** The hid path keeps tolerating unknown dataset hids (an input step with no connection), and `InputGroup` requires a ref. Merging the two would mean a new 400 for unknown hids.
- **Hids resolved twice** (validation, then extraction). This matches the by-ids pattern.
- **Duplicate-hid histories:** `get_hda_by_hid` picks the lowest-id visible dataset. This is rare and only noted here.
- **E6 nits:** `assoc: Any` stays. Unlabeled sections are still skipped, matching dev.
- **E5 timing:** the rename must merge before 26.2.0 ships. Recorded in the implementation debrief.

No security findings.

<details><summary>Normal review subagent (full)</summary>

# Review: extract_next_followups retarget + E5/E6/E7 (9b393176656..95344d96109)

**Verdict:** The retarget is clean and E5 and E6 are sound. E7 has one real regression: implicit datatype conversion. It also has a service-level validation gap. Uncommitted WIP in the worktree (seen 2026-10-17, not reviewed as final) already fixes both: `_unconverted`, `group_hid_inputs_by_original`, and two new API tests. Commit it. Then fix the same conversion bug in the by-ids path.

No security issues found.

## Findings (by severity)

### 1. HIGH (HEAD): hid path no longer wires implicitly converted inputs
- `lib/galaxy/workflow/extract.py` `__cleanup_param_values` (HEAD ~L633) emits `original_content_ref(item)`.
- When a tool input needs conversion, the job params record the **converted** HDA: `lib/galaxy/tools/actions/__init__.py:306` (`target_dict[input.name] = input_datasets[...]`).
- The converted HDA inherits its parent's hid (`HistoryDatasetAssociation.copy_attributes`, `model/__init__.py:~6347`). It is not a copy, and it has its own creating job (the converter). So `get_original_hda` stops at the converted HDA, and its ref never equals the input step's ref.
- Old code keyed by `item.hid`, which equals the parent's hid, so it connected.
- Failure: upload `fastqsanger.gz`, run a tool needing `fastqsanger`, then extract with `dataset_hids=[hid]`. The tool step has no `input_connections` and the workflow fails to run.
- Fix: the uncommitted `_unconverted()` plus `test_hid_extract_connects_implicitly_converted_input` is the right fix. Commit it.

### 2. MEDIUM: by-ids path has the same conversion bug (sibling divergence)
- `extract.py` `__cleanup_param_values_by_id` (`get_original_hda(item)`, ~L1152) and the DCE leaf in `step_inputs_by_id` (~L1100) do not undo conversion either.
- The bug already exists on release_26.2. Once item 1 lands, notebook extraction (by ids) and hid extraction behave differently on the same history.
- Fix: move `_unconverted` into one helper used by both cleanups, e.g. `_job_input_ref(item)`. Add a by-ids twin of the Grep1 test.

### 3. MEDIUM (HEAD): `/api/histories/{id}/extract_workflow` rejects copies sent with one name
- `services/workflows.py` `extract_from_history` calls `_validate_extraction_labels(payload.dataset_names, ...)` on the raw names. It raises "workflow input names must be unique" before `extract_steps` can merge the copies.
- So E7's "copies become one input" only works when no names are sent (the bioblend/legacy `POST /api/workflows` path).
- The uncommitted WIP fixes this by validating grouped names, and adds `test_hid_extract_copies_sent_with_one_name_make_one_input`. Commit it.

### 4. LOW (WIP): hid inputs are grouped and resolved twice, with a duplicated grouping loop
- `HidInputGroup` and `group_hid_inputs_by_original` repeat `InputGroup` and `group_inputs_by_original`, including the duplicate-name check. Both paths also resolve inputs twice: once in the service for validation, once in `extract_steps`.
- Suggestion: add `_hid_content(trans, history_id, kind, hid)`, alongside `_accessible_content`, that resolves a hid to an HDA or HDCA. Feed it into one shared grouping core, letting `InputGroup.ref` be `None` for a missing dataset hid. Optionally pass the groups from the service into `extract_workflow` so each hid is resolved once.

### 5. LOW: E7 fixes some behavior that no test covers
- Old `collection_types` was keyed by the original's hid. A collection copied in from another history (different hid) was therefore rejected with "does not appear to be a collection". `get_hdca_by_hid` now accepts it.
- Add tests for:
  - `dataset_collection_hids` with a copied-in collection;
  - a map-over of that copy.
  - These pin down the fix and the `find_implicit_input_collection` → `original_content_ref` path.

### 6. LOW: histories with duplicate hids
- `get_hda_by_hid` takes the lowest-id visible HDA. If a job consumed the other HDA at that hid, the input no longer connects; old code connected by hid.
- This is rare in legacy histories. Accept it, but note it in the PR/debrief.

### 7. NIT (E6)
- `_invocation_section(assoc: Any)` in `markdown_util.py:1274` could use a union of the four `WorkflowRequestToInput*`/`WorkflowInvocationOutput*` association classes.
- Unlabeled inputs and outputs are still dropped, even though id directives no longer need a label. An optional fallback heading (step name or order) would show them in reports.
- Checked and fine:
  - Labels containing "```" mid-heading are safe. The client `parseMarkdown` (used by `Markdown.vue`) and python-markdown fences both only start at the beginning of a line. Only `splitMarkdown` (`referencedObjects`, page-editor permissions) uses `indexOf`, and it is not used to render invocation reports.
  - Access: id directives go through `get_accessible` per directive, and `handle_error` handles failures per directive. The resulting exposure is the same as the existing `output="label"` resolution.
  - The re-pinned upstream tests reflect the intended behavior change; they are not weakened.

### 8. INFO (E5)
- `/api/pages/{id}/workflow_extraction_summary` and `report_title` exist on release_26.2, but there is no v26.2.0 tag in the clone yet. The rename must merge before 26.2.0 ships, or it becomes a breaking change.
- Client, schema and tests are updated. `grep` finds no stale references.

## Retarget check (release_26.2)
I found no dependency on dev-only code:
- ruff and mypy are clean on the changed modules. The only mypy error is in `notification.py`, which the branch does not touch.
- 138 related unit tests and 137 vitest tests pass.
- Every navigation.yml component path the branch's selenium code uses resolves.
- `GToast`/`GButton` and `get_hda_by_hid`/`get_hdca_by_hid` exist on 26.2.
- The chat and save-view selector drops are also dead on 26.2: nothing renders or uses them.

Local `vue-tsc` reports TS2589 at `client/src/api/pages.ts:210`. That comes from a stale `client/packages/api-client/dist`, built at 09:34 and still holding the old route. With a freshly built dist (`tsup` in a scratch copy of HEAD), `vue-tsc` is clean. Rebuild the dist before running `vue-tsc` locally.

## Tests
- The E7 API tests fail on the old code, as traced through the old logic:
  - in `test_hid_extract_connects_tool_output_with_an_in_history_copy`, the copy overwrote `hda_hid_in_history`;
  - copy-only and both-hids cases made two inputs or none;
  - the different-names case returned 200.
- The E6 `test_invocation_sections_render_contents` fails on the old code: label directives stayed in basic markdown.
- Imports are at the top of each module. Dropping the E2E test is fine: 6 other tests click the button through `notebook_click_extract_workflow`.
- I did not run API or E2E tests, per instructions.

</details>

<details><summary>Codex findings (raw)</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "client/packages/api-client/src/schema/schema.ts",
      "client/src/api/pages.ts",
      "lib/galaxy/managers/markdown_util.py",
      "lib/galaxy/managers/workflow_extraction_report.py",
      "lib/galaxy/managers/history_contents.py",
      "lib/galaxy/schema/workflows.py",
      "lib/galaxy/webapps/galaxy/api/pages.py",
      "lib/galaxy/webapps/galaxy/api/workflows.py",
      "lib/galaxy/webapps/galaxy/services/workflows.py",
      "lib/galaxy/workflow/extract.py",
      "lib/galaxy/model/__init__.py",
      "lib/galaxy/tools/__init__.py",
      "lib/galaxy/tools/actions/__init__.py",
      "lib/galaxy/tools/parameters/basic.py",
      "lib/galaxy_test/api/test_pages_history_attached.py",
      "lib/galaxy_test/api/test_workflow_extraction.py",
      "lib/galaxy_test/api/test_workflows.py",
      "lib/galaxy_test/selenium/test_notebook_workflow_extraction.py",
      "test/unit/app/managers/test_markdown_export.py",
      "test/unit/workflows/test_workflow_markdown.py",
      "test/unit/workflows/test_extract_parameters.py",
      "test/unit/workflows/test_extract_summary.py"
    ],
    "notes": "Reviewed all changed files and relevant surrounding paths. The 71 focused unit tests passed; both findings were confirmed with in-memory reproductions. API and Selenium suites were not run."
  },
  "findings": [
    {
      "severity": "P1",
      "category": "correctness",
      "file": "lib/galaxy/workflow/extract.py",
      "line": 633,
      "title": "Implicit datatype conversions now lose workflow input connections",
      "detail": "The new association key uses the consumed HDA's original_content_ref, but get_original_hda follows only copied_from links, not ImplicitlyConvertedDatasetAssociation parents. Tool execution stores the converted HDA in scalar data parameters. Meanwhile, get_hda_by_hid deliberately selects the user-facing parent HDA. These objects share a hid but have different IDs, so the former hid-based connection succeeds while the new reference lookup fails.",
      "failure_scenario": "Upload fastqsanger.gz and run Grep1, which implicitly converts it to fastqsanger. Extract using the upload's hid and the Grep1 job, without selecting the hidden conversion job. The input step is keyed by the compressed HDA ID, while Grep1's association uses the converted HDA ID. The extracted Grep1 step has no input connection and its recorded input has been cleared.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "api-contract",
      "file": "lib/galaxy/workflow/extract.py",
      "line": 285,
      "title": "The history endpoint rejects identically named copies before grouping",
      "detail": "The new grouping permits copies with the same name, but WorkflowsService.extract_from_history still calls _validate_extraction_labels on the raw parallel names before extract_steps runs. It rejects duplicate names unconditionally. The ID-based service already validates names after group_inputs_by_original; the new nested input_ref duplicates that grouping logic without adapting its service-level caller.",
      "failure_scenario": "POST /api/histories/{id}/extract_workflow with dataset_hids identifying an HDA and its in-history copy, and dataset_names=['reads', 'reads']. Instead of producing one input named reads, the endpoint returns 400: \"workflow input names must be unique: 'reads'\". The same failure occurs for collection copies with identical explicit names.",
      "confidence": "certain"
    }
  ]
}
```

</details>
