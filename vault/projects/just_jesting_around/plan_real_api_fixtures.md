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

## Known constraints

These come from the [survey](REAL_API_SURVEY.md) of `vitest_readability`.

- **Endpoints missing from the OpenAPI schema can't be captured as planned.** The stale-fixture check (R6) would reject them. They include `/api/tools` and `/api/tool_panels/*`, `/api/entry_points`, `/api/libraries/datasets/{id}`, `/api/workflows/{id}/download`, `/api/tools/{id}/build` and `/api/webhooks`. They hold the largest old payloads (`toolsList.json` with ~12 consumers, the 26 KB `run1.json`). Until each endpoint is typed in OpenAPI, its old fixtures stay as they are.
- **Module mocks and store seeding bypass the server mock.** Examples: `vi.mock("@/api/workflows")` in 7 files, `@/api` in 6, `datasets` in 5, `pages` in 4, `histories` in 3, and Pinia seeding like `setHistories([...])`. A test has to move to `useServerMock` handlers, or to store state fed from a fixture, before `apiFixture` helps it.
- **Some responses are open-ended dicts.** `/api/configuration` and `/api/datatypes/types_and_mapping` gain a key with every new config option or datatype, so `check` would churn. They need the per-fixture override hook (a subset rule), and are mainly useful as a base under factories.
- **Some responses are untyped.** `/api/datasets/{id}`, `/api/configuration`, `/api/tools/fetch` and `/api/workflows` return `unknown` or `Record<string, unknown>`, and the loader passes those types through. For them the gain is real shapes plus drift detection, not compile-time narrowing.
- **Some fixtures depend on the current time.** For example, export records drive expiry logic from `new Date()`. They need a factory that shifts dates on top of the verbatim fixture.

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
  - subset rule for open-ended dicts (a key added to a configuration-style map) → equal
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
- `test/integration/test_client_fixtures_quotas.py` with `enable_quotas`, which unlocks the quota fields on `/api/users/{id}` and `/api/users/{id}/usage`. For `multi_source` usage and `/api/object_stores?selectable=true`, reuse the DISTRIBUTED object store config in `test/integration/objectstore/test_selection_with_user_preferred_object_store.py`, which declares the quota sources.
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

- Minimum (AC6): one default-config conversion and one integration-config conversion. Swap the inline payloads for `apiFixture(...)` in `useServerMock` handlers and stories, and move edge cases to factories (AC6, AC7).
- If a test uses module mocks or store seeding (see Known constraints), move it to the server mock first, in its own commit.
- Candidates, in order. They're the quick wins from the [survey](REAL_API_SURVEY.md), all default config and low difficulty:
  1. POST `/api/tools/fetch` `paste_single` → `useUploadSubmission.test.ts`. The test currently checks a nested `outputs` shape the server reportedly never sends, so expect the converted test to go red and the parsing in `uploadResponse.ts` to need a fix.
  2. GET `/api/histories/{history_id}` `view_detailed` and `view_summary` (keys `size,contents_active,user_id`) → `SwitchToHistoryLink.test.ts`. Then rebuild the `getFakeHistorySummary*` factories (21 files) over the fixture.
  3. GET `/api/histories/{history_id}/contents` `v_dev` and `stats` → `useHistoryDatasets.test.ts`.
  4. GET `/api/datasets/{dataset_id}` `hda_detailed_tabular` → `HistoryDatasetDetails.test.js`.
  5. GET `/api/jobs/{job_id}` `full` → `JobInformation.test.js`. It replaces the drifted `jobInformationResponse.json`, and the always-passing assert there gets fixed in the same commit.
  6. GET `/api/workflows` `owned` → `api/workflows.test.ts`.
- Integration candidate: GET `/api/users/{user_id}/usage` and the quota fields on `/api/users/{user_id}` → `DiskUsageSummary.test.ts`. DiskUsageSummary mocks HTTP, while QuotaUsageSummary takes props, so QuotaUsageSummary follows via `toQuotaUsage(apiFixture(...))`. Then rebuild `getFakeRegisteredUser` (38 files) over the fixture.
- Go through lane 4's normal flow: ledger field `real_api_calls`, per-test commits, `Test-File:` trailers. The other 14 ranked endpoints in the survey are the lane 4 backlog.

### Phase 6: CI and docs

- Set the mode env var to `check` in the API and integration workflows (AC8).
- Add a short regen section next to the client testing docs (R7), matching the README tone.
- Point the lane 4 entry in [PIPELINE_WORKERS.md](PIPELINE_WORKERS.md) at this plan.

## Follow-ups found by the survey

These aren't fixture work, but are worth doing.

- `JobInformation.test.js:95`: `expect(...includes(msg));` has no matcher, so it can never fail. It's covered by candidate 5. If that candidate slips, fix it alone.
- `MarkdownVitessce.test.js:82` serves invocation `inputs` as an array, where the server sends a dict. It needs a capture of `/api/invocations/{id}` (survey row 6).
- Delete the dead fixtures `components/providers/test/json/{Dataset,DatasetCollection*}.json`, which nothing imports.
- Add the endpoints missing from the schema to OpenAPI. That unblocks their old fixtures.

## Unresolved questions

- Endpoints missing from the schema: add them to OpenAPI first, as separate PRs, or allow an untyped legacy area in `__fixtures__` that the stale-fixture check skips?
- Lane placement for the follow-ups: fix the dead-fixture deletion and the always-passing assert in lane 1 (readability) now, or with the lane 4 conversions?

- Path params: braces `{history_id}` or `_history_id_`?
- Status segment: only for non-2xx, or always?
- Env var name and shape: one var with mode values (`GALAXY_TEST_CLIENT_FIXTURES=check`)?
- List order: always significant, or can a fixture opt out?
- Generators: dedicated modules (as planned) or inside the existing resource test files?
- Issue scope: infra only, or infra plus the first conversions?
- Mention the agent pipeline in the issue, or keep it pipeline-agnostic?
- `check` in CI: does the populator's shared server state make AC1 flaky in the API job? If so, should `check` run only in integration jobs?
