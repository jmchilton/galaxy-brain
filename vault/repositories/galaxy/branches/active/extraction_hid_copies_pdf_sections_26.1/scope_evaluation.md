Run via Claude Opus 5.5 at high effort.

**Recommendation: keep the scope as implemented.** This is the second evaluation. The first one's expansion (one summary input card per original, `d3e327d5dcd` + `3f571f849c5` + the E2E `2f0cd130446`) is in, and its symptoms were reproduced red before the fix. Every remaining #24225 commit and test is one of three things: notebook/26.2-only, a fix #24225 itself still needs, or behavior #24225 also leaves unchanged on the plain history path. None of them is a 26.1 bug that a port would close. A further change isn't clearly warranted. Under the workhorse process, recommending one at this stage would also park the branch as BLOCKED rather than re-scope it, so the bar for "expand" is higher here than the usual lean.

**Landing gate (not a scope issue, but it has to be prominent).** #24225 is still OPEN, draft and WIP on `release_26.2`, at head `9936a675512`. If this branch merges forward before #24225 lands there, taking 26.2's side of `histories.py` drops the summary fix. The 5 summary API tests and the E2E test still merge in, and they would fail on 26.2. Land #24225 on 26.2 first, or hold the merge-forward until it does.

Branch at `2f0cd130446` (base `origin/release_26.1` `19281d57645`, unchanged upstream): 8 commits, 10 files, +772/−199. About 425 changed lines are production code (`extract.py` 276, `histories.py` 80, `markdown_util.py` 50, `services/workflows.py` 19). The rest is tests, about 546 lines, plus 2 `navigation.yml` lines. The `jmchilton` remote is already at `2f0cd130446`, so the "needs force-push" notes in `baseline_refactor.md` and the earlier debriefs are out of date. `index.md` is stale too: it still says two commits, `6336ce84404`, and "summary card not ported".

## Possible Decompositions

Options for John, not recommendations. Current commits:

1. `aa07cf68c2f` Baseline tests: hid extraction connects an implicitly converted input (test only)
2. `5c8c0d23489` Route by-ids test helpers through `_extract_by_ids[_raw]` (test-only refactor)
3. `d24ba1df126` One `input_row` helper in `create_workflow_extraction_summary` (behavior-neutral refactor)
4. `4ffc90509f7` `invocation_inputs`/`invocation_outputs` expand to object ids, so PDF export renders them (`markdown_util.py` + unit tests)
5. `96db02d899e` Copies of one original are one input (hid + by-ids); 400 for unparallel names; per-row `custom_tool_inaccessible`; `copy_library_dataset` populator
6. `d3e327d5dcd` Summary: one input card per original, listing in-history copies
7. `3f571f849c5` Test: job-less collection copies share one card
8. `2f0cd130446` E2E: form extracts a list and its in-history copy as one input (+2 `navigation.yml` selectors)

Couplings (facts):
- Commit 4 is fully independent. No other commit touches its files.
- Commit 3 is behavior-neutral and can ride with whichever PR carries commit 6, or go first on its own.
- Commit 6 imports `_original_key`/`IdKey`, which commit 5 makes the shared keying, and its tests use commit 5's mixin helpers (`_get_extraction_summary`, `_row_with_output_id`, ...). So commit 6 needs commit 5. Commits 7 and 8 need commit 6. Commit 8's extracted-workflow assert also needs commit 5's grouping.
- If commit 5 ships without commit 6, the UI can reach commit 5's "copies … different `dataset_names`" 400: rename one of two per-copy cards for a library import and its copy. Commit 6 is what makes that unreachable.
- Commit 5's tests use commit 2's `_extract_by_ids_raw` and commit 1's `_run_grep1_on_converted_input` / `_assert_single_input_single_tool`.

**Option A: as committed (1 PR).** All 8 commits.

**Option B: PDF split (2 PRs).**
1. Commit 4 alone: PDF export of the default report's invocation sections, about 130 lines with unit tests only.
2. Commits 1–3, 5–8: extraction and summary.

The two PRs land independently, in either order.

