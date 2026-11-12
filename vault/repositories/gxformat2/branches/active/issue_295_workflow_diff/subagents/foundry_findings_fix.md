# Foundry #796 domain-review findings fix (`397819a`)

Run via Claude Opus 5.5 at high effort.

Source: Foundry `issue-796-test-phase-removed-steps` drafts `upstream_issue_diff_inline_subworkflows.md` and `upstream_issue_diff_list_form_relabel.md` (fixed here instead of filed). One commit on `570de0f`, pushed to `jmchilton` (PR #296 head `397819a`); live PR body updated.

1. **Inline subworkflows, red-to-green.** A matched step with an inline `run` on both sides is diffed recursively (raw run paired with the already-normalized `NormalizedFormat2`, no re-normalization). Results go into the same top-level maps with every inner step key, input/output id and edge node prefixed `<parent>/`: `steps.removed["nested/first"]`, `upstream: ["nested/inner_reads"]`, `inputs.changed["nested/inner_reads"]`, `outputs.changed["nested/out"]`. Added/removed subworkflow steps list only themselves; `unwired_inputs` stays top-level; nested levels follow their enclosing level (depth-first, AFTER order). A prefixed key colliding with a slash-keyed step raises `ValueError`. Chosen over a nested `WorkflowDiff` on the parent step because Foundry's `check-step-removals` reads `steps.removed` and matches ledger `step` by key, so it needs no change (`step: nested/first`).
2. **List-form relabel, red-to-green.** When both sides are list form, steps with a non-empty raw `id` unique on each side pair by `id` first; paired BEFORE keys are renamed to AFTER keys across the BEFORE view (steps, edges, output refs), then key matching runs unchanged. A pair whose AFTER key is still another un-renamed BEFORE step's key is dropped (fixpoint). Relabel now reports `fields.label` with no edge/neighbour/`outputs.changed` churn. `StepSummary` gains `id` (raw `id` as written, else `null`), the writeup's related gap.
3. Text output names a nested step by path, hiding a label equal to its last segment.

Cases (red before, green after unless noted): `test_diff_removed_step_inside_inline_subworkflow`, `test_diff_inline_subworkflow_interface_changes_are_prefixed`, `test_diff_list_step_relabel_is_a_label_change`, `test_diff_removed_list_step_summary_carries_its_id`; `test_diff_identical_inline_subworkflow_is_empty` green on arrival; `trim` summary `id: null` added to the removed-step case. Five fixtures (`synthetic-diff-inline-subworkflow{,-removed-step,-interface}`, `synthetic-diff-list-steps{,-relabeled}`), all in the catalog. Unit tests: nested text heading, collision `ValueError`. Relabel case confirmed red with id pairing disabled (`first`/`second cat` removed + added, `outputs.changed.out`).

Docs: module docstring, script description, `diff.yml` header, `docs/cli_diff.rst`, debrief contract ("Step identity", new "Inline subworkflows" bullet, `StepSummary`, "Not compared", "Left undone"), `pr_description.md` (29 cases, 28 fixtures).

Smoke: 132 IWC workflows self-diff to no changes (34 with inline subworkflows).

Gate green: ruff, flake8, black, mypy, pyrefly, `make lint-docs`, pytest 1002 passed / 8 skipped.

Not done: linked subworkflow contents still compared by reference only.

Draft probe (scratch): 11 draft fixtures with inline runs self-diff clean and, with one inner step deleted, give identical Python/TS text and JSON; a scratch nested draft keeps the removed inner step's `_plan_context` in `plan_fields` on both sides. The id-pairing collision fallback has no `diff.yml` case; the two implementations agree by reading.
