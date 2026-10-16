# Integration CI selection: requested relocation

STATUS: READY for human review. Branch `integration_ci_scope` now ends at `c6d90c4f585cbb94f6835d14d631d44c126430e2`, following initial implementation `2a8c363a62d6e1ec9e9eebdc663584d92264460f` directly off dev `65421d5f420`. Scope review recommends keeping the requested relocation; there is no blocker or scope decision. Full external-service execution remains pending fork CI.

## Final layout and behavior

Moved the detailed guide and both selection modules beside their owning suite:

- `test/integration/INTEGRATION_TEST_SELECTION.md`
- `test/integration/integration_selection.py`
- `test/integration/integration_selection_pytest.py`

The workflow-facing CLI remains `scripts/select_integration_tests.py`. It explicitly adds the repository's `test/` directory before importing the standard-library-only policy. Integration conftest/hook imports are package-relative; unit and synthetic-suite imports point to the relocated modules. Documentation references the new policy path. No obsolete copies or production references remain in `lib/galaxy_test/` or `scripts/`.

The selection policy is byte-identical: marked expensive plugin families are selected from source dependencies; general integration tests stay enabled; shared plumbing and uncertain input retain full coverage. Selection still happens before setup and sharding. Shared service preparation remains unchanged.

## Review and validation

Normal revision review found no production corrections needed. Accepted the fresh test challenge's isolated CLI regression: a real Azure diff selects only Azure when launched from an unrelated temporary repository with Python `-I -S`. No recommendation was declined. The scope evaluation recommends keeping the requested ownership relocation, without changing CLI location, packaging, or CI optimization scope.

- 52 focused tests passed: 44 selector and 8 existing shard cases.
- Full real integration collection is 1,745 test IDs, exactly matching the prior baseline.
- Empty-family selection is 1,467 IDs with 278 deselected, exactly matching the prior selective set.
- Combined unit/real-integration collection retains all 44 unmarked unit cases and deselects the 10 marked redirect tests.
- Dependency-free CLI startup passed. Focused mypy, Black/isort/Ruff, actionlint with existing unrelated diagnostics excluded, diff checks and applicable commit hooks pass.
- Previous four-shard union evidence remains applicable because collection sets and shard logic did not change. Full Galaxy/container execution and timing measurements remain for CI.

Normal review is recorded in `subagents/relocation_review.md`; the fresh challenge is `test_challenges_debrief.md`; the current scope decision is `scope_evaluation.md`. Initial implementation/challenge/scope history is preserved under `earlier_drafts/`. Branch notes now follow the current required `gx_branches/branches/integration_ci_scope/` layout.

## Remaining limits

Static dependency mappings need maintenance. Shared Minikube/service preparation and repeated full-history fetches remain possible later optimizations based on CI timing evidence. The requested revision introduces no new behavior or application/browser UI requiring screenshots.
