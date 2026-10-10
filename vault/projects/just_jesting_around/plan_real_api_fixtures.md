# Plan: real API response fixtures

Client unit tests and stories read API responses that a live Galaxy actually returned, instead of hand-written mock payloads. This is the infra for lane 4 (`vitest_real_api_calls`) in [PIPELINE_BRANCHES.md](PIPELINE_BRANCHES.md). The motivation is in [USE_REAL_API_RESPONSES.md](USE_REAL_API_RESPONSES.md).

## Key decisions

1. **Committed fixtures are verbatim server responses.** No normalizing ids, timestamps or names in stored data. Normalized data would be synthetic again.
2. **No re-validation against pydantic models when writing.** Internal models don't match the external ones (id encoding and similar conversions). The endpoint's `response_model` already validated the response on the way out.
3. **The tolerance lives in a comparison layer, not in the data.** The comparison decides whether a newly captured response differs *meaningfully* from the committed one. One flag selects the mode:
   - unset: write to a temp dir. CI runs the generators and changes nothing.
   - `update`: rewrite only the fixtures that meaningfully changed, and print the diff.
   - `rebuild`: overwrite every fixture without comparing.
   - `check`: fail on any meaningful change. This is the drift check.
4. **Comparator rules are conservative.**
   - Volatile values are found by pattern, not key name: encoded ids, ISO datetimes, the server URL and port.
   - An old → new id mapping must stay one-to-one, so cross-references still line up.
   - Everything else is significant: keys, types, nullness, enum values, list length and order.
5. **Make inputs deterministic rather than tolerating differences in the output.** Use fixed names wherever the generator controls them. A random-suffix pattern rule is only the fallback for the shared API-test server.
6. **Fixtures live in one central dir: `client/src/api/__fixtures__/`.**
7. **Fixtures are named by OpenAPI path + method:** `<openapi path>/<method>[.<status>].<scenario>.json`, for example `api/histories/{history_id}/get.view_detailed.json`. The status appears only for non-2xx. The scenario is `default` when there's only one. operationIds were rejected because 426 of 504 are FastAPI defaults that move when a Python function is renamed. Schema names were rejected because one model is returned by many endpoints.
8. **The Python capture helper takes the path template and makes the request itself,** so filenames are computed, never hand-written.
9. **Config-dependent responses come from `test/integration/` classes,** one class per config, using `handle_galaxy_config_kwds`. Default-config responses come from `lib/galaxy_test/api/`.
10. **Every capture asserts why it exists.** For example, a `state_error` fixture asserts that `state == "error"`.
11. **Synthetic data is allowed only as factories over a real fixture,** marked as simulated and noting which generator change would replace it.
12. **The Tool Shed fixtures are out of scope.** They stay separate.
13. **Each capture lands with its first consumer.** The generator's capture call, the fixture file and the first test or story that uses it go in the same commit. That keeps both `check` (a missing file counts as a change) and the unimported check green at every commit. The helper infra still lands first, in its own commits.

## Requirements

- R1. A capture helper in `galaxy_test.base` that works from both the API and the integration test cases.
- R2. A pure-function comparator with unit tests. It needs no server.
- R3. The four modes from decision 3, selected by one env var.
- R4. In package/installed layouts, where `client/` is absent, the write modes require an explicit output dir. The unset mode still works.
- R5. A TS loader that returns a fixture typed from `GalaxyApiPaths[path][method]` responses, with no hand-maintained index.
- R6. A stale-fixture check: every `<path>/<method>` under `__fixtures__` exists in the OpenAPI schema.
- R7. A regen command for each generator module, documented in one place.
- R8. `check` mode runs in the existing API and integration CI jobs. No new server-backed job.
- R9. An unimported-fixture check: every fixture file is referenced by at least one `apiFixture(...)` call in `client/src`, whether from a test, a story or a factory. `apiFixture` arguments must be string literals so the check can find the calls.

## Acceptance criteria