**Option C: extraction, then summary (3 PRs).**
1. Commit 4 (PDF). Independent.
2. Commits 1, 2, 5: extraction-layer copies, the name-parallelism 400s and the user-tool row flag.
3. Commits 3, 6, 7, 8: summary cards and the E2E test. This PR lands after PR 2.

This splits the release-branch API-shape change (summary row grouping) from the extraction fixes for separate review. The cost: between PR 2 and PR 3, the 26.1 UI can reach PR 2's new "different names" 400 (see above). The landing gate applies only to PR 3.

**Option D: by concern (4 PRs).** Option C, plus cutting the small service fixes out of commit 5 into their own PR ahead of PR 2:
- `_validate_parallel_names` 400 (`services/workflows.py` + `test_extract_names_not_parallel_to_ids_rejected` and `test_extract_from_history_fewer_names_than_hids_rejected`)
- the `ItemAccessibilityException` widening (`histories.py` 3 lines + `test_extraction_summary_udt_step_invalid_for_non_owner`)

That PR has to carry the mixin helpers commit 5 adds (`_extract_from_history_raw`, `_get_extraction_summary`, `_run_user_tool`, `_run_user_tool_in_published_history`), so it means hand-cutting test hunks out of commit 5.

## Scopes considered

### 1. As implemented (recommended)

The branch backports to 26.1 these #24225 fixes for bugs that also exist there:
- PDF export of `invocation_inputs`/`invocation_outputs`
- copies of one original as one input on the hid and by-ids paths, including implicitly converted inputs
- 400 instead of 500 for unparallel names
- a per-row `custom_tool_inaccessible` instead of a whole-summary 403
- one summary input card per original, listing in-history copies

| Pros | Cons |
|---|---|
| <ul><li>16 API and 5 unit tests fail on bare 26.1 at their own assert, and the E2E test is red by reasoning. Each fix is a real 26.1 bug. The Baseline test and Codex's `test_extract_by_ids_keeps_empty_input_name` pin base behavior, so they pass there</li><li>Closes the UI half: the form no longer posts duplicate `hdca_ids` or an id from an inaccessible source history, and the branch's own "different names" 400 is unreachable from the form</li><li>Every #24225 API test whose bug exists on 26.1 is ported (see scope 6)</li><li>Fully hardened after the re-scope: rescope review, test challenge, E2E polish, Codex, thermo, baseline refactor</li></ul> | <ul><li>Landing gate on #24225 (above)</li><li>Changes the summary's row grouping on a release branch: more rows for multi-file uploads, local ids for collection copies</li><li>`histories.py`'s summary hunk and the `is not None` names in `extract.py` are 26.1-specific code that merge-forward discards</li></ul> |

### 2. Contract back to `_alt_original_scope` (`6189791f58c`)

Drop the summary-card commits (3, 6, 7, 8) and ship the extraction-layer fixes only.

| Pros | Cons |
|---|---|
| <ul><li>No release-branch change to the summary row shape</li><li>No landing gate on #24225 for the summary tests</li></ul> | <ul><li>The re-scope reproduced the UI symptoms on 26.1: `hdca_ids: [src, src]` → 400 "contains duplicates"; renaming a per-copy card → the branch's own new 400</li><li>Would ship a new UI-reachable 400 with no way around it in the form</li><li>Throws away hardened, red-tested work</li></ul> |

Not recommended. As a packaging choice, Option C above gets the same review separation without dropping the fix.

### 3. Tool rows for copied cross-history tool outputs list the source HDCA

The rescope review flagged a leftover: when a history holds a copy of a tool-produced collection from another history, the tool row's outputs are the source HDCA, listed once per copy. `__summarize_dataset_collection` records `get_original_hdca(...)`, and tool rows take their datasets straight from `summarize()`.

