# Change-aware integration CI selection

Implemented and reviewed on `integration_ci_scope` at `2a8c363a62d6e1ec9e9eebdc663584d92264460f`, based directly on dev `65421d5f420`. This is independent of the earlier `ci_trigger_scope` workflow-filter fixes. The scope review recommends keeping the implementation; no `_alt` branch is needed. Fork CI execution remains pending.

## Final behavior

A standard-library-only script, `scripts/select_integration_tests.py`, reads GitHub event data, compares PR merge-base/head or push before/after commits, and writes a versioned family selection to `GITHUB_ENV`. It also emits `GALAXY_TEST_CI_UTILS_CHANGED`, `GALAXY_TEST_CI_JOBS_PLUMBING_CHANGED`, and `GALAXY_TEST_CI_OBJECTSTORE_PLUMBING_CHANGED` as diagnostics.

Explicit pytest family markers gate the expensive Kubernetes, HTCondor, Pulsar, container and remote-objectstore suites. Direct plugin edits select their families; shared utilities, jobs/objectstore plumbing and shared application/test dependencies retain full coverage. General integration coverage remains unconditional, including fake HTCondor and disk-upload cases in mixed modules. Selection happens before fixtures/class startup and before cost-based sharding. API testing is unchanged.

Schedules, manual dispatch, missing Git history/event data, invalid comparisons, absent/malformed selection and unknown markers retain full coverage. Rename comparisons include old and new paths. Documentation is in `scripts/INTEGRATION_TEST_SELECTION.md`; placing the new section in its own file avoids reformatting the entire existing testing guide.

## Review and test challenge

Acted on the review findings:

- S3 parser/multipart changes select Cloud as well as S3 because Cloud shares those helpers.
- Dataset/download/upload APIs, services/managers, file-source and tool/job execution paths conservatively select all expensive families.
- All inherited class/module markers participate in selection. A Cloud subclass of an S3 test stays selected when either dependency changes.
- Pytest-specific code lives in a typed module, leaving the Git classifier usable before Galaxy dependencies are installed.
- Added real Git/CLI/pytest regression coverage for malformed events/selections, unrelated histories, retained disk tests, fixture startup and shard packing.

No correctness recommendation was declined. Full application/browser execution is not appropriate for the selector unit tests. See `test_challenge_debrief.md` for the review and `scope_evaluation.md` for considered alternatives.

## Validation

- 51 focused tests passed: 43 selector tests and 8 existing shard tests.
- Real integration collection without selection matches the complete baseline: 1,745 test IDs.
- Selection for unrelated changes retains 1,467 tests and deselects 278; S3-boto-only retains 1,516; Cloud-only retains 1,483, including its inherited tests.
- Four selective shards contain 202/271/596/398 items. Their union is exactly the 1,467 selected tests, without duplicate or missing IDs.
- Focused mypy passes for the three new source modules. Black/isort/Ruff, actionlint with existing unrelated diagnostics excluded, and diff checks pass. All applicable repository commit hooks pass.

These are collection and selector execution checks. Full Galaxy/container integration execution and measured wall-clock savings remain for CI.

## Scope decision and remaining work

Keep expensive-family selection as implemented. Shared Minikube/PostgreSQL/RabbitMQ, Apptainer and mulled-cache setup remains because unconditional tests still use it. Gating that preparation requires separating those dependencies and should follow CI setup/test timings. Computing selection once instead of fetching full history in each shard is another possible follow-up. Broader integration filtering and narrower dependency masks were considered but not adopted: they either enlarge this task or remove dependency coverage established by review.

Static source mappings need maintenance when adding shared dependencies or families; new unmarked tests continue running. The next practical check is fork CI, followed by measuring preparation versus test execution to choose the next optimization.