- AC1. Running `update` twice in a row against fresh servers yields **zero** rewritten fixtures the second time. This proves ids and timestamps are tolerated.
- AC2. Hand-editing a committed fixture (flip an enum, drop a key) makes `check` fail and name the file and JSON path.
- AC3. Breaking an id cross-reference in a committed fixture makes `check` fail.
- AC4. `rebuild` overwrites everything; `git diff` shows only volatile-value churn.
- AC5. Renaming an endpoint path in the schema makes the stale-fixture check fail.
- AC6. At least one default-config capture and one integration-config capture, each consumed by a converted client test. That test is green under `unit`, and under `storybook` if storified.
- AC7. The converted tests contain no inline response payloads. Edge cases use factories over the real fixture.
- AC8. CI is green with `check` enabled in the API and integration jobs.
- AC9. Capturing a fixture that nothing uses fails the unimported check and names the file. So does an `apiFixture` call with a non-literal argument.

## Plan

Tests are red-to-green throughout. Run server-backed tests one at a time.

### Phase 1: comparator (pure Python)

- `lib/galaxy_test/base/client_fixtures.py`: `compare(old, new) -> list[Difference]`.
- `test/unit/test_base/test_client_fixtures.py`, written first and failing. Cases:
  - id swapped for another id → equal
  - datetime swapped for another datetime → equal
  - server URL or port swapped → equal
  - broken cross-reference → differs
  - key added or removed → differs
  - type change → differs
  - null ↔ value → differs
  - enum value change → differs
  - list reorder → differs
  - per-fixture override hook → equal
- Each `Difference` carries the JSON path, so `check` failures point somewhere useful (AC2).

### Phase 2: capture helper, naming, modes

- `capture(method, path_template, scenario, status=None, params=..., **path_params)` on the populator or interactor side:
  - formats the URL and makes the request
  - asserts the status
  - computes the filename (decision 7)
  - applies the mode
- Writes `json.dump(indent=2)` and keeps the server's key order. Prettier already ignores `*.json` in `client/`.
- Unit tests for `path_template → filename`: params, non-2xx status, scenario slugs. Also unit tests for mode dispatch against a temp dir with a stubbed comparator.

### Phase 3: first generators

- `lib/galaxy_test/api/test_client_fixtures.py` for default-config captures.
- `test/integration/test_client_fixtures_quotas.py` with `enable_quotas`, which unlocks QuotaUsageSummary's responses.
- Run each with `update` and verify AC1 and AC4 by hand. Commit the generator modules' scaffolding here. The captures themselves are committed in Phase 5 (decision 13).

### Phase 4: client loader, stale check and unimported check

- `client/src/api/__fixtures__/index.ts`: `import.meta.glob` (eager) plus `apiFixture(path, method, scenario, status?)`, typed from `GalaxyApiPaths`.
- A vitest test for the stale-fixture check (R6, AC5) that reads paths from the generated schema.
- A vitest test for the loader that requests a missing key and expects a clear error.
- A vitest test for the unimported check (R9, AC9):
  - scan `client/src/**/*.{ts,vue}` for `apiFixture(...)` calls and resolve each call to a file key;
  - fail on fixture files no call references, and on calls with non-literal arguments.

  It runs in the `unit` project, which CI already runs. A static scan was picked over recording which fixtures tests load at runtime, because that only works on a full test run.
- Phase 3's captures have no consumers until Phase 5. Following decision 13, commit each one with its Phase 5 conversion, not on its own.

### Phase 5: first conversions

- One default-config component plus QuotaUsageSummary. Swap their inline payloads for `apiFixture(...)` in `useServerMock` handlers and stories, and move edge cases to factories (AC6, AC7).
- Go through lane 4's normal flow: ledger field `real_api_calls`, per-test commits, `Test-File:` trailers.

### Phase 6: CI and docs

- Set the mode env var to `check` in the API and integration workflows (AC8).
- Add a short regen section next to the client testing docs (R7), matching the README tone.
- Point the lane 4 entry in [PIPELINE_WORKERS.md](PIPELINE_WORKERS.md) at this plan.

## Unresolved questions

- Path params: braces `{history_id}` or `_history_id_`?
- Status segment: only for non-2xx, or always?
- Env var name and shape: one var with mode values (`GALAXY_TEST_CLIENT_FIXTURES=check`)?
- List order: always significant, or can a fixture opt out?
- Generators: dedicated modules (as planned) or inside the existing resource test files?
- Issue scope: infra only, or infra plus the first conversions?
- Mention the agent pipeline in the issue, or keep it pipeline-agnostic?
- `check` in CI: does the populator's shared server state make AC1 flaky in the API job? If so, should `check` run only in integration jobs?
