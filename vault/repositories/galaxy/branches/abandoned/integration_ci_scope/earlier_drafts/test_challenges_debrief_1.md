# Integration CI selector test challenge

The selector now has meaningful coverage across the actual Git comparison, command-line environment output, pytest collection, expensive setup and sharding boundaries. Review fixes close shared S3/Cloud and dataset/HTTP/tool execution mapping omissions. All 51 focused tests pass; no blocking findings remain. Reviewed under REVIEW_FOCUS.md and GX_CHALLENGE_TESTS.md on 2026-10-08.

## Findings acted on

- Cloud imports the S3 XML parser. Changes to `s3.py` and its imported multipart helper now select both S3 and Cloud, including pure Cloud module tests. Added real Git/script regressions for both inputs.
- Dataset services implement direct-download redirects and tee streaming. Their edits previously deselected the very plugin suites validating those behaviors. Added conservative full-suite mappings for dataset/history-content managers and endpoints, file sources, tool execution, jobs API, shared HTTP/API infrastructure, and shared dataset schema. Tests exercise representative concrete inputs through real commits and the selector script. The intentionally unrelated histories API case still selects no expensive families.
- Moved pytest-specific deselection into `integration_selection_pytest.py` and annotated Config/Item types. The changed-path policy remains a standard-library-only module usable before test dependencies are installed.
- Typed raw GitHub event JSON as `dict[str, Any]`; runtime invalid/missing-data handling remains conservative.
- Added a real CLI-to-pytest test proving Kubernetes changes start its class setup while remote iRODS setup remains unstarted, with disk coverage retained.
- Added unrelated Git histories, missing/malformed event files, and malformed top-level selection JSON regressions. These exercise fallback to the full suite rather than mocking Git or pytest.
- Corrected implicit string concatenation lint diagnostics in the new test file. Updated documentation for shared dataset/tool plumbing and Cloud/S3 parser dependencies.

## Test challenge decisions

Kept the existing tests: policy examples protect externally meaningful CI behavior through temporary real Git repositories and subprocess execution, rather than merely mirroring classifier internals. The synthetic pytest suite uses real unittest startup and pytest fixtures to observe whether expensive work actually starts. Its collection/sharding tests check preserved unconditional classes/functions, module-generated tests, inherited Cloud/S3 dependencies, fail-open malformed markers, and packing after selection. No tests were deleted or assertions weakened.

The placement in `test/unit/` is appropriate under `doc/source/dev/writing_tests.md`: this infrastructure does not require a Galaxy server. Browser/API-layer tests would introduce unrelated dependencies without improving verification of GitHub event processing or pytest collection. No mocks or SimpleNamespace objects were introduced. No E2E browser test was warranted.

Kept shared service preparation unchanged: unconditional integration suites still depend on Minikube, PostgreSQL, RabbitMQ, Apptainer and mulled-cache. This patch selects expensive plugin suites; it does not claim to eliminate all integration startup cost.

## Validation

- `PYTHONPATH=lib .../.venv/bin/python -m pytest -q test/unit/test_integration_selection.py test/unit/test_shard.py`: **51 passed** (43 selector cases and 8 existing shard tests).
- Focused mypy with `--follow-imports=silent`: **no issues in 3 source files**. Using `skip` first yielded an artificial untyped pytest-decorator diagnostic because imports were suppressed; the canonical silent check resolves pytest normally.
- Black and isort checks pass for the four new policy/hook/script/test modules; Ruff passes; `git diff --check` passes.
- Actionlint passes on integration.yaml with shellcheck disabled and the existing constant-false condition diagnostics excluded.
- Coordinator independently collected the real integration suite: full 1,745 items; unrelated selection retained 1,467; Cloud-only retained 1,483; S3-boto-only retained 1,516. Four selective shards contained 202/271/596/398 items, whose union equals all 1,467 selected items with no missing or duplicate IDs. These are collection checks; real Galaxy fixtures and external services were not started locally.

## Remaining limitations

Static source mappings require review when adding new shared dependencies or plugin families. Unmarked tests and unknown/malformed markers remain unconditional, and changes to shared tests, configuration, dependencies and missing/invalid GitHub comparisons select the full suite. Schedules, manual dispatch and local runs without selection retain full coverage. Full external-service integration execution remains for CI.

No review recommendation was declined beyond keeping service preparation and avoiding unrelated application/browser tests for the reasons above. The coordinator owns tracking-file sync and implementation handoff.
