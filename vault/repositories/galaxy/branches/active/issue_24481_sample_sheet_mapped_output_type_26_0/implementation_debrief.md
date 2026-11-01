# Implementation debrief: #24481

**STATUS: BLOCKED.** This is a scope decision for John. The branch works and has been tested. The second scope evaluation recommends one more small expansion, which by process means parking the branch instead of re-scoping it a second time.

```text
exists .../differential-review/snapshots/20261101T153752Z-hardening-129e3244b7bb.json
  hardening @ 129e3244b7bb vs origin/release_26.0 (merge-base 0593b5e15412)
  since 20261101T145255Z-implementation-bc2552c1950f:
    commits: 5 same, 0 rebased, 0 changed, 4 new, 0 dropped
    hunks:   4 carried, 6 changed, 6 new, 2 dropped
    new     381ea4573e19 Simplify sample sheet multiply unit tests
    new     cc76cb4b9214 Demote nested sample sheets in mapped collection types
    new     25e8710ad192 Address review of nested sample sheet demotion
    new     129e3244b7bb Share absent sample sheet metadata assertion in API tests
```

## Final implementation (head `129e3244b7b`, base `release_26.0`)

Collection-type composition (`map_over_collection_type`) no longer returns an invalid type. When concatenating the types is invalid, every `sample_sheet` rank becomes `list` (`demote_sample_sheet_ranks`). Examples:

- `sample_sheet` × `list` → `list:list`
- `sample_sheet:paired` × `list` → `list:paired:list`
- an unlinked `list` × `sample_sheet` → `list:list`

Valid compositions such as `sample_sheet:paired` keep the sample sheet.

`Tree.multiply` keeps sample sheet columns only while the result is still a sample sheet. Otherwise it retypes nested sample sheet structures as lists and drops their columns, so precreation never puts columns on a list.

The same rule now applies in the subworkflow output types the editor sees (`_resolve_collection_type`) and in the client `CollectionTypeDescription.append`. One side effect in `terminals.ts:484`: an editor `multiple="true"` data input mapped over a sample sheet now accepts a `list:list` connection, which matches runtime `can_match_type`.

## Choices

- **Base `release_26.0`.** 25.1 has no sample_sheet-as-list mapping normalization; this fix builds on it.
- **Demote to `list` rather than make `sample_sheet:list` and similar valid types.** Extending the valid types would be a feature for `dev`. The trade-off is that column metadata is lost on demoted levels; the PR text should say so.
- **Re-scoped once** (see [implementation_rescope_debrief.md](implementation_rescope_debrief.md)) from "demote a leading sample_sheet" to "demote every invalid sample_sheet rank". Alt branch: `..._alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).
- **Commit order.** Three "Baseline tests" commits. The subworkflow baseline commit (`175dae42abf`) sits after the first fix commit, because force-pushing to reorder was not permitted; the branch manager may reorder it.

## Decision needed (Scope B+)

The [second scope evaluation](scope_evaluation.md) recommends applying `demote_sample_sheet_ranks` in `OutputCollections.create_collection` (`lib/galaxy/tools/actions/__init__.py`) when the job is one slice of a map-over (`self.dataset_collection_elements is not None`). Roughly 2-3 lines, plus an API test using the `collection_type_source` test tool: `header` batched over a list, with `input_collect` set to a sample sheet.

- **Why:** a tool output that resolves to `sample_sheet` (via `type_source`; no in-tree tool declares a fixed `sample_sheet` output) is created by each job, or reused from a completed job, as a `sample_sheet` child. That child sits under a parent this branch now types `list:list`.
  - Before the branch the parent was the invalid but consistent `list:sample_sheet`. So in this narrow case the branch introduces a parent/child type mismatch.
  - Review 2 and the round-2 Codex review independently flagged the same gap.
  - It is inferred from the code; no test has reproduced it yet.
- **Options:**
  - (a) Approve B+ here: small, and it makes the rule exact.
  - (b) Ship as is and leave it to the #24303/#24308 `type_source` work.
  - (c) Ship the original-scope alt.
- **Still valid after any option:**
  - reviews 1 and 2, and both Codex rounds
  - the round-2 test challenge, where every new test fails without the fix
  - all tests listed below
- **Validation remaining after B+:**
  - a new API test for the `type_source` case, run with and without the fix
  - a quick normal review
  - the remaining hardening steps below

## Hardening status (round 2, after the re-scope)

- **Done:**
  - test challenges ([test_challenges_debrief.md](test_challenges_debrief.md))
  - Codex review ([codex_review.md](codex_review.md), one finding recorded as the decision above)
  - scope evaluation ([scope_evaluation.md](scope_evaluation.md))
  - branch checks: ruff, black, isort and mypy are clean on the changed files; prettier is clean
- **Not run** (process stops at a scope recommendation):
  - thermo-nuclear review
  - baseline refactor
  - screenshots (client change is type inference only, likely not relevant)
- **Skipped as not applicable:** the performance challenge (no ORM, query or endpoint changes) and E2E polish (no E2E tests).
- **Round 1:** debriefs are in [earlier_drafts/1/](earlier_drafts/1/).

## Tests

Locally:

- **Python unit: 126 passed.** Files: `test/unit/data/dataset_collections/test_structure.py`, `test_type_descriptions.py`, and the map-over rows in `test/unit/workflows/test_modules.py`.
- **Vitest: 9 passed** in `collectionTypeDescription.test.ts`. The `Editor/modules` suite also passes.
- **API: 4 passed** in `lib/galaxy_test/api/test_tool_execute.py`:
  - paired output over a sample sheet keeps its columns (baseline)
  - list output → `list:list` with no columns
  - unlinked list × sample sheet → `list:list`
  - paired_or_unpaired over a sample sheet (existing test)

Without the fix: 18 unit cases, 2 vitest tests and 2 API tests fail.

## Notes

- `git stash` is shared across worktrees. A concurrent agent's stash was popped here by mistake early on; it was reverted at once, the other agent's entry was left intact, and stash was not used again.
- Run pytest with `-p no:postgresql`; the venv has no libpq.
- Expect a merge-forward conflict in `type_description.py` with the issue_24303 branch (26.2).
- The issue comment draft is in [issue_comment_draft.md](issue_comment_draft.md). It has not been posted.
