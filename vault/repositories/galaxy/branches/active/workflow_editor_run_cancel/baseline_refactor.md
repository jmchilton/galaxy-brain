# Baseline refactor: workflow_editor_run_cancel (re-harden, scope B)

No refactoring of the base branch was performed.

Reviewed `65132d40dac..b1b0fd4a380` (6 commits) from scratch, keeping base `release_26.2` `65132d40dac`. History is unchanged and no SHAs were rewritten, so the fixture-key commit `bd15a4f667f` (still pending John's OK) keeps its SHA. No E2E reruns were needed.

## Candidates checked

- **The `workflow_run_setup_inputs` rewrite in `b1b0fd4a380`.** This was the main candidate. Most of the hunk looks like cleanup that doesn't depend on the fix: it builds a fresh `{src, id, hid}` dict instead of mutating the populator's response, uses `["id"]` instead of `.get`, raises on non-data entries instead of skipping them, and adds a type annotation. The actual fix is switching the loop from load_data_dict's `inputs` to its `label_map`.
  - I built the split: a refactor commit after `bd15a4f667f` that kept iterating `inputs`. It is **not** behavior-preserving, and I discarded it.
  - The reason: for plain-string test data, `load_data_dict` stores the full upload response in `inputs` (`inputs[key] = hda`), not `ds_entry(hda)`. That response comes from `HDA.to_dict()`. It carries `hid` but has no `src`.
  - On base, the walrus guard skips those entries, and `workflow_run_specify_inputs` pops the `hid` the response already has. The uniform loop would hit `src is None` and raise. That breaks plain-string callers such as `test_execution_with_multiple_inputs`, whose fixture is `WORKFLOW_WITH_DYNAMIC_OUTPUT_COLLECTION` with `text_input1`/`text_input2` strings.
  - `label_map` normalizes every data entry to `ds_entry` (`{src, id}`). That is what makes the uniform loop and the raise valid, so the cleanup and the fix are one change. A behavior-preserving split would need a src-less HDA branch that the fix then deletes, which is contrived churn.
- **`value.pop("hid")` -> `value["hid"]` in `workflow_run_specify_inputs`.** On its own this is behavior-neutral. Neither caller of `workflow_run_setup_inputs` reads the dict after `specify_inputs`, and `workflow_run_and_submit` discards it. Moving one line to the front of the branch would rewrite every SHA, including `bd15a4f667f`, and force E2E reruns for no review benefit. It stays in the commit that makes the caller-side `inputs["input"]["id"]` assertion meaningful.
- **Original-scope commits (4b `a7337467234`, 7h `f81806b03a3`, 7j `5b8de54dbdc`).** Same verdict as `earlier_drafts/1/baseline_refactor.md`. 4b and 7h change behavior: they add the simplified/expanded selector dispatch and replace the dead `#workflow-run-button`. 7j only adds a selector, already in its own commit.
- **Fixture key `bd15a4f667f`.** It already acts like a baseline commit: it is green on the old helper, which ignores `type: File` data, and it sits directly before the fix. It could move to the very front, but that would rewrite every SHA and mix it into the original-scope stack. That stack has to stay droppable as a unit if John rejects scope B (`alts/original_scope.md`).
- **The shared form-mode helper (scope C).** It would be a real pre-fix refactor, but it stays deferred. `navigates_galaxy.py` is shared with sibling branches, and keeping this branch independently mergeable matters more.

## Baseline tests convention

Doesn't apply. The branch adds no new test file or new set of tests for a component. It adds one new E2E flow and strengthens two existing tests, and each of these is meant to fail on base:
- `test_run_from_editor_and_cancel` needs 4b, 7h and 7j.
- The decoy assertion in `test_execution_with_multiple_integer_parameter` is red on the pre-fix helper ("run form kept the preselected newest dataset").
- The label/name assertion in `test_execution_with_custom_invocation_report` is red on the pre-fix helper (`input_1 got 'my input image'`).

A baseline commit could only pin the bug ("File inputs are not selected"), which isn't worth pinning.

## Tests

The final code is identical to `b1b0fd4a380` (`git reset --hard` back to it after the discarded split), so I ran no E2E tests. The latest runs on this head are recorded in `polish_e2e_tests_debrief.md`.
