# issue_20900_invocation_validation — re-harden after rebase

**STATUS: BLOCKED.** The branch is parked for John's scope decision. Scope evaluation recommends a modest expansion, and two of its items change test data in dev's own tests.

John asked on 2026-11-04 for a rebase and re-harden once all eight extracted PRs had merged. Head is `9f2d892ad17` on dev `7e16f446410`, pushed to `jmchilton`. The 60 dev commits since then don't touch the branch's files. The old head is preserved as `backup/issue_20900_before_dev_rebase_20261104`.

## What the branch does

- `fde4e03dd8d`, **baseline tests** (pass on dev): accepted parameter strings, unrestricted suggestions, empty optional parameters, per-value multiple-text validation, mappable collection inputs.
- `cc2099794c5` and `7e670abd636`, **refactors only**:
  - public `validate_sample_sheet_metadata` and `get_claimed_workflow_landing_request_model`;
  - `_new_history_name`, `_validate_resource_params` and `_validate_replacement_params` extracted from `build_workflow_run_configs`.
- `7848553da11`, **validate before side effects**:
  - every batch entry's parameter values (type, restrictions, validators) and data inputs (deleted, dataset given to a collection input, sample-sheet URIs) are checked first;
  - replacement and resource params are checked, and step state is populated once per distinct `param_map`;
  - only then are histories created or inputs copied or dereferenced;
  - null `replacement_params`/`resource_params` count as empty;
  - type checks live in `workflow_parameter_input_definitions.py`.
- `9f2d892ad17`, **landing check**: the claimed landing request (404/409/403) is looked up before any invocation or history exists.

## Hardening (fresh, all on the rebased branch)

- [Test challenge](test_challenges_debrief.md):
  - helpers swapped for populators, the landing unit test turned into an API test, and a batch no-history test added;
  - 6 tests strengthened and duplicates dropped.
- [Performance](performance_challenges_debrief.md):
  - fixed a 2N populate regression for batches;
  - a single invocation still populates twice (decision 4).
- [Codex review](codex_review.md):
  - sample-sheet URI metadata is now validated before history creation;
  - the URI-dataset-to-collection finding needs a decision (decision 1).
- [Thermo-nuclear review](thermo_nuclear_review.md): 7 cleanups, no behavior change.
- [Baseline refactor](baseline_refactor.md): two refactor commits lifted onto dev; the final tree is byte-identical.
- [Scope evaluation](scope_evaluation.md): modest expansion recommended; see below.
- Branch check:
  - `make format` is clean;
  - mypy (from `lib/`, as `make mypy` does) on the changed files gives the same 11 errors on base and head, none new.
- Tests:
  - unit, `test/unit/workflows` + landing manager: 296 passed, 2 skipped;
  - workflow API selection: 185 passed, 1 skipped;
  - `test_landing.py`: 23 passed.
  - On the refactor-only commit `7e670abd636`: 297 unit, 25 API and 20 landing tests passed.
  - On `7848553da11`: 297 unit tests passed.
- The four inherited API reds from earlier drafts are fixed.
- **Regression, fixed by decision 1:** integration `test_dataset_copy_metadata_files.py::test_metadata_copied_to_copied_outputs` failed with a 400 "a dataset collection is required but a dataset was supplied". The test's input declaration has been fixed.

## Decisions for John

1. **Dataset supplied to a collection input. Decided 2026-11-05 (John): reject it and fix tests that are wrong.**
   - The check is folded into `f4d51ef252a` (head `cf54435a4ef`; old head kept as `backup/issue_20900_before_uri_kind_20261105`): `InputModule.validate_input_kind`, also applied to `src: url` / `File` requests. New test `test_run_with_dataset_url_for_collection_input_creates_no_history` was red before the fix.
   - Declarations fixed to `data`: `test_metadata_copied_to_copied_outputs` (integration, 2 passed) and `test_run_workflow_from_url_with_implicit_conversion_on_collection`.
   - Checks after the change: 32 related API tests passed; 297 unit tests passed, 1 skipped; ruff, black and isort clean; no mypy errors in the changed files.
   - A static scan of the framework workflow tests and of the workflows embedded in Python tests found no other dataset test data on collection inputs. Fork CI is the remaining check.
2. **Collection-type check. Decided 2026-11-05 (John): fix the Galaxy bug instead of skipping `list`.**
   - Root cause: `_parse_state_into_dict` filled a missing `collection_type` key with `list`, but kept `null` (an editor-cleared type). So gxformat2 `type: collection` inputs and `.ga` files without the key became `list`-only. A probe confirmed this across save, export and re-import.
   - `2aab3a22916`: a missing type stays `None`, and new editor nodes still start as `list` via `stateOverwrites` in `inputs.ts`. Tests: the tightened unit test `test_data_collection_input_default_state` and the new client `inputs.test.ts` were both red before.
   - `bcbd2de187c`: `HistoryQuery` `direct_match`/`can_map_over` check on collection inputs; untyped inputs accept anything. New tests: `test_run_with_incompatible_collection_type` (paired↔list, red before) and `test_run_with_untyped_collection_input_accepts_any_collection_type`.
   - Workflows already stored with an implicit `list` stay `list`, and the API now enforces it as the run form already did.
   - Checks on head `bcbd2de187c`:
     - full `test_workflows.py`: 543 passed;
     - framework workflows: 91 passed;
     - unit: 297 passed;
     - lint, mypy, prettier and eslint clean.
3. **`requires_materialization` across batch entries.**
   - The flag is sticky across entries, so one entry needing materialization marks the later ones too.
   - Dev has the same behavior; the branch preserved it. Fixing it is a small expansion.
4. **Double populate on a single invocation.** Fixing it means changing commit to flush in the side-effect loop, which also rolls back the history if `queue_invoke` fails. It's a transaction behavior change, so it stays separate.
5. **Broader suites.** These have now run: the full workflow API file, the framework workflows and the one integration test. Other integration suites, the browser suites and fork CI haven't.
6. **PR shape.** `scope_evaluation.md` lists three split options. John's 2026-10-16 decision ("do not PR as-is") was about waiting for the extractions, which have all merged.

Once decided, after scope work:

- a normal review;
- a fresh test challenge if more than 3 tests change;
- an integration and fork CI run.

The earlier reviews still apply to unchanged code.

## Snapshot

```text
hardening @ 9f2d892ad170 → differential-review/snapshots/20261105T115302Z-hardening-9f2d892ad170.json
  since 20261104T154002Z-implementation-3c9b3fbed607:
    commits: 0 same, 0 rebased, 2 changed, 3 new, 1 dropped
    hunks:   15 carried, 7 changed, 10 new, 6 dropped
```

[Rebase reconciliation](rebase_reconciliation.md) · [Previous debrief](earlier_drafts/2/implementation_debrief.md)