| Pros | Cons |
|---|---|
| <ul><li>The card's `GenericHistoryItem` fetches each output by id, so it would fail to render that output once the source history becomes inaccessible</li></ul> | <ul><li>#24225 doesn't fix this on the plain history path. `_input_producer_name` checks `boundary.produced_elsewhere` only when `closure is not None` (notebooks), and `_tool_row` takes `summarize()`'s datasets too. 26.2 behaves the same</li><li>A 26.1 fix would be new design that diverges from 26.2, not a port</li><li>The form posts `job_ids` for tool rows, so extraction itself is unaffected</li></ul> |

Not recommended here. If wanted, it's a dev/26.2 follow-up first: either reuse `HistoryBoundary.local_copies` for tool-row outputs, or treat cross-history producers as inputs without a closure.

### 4. Codex's empty-name fix also belongs in #24225

The branch uses `is not None` in place of `or "Input Dataset"` on both by-ids branches (keeping base's `""`), with `test_extract_by_ids_keeps_empty_input_name`. #24225 (`extract.py:956,960` on `extract_next_followups`) still has the `or` form.

| Pros | Cons |
|---|---|
| <ul><li>Brings #24225 in line with the branch and with base</li></ul> | <ul><li>A change to #24225, not to this branch. The branch is already correct, and the divergence costs nothing on merge-forward</li></ul> |

Not a scope change for this branch. Worth a one-line follow-up on #24225.

### 5. Thermo/test deferrals

These are:
- unify `InputGroup`/`HidInputGroup`, the `_INPUT_FIELDS` triples and the three-site `step_labels` dedup
- hoist input classification in the summary
- port `2f94811d40d` (Selenium helpers wait on form state instead of `UX_TRANSITION`)

| Pros | Cons |
|---|---|
| <ul><li>Fewer concepts in `extract.py`</li><li>Less flaky Selenium helpers</li></ul> | <ul><li>Not bug fixes</li><li>Each pulls 26.1 away from #24225 or 26.2's text. `2f94811d40d` edits `navigates_galaxy.py`/`framework.py`, which 26.2 already restructured, so it would conflict on merge-forward</li><li>The polish and thermo reviews already declined these on those grounds</li></ul> |

Not recommended. Dev/26.2 follow-ups.

### 6. Remaining #24225 commits and tests

All 32 test names that #24225 adds to `test_workflow_extraction.py` were checked against the branch. 15 are ported. The 17 missing ones break down as:
- 13 in `TestNotebookWorkflowExtractionReport`: notebook extraction (#22860) first ships in 26.2.
- 3 quote/newline label tests (`test_extract_input_names_with_quote_and_newline_accepted`, `test_extract_step_label_with_quote_accepted`, `test_extract_from_history_quoted_dataset_name_accepted`, from `317a83e9895`, "…accept … again"). They undo a quote rejection that 26.2's `workflow_extraction_naming.py` added. 26.1 has no such rejection (no quote checks in `services/workflows.py` or `extract.py`), so there is no bug to fix.
- `test_extraction_summary_suggested_name_is_directive_safe`: 26.2's naming and report-directive module, which doesn't exist on 26.1.

Since the first evaluation, #24225 has three new commits:
- `9aea2dce264`: notebook `HistoryBoundary` only
- `7880f7437f1`: mypy in a notebook test
- `9936a675512`: `Cat1Run` in `TestNotebookWorkflowExtractionReport` only

Of the other non-notebook commits:
- `b2b0515e9cb` is a no-behavior tidy (`getattr(trans, "user", None)` → `trans.user`, plus a docstring).
- `0230a122463` targets a server name-uniqueness check and a client `hasDuplicateStepLabels` that 26.1 doesn't have.

| Pros | Cons |
|---|---|
| <ul><li>A more complete backport</li></ul> | <ul><li>None of these is a bug present on 26.1</li><li>Porting the three quote tests would only pin behavior that already works on 26.1 (Baseline material at most), and would add merge-forward surface</li></ul> |

Out of scope.

## Unresolved questions

- Hold the merge-forward until #24225 lands on `release_26.2`, or keep #24225 and this branch moving together?
- Want a separate one-line `is not None` fix pushed to #24225?
- Scope 3 (cross-history tool-row outputs): worth a dev issue, or leave as is?
