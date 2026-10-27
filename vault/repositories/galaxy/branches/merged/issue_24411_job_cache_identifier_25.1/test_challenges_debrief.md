# Test challenges debrief (round 2, after re-scope)

No tests dropped. Two helper swaps, one strengthened assertion, one new populator helper. Every test re-checked red/green against base, the pre-rescope fix, and each production change on its own. New head `108d662a5ef` (baseline `78ff86441f5`, fix `11535a475cd`). Pushed to `jmchilton`. Round 1: [earlier_drafts/1/test_challenges_debrief.md](earlier_drafts/1/test_challenges_debrief.md).

## Changes

- **Workflow test (baseline commit).** `test_workflow_rerun_mapped_identifier_step_with_use_cached_job`:
  - inline collection-copy POST replaced with existing `dataset_collection_populator.copy_collection`.
  - dropped redundant `wait_for_invocation_and_jobs` (`invoke_workflow_and_wait` already waits on invocation + history jobs).
  - strengthened: `copied_from_job_id` truthy -> equals the first invocation's `identifier_single` job id. New class helper `_identifier_single_job_id(invocation_id)` (used twice).
- **Rename test (re-scope commit).** PUT `users/{id}/information/inputs` with `address_0|desc` now appears 3x in the API suite (test_users, test_tools, here). Added `BaseDatasetPopulator.set_user_address(desc)` and used it in `test_cached_job_mapped_run_skips_renamed_input`. `test_tools.py::test_model_attributes_sanitization` and `test_users.py::test_information` not migrated to avoid churn on a 25.1 fix branch (follow-up candidate on dev).
- Fixups autosquashed into their commits. Lint (black, ruff 0.13.3, isort, flake8+bugbear) clean on every commit via `rebase --exec`.

## Challenges

- **Unit tests:** none on the branch; mock/dataclass/restructure checks n/a. `wrappers.py`/`evaluation.py` changes only show up through the JobWrapper late search in a real run; a unit test would assert a flag is set (implementation test).
- **Baseline `mapped_run_reuses_mapped_job`:** positive control for the shared fixture (identifier != dataset name); without it the "skips" tests would pass if mapped caching broke. Kept.
- **Baseline `name_agnostic_plain_run_reuses_mapped_job`:** guards NOT EXISTS guard against over-excluding name-agnostic tools. Kept.
- **Baseline workflow test:** refutes the re-scope review's cross-history concern. Kept, strengthened.
- **Three "skips" tests (fix commit):** distinct #24411 cases, each tied to a production change (table below). Kept.
- **`mapped_run_skips_renamed_input` (re-scope):** only test for the mapped name condition. Kept.
- **`evaluation.py` `tool_evaluator=self`:** still no red test. Path only serves aliases not fully prefixed (e.g. multi-value `input11`); no test tool known to reach it through `.name`. Accepted as a one-line consistency fix, as in the re-scope debrief.
- **Location:** identifier-search tests live in `test_jobs.py`; not moved to `test_tools.py`.
- **E2E:** none needed; backend cache matching, no UI change.
- **writing_tests.md:** API tests preferred over integration; tests use populators and `require_new_history`. Consistent.

## Red/green (serial runs, `lib/galaxy_test` at tip)

| `lib/galaxy` state | Result |
| --- | --- |
| `origin/release_25.1` | test_jobs: 2 baseline pass; 4 fail at own assertion (`plain_run_skips_mapped_job`, `mapped_run_skips_plain_job`, `mapped_run_skips_other_identifier`, `renamed_input` `copied_from_job_id ... is None`). Workflow baseline test: pass |
| tip, `managers/jobs.py` at `11535a475cd` (pre-rescope) | only `renamed_input` fails (`'<job>' is None`); 5 pass |
| tip, `managers/jobs.py` at base | `plain_run_skips_mapped_job` + `renamed_input` fail; 4 pass |
| tip, `tools/wrappers.py` at base | `mapped_run_skips_plain_job` + `mapped_run_skips_other_identifier` fail; 4 pass |
| tip `108d662a5ef` | `test_jobs.py -k "test_cached_job_ or search"` 16 passed; `test_workflows.py -k cached` 9 passed |

Each production change except the `evaluation.py` one-liner has a test that fails on its own assertion without it. Worktree clean.
