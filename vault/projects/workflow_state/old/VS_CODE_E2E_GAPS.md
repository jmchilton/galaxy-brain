# VS Code Galaxy Workflows Extension — E2E Test Coverage Gaps & Expansion Plan

**Date:** 2026-04-12
**Branch:** `wf_tool_state`
**Related:** `VS_CODE_ARCHITECTURE.md`, `VS_CODE_E2E_TEST_CACHE_PLAN.md`

Principle: fewer, more useful tests. Each proposed test exercises a real client ↔ server integration path that server-level tests can't cover.

---

## Current coverage

Existing E2E files:
- `client/tests/e2e/suite/extension.ga.e2e.ts`
- `client/tests/e2e/suite/extension.gxformat2.e2e.ts`

| Area | `.ga` (native) | `.gxwf.yml` (format2) |
|---|---|---|
| Clean command | Yes | N/A |
| Preview convert | Yes | Yes |
| Export convert | Yes | Yes |
| Convert-file (in-place) | Yes | Yes |
| Validation profile switch | Yes (basic → iwc → basic) | No |
| Schema validation (required fields) | Yes (T2, uncommitted) | Yes |
| Tool state: uncached diagnostic | Yes (T3, uncommitted) | Yes (but fragile — see below) |
| Tool state: legacy string hint + code action | Yes (T1, uncommitted) | No |
| Completions (any) | No | No |
| Hover (any) | No | No |
| Document symbols | No | No |

**Hermeticity:** resolved in commit `2fec34e`. `cacheHelpers.ts` provides `useEmptyCache()` (per-test temp dir) and `ensureSharedCache()` (shared `client/tests/e2e/.cache/` populated via `populateTestCache.ts` from the toolshed, skips suite on offline). `resetSettings` now also clears `toolCache.directory`. Empty-cache format2 smoke and native clean tests converted; new populated-cache suites added for tool-aware clean (IWC fastp/multiqc) and cached-tool no-cache-miss assertion.

**Shared E2E abstractions** (commit `6e0fc95`, use in new tests below):
- `usePopulatedCache(tools?)` — `before`/`beforeEach` pair; skips suite if offline. Use inside any `suite(...)` that needs the shared cache.
- `withTempFixture(uri, fn, extras?)` — copies fixture to temp, runs `fn`, cleans up source + extras. Use when the test mutates the file or the command emits a sibling (convert-file).
- `waitForDiagnosticMatching(uri, pred)` / `waitForDiagnosticGone(uri, pred)` — polling predicates; prefer over `waitForDiagnostics` + `.find()`.
- `isCacheMissDiagnostic(d)` — `"not in the local cache"` Information predicate.
- `runConversionSuite(opts)` — parameterized preview/export/convert-file test trio.

---

## Proposed new tests (6 tests, high value / low overlap)

### T1. Native: legacy `tool_state` hint + "Clean workflow" code action ✅ (uncommitted)

- Open `wf_01_dirty.ga` (string-encoded `tool_state`)
- Assert a Hint diagnostic with code `legacy-tool-state`
- Request code actions at that diagnostic range
- Assert the "Clean workflow" quick fix is offered
- **Why:** Central migration UX path. Untested E2E. Server tests validate diagnostics but the code-action → workspace-edit → re-validate round-trip is only exercisable E2E.
- **Fixture:** existing `json/clean/wf_01_dirty.ga`
- **Status:** Implemented in `extension.ga.e2e.ts` "Code Actions" suite. Asserts hint severity, presence of quick fix, `WorkspaceEdit` applies, document text changes, and `legacy-tool-state` hint clears post-apply. Added `waitForDiagnosticMatching(uri, predicate)` helper (also listed under Helper additions). Uses `useEmptyCache()` + `copyToTemp` to avoid toolshed race and fixture mutation.

### T2. Native: schema validation produces errors for invalid workflow ✅ (uncommitted)

- Open a `.ga` missing required fields (e.g. no `"steps"`)
- Assert Error diagnostics for missing required properties
- **Why:** Parity with the format2 schema validation test. Ensures the JSON Schema generated from Effect schemas actually fires in the real extension.
- **Fixture:** new `json/validation/test_wf_missing_fields.ga` — minimal invalid JSON workflow
- **Status:** Implemented in `extension.ga.e2e.ts` "Validation Tests" suite. Fixture omits both required fields (`a_galaxy_workflow`, `format-version` — `class` is filtered by the native schema loader since it's a format2 artifact). Asserts both show up as Error-severity `Missing property "…"` diagnostics (note: vscode-json-languageservice uses `Missing property` not `Missing required property` as format2's custom validator does). Existing `test_wf_00.ga` was unusable: it satisfies all three native-schema required fields.

### T3. Native: uncached tool state diagnostic ✅ (uncommitted)

- Open a `.ga` with object-valued `tool_state` referencing an uncached tool
- Assert an Information diagnostic "not in the local cache"
- **Why:** Parity with the format2 smoke test. Validates Pass A's cache-miss path through the real extension.
- **Fixture:** new `json/tool-state/test_ts_smoke.ga` — minimal native workflow, one tool step, cleaned `tool_state`
- **Status:** Implemented in `extension.ga.e2e.ts` "Tool State Validation Tests (empty cache)" suite, mirroring the format2 variant. Fixture created at `test-data/json/tool-state/test_ts_smoke.ga` (one `data_input` + one `wc_gnu` tool step w/ object `tool_state`). Passes locally.

### T4. Format2: validation profile switch (basic → iwc → basic) ✅ (uncommitted)

- Open a format2 workflow valid under basic, fails iwc
- Assert clean under basic, switch to iwc, assert IWC diagnostics, switch back, assert clean
- **Why:** Native test covers this for `.ga`. Confirms profile switching works for the format2 server — independent process with independent config handling.
- **Fixture:** new `yaml/validation/test_wf_iwc_missing.gxwf.yml` — `test_wf_03.gxwf.yml` is missing `outputs` so schema-dirty under basic (rejected).
- **Abstractions:** mirror native profile-switch test — `resetSettings` + `updateSettings("validation.profile", "iwc")` + `waitForDiagnostics` + `assertDiagnostics`. No new helper needed.
- **Status:** Implemented (commit `7b7bcc4`) in `extension.gxformat2.e2e.ts` "Validation Tests" suite. New minimal fixture satisfies schema (`inputs`/`outputs: []`/`steps`) but omits IWC-required fields. Asserts `[]` under basic, presence of release/creator/license/doc IWC messages (+ severities) under iwc, `[]` again after reset. Presence-by-message rather than exact ranges — brittle across format2 iwc's 7+ diagnostics. 17-test E2E suite passes locally.

### T5. Format2: completions inside `state:` block ✅ (uncommitted)

- Open a format2 workflow with an empty `state:` block, tool pre-cached
- Trigger completions
- Assert expected tool parameter names appear
- **Why:** Completions are the most complex feature (three-tier format2, multi-source native). Zero E2E coverage. One test validates: cursor position → AST navigation → `findStateInPath` → tool registry lookup → `findParamAtPath` → completion items.
- **Fixture:** new `yaml/tool-state/test_ts_completion.gxwf.yml` — cached fastp step with empty `state:`.
- **Abstractions:** reused `usePopulatedCache()` — fastp already in `STANDARD_TOOL_SET`. `vscode.executeCompletionItemProvider` directly; no `triggerCompletion` wrapper yet (single call site).
- **Status:** Implemented (commit `ffec4cd`) in `extension.gxformat2.e2e.ts` populated-cache suite. Asserts `single_paired` (stable fastp param) is offered for cursor at line 10 char 6 inside the `state:` block. 18-test E2E suite passes locally.

### T6. Format2: document symbols / outline

- Open a format2 workflow with named steps/inputs
- Request document symbols
- Assert outline contains expected step and input names
- **Why:** Symbols drive the breadcrumb bar and Outline panel — user-facing navigation. Currently untested E2E for either format.
- **Fixture:** existing `yaml/conversion/simple_wf.gxwf.yml` or similar
- **Abstractions:** read-only — no `withTempFixture` needed. Use `vscode.executeDocumentSymbolProvider` directly.

---

## Implementation notes

- **T5** cache infra now exists — add the tool under test to `STANDARD_TOOL_SET` in `cacheHelpers.ts`, then `usePopulatedCache()` inside the suite. Still highest effort due to AST-driven completion plumbing.
- **Helper additions:**
  - ✅ `waitForDiagnosticMatching(uri, predicate, timeout)` + `waitForDiagnosticGone` + `isCacheMissDiagnostic` in `helpers.ts`.
  - ✅ `withTempFixture(uri, fn, extras?)` in `helpers.ts` — use for any test that mutates the fixture on disk.
  - ✅ `usePopulatedCache(tools?)` in `cacheHelpers.ts` — replaces inline `before`/`beforeEach` pairs.
  - ✅ `runConversionSuite(opts)` in `conversionSuite.ts` — parameterized preview/export/convert-file trio.
  - A `triggerCompletion(uri, position)` helper would help T5.
- **Fixture creation:** T2, T3 need small new fixtures (< 20 lines each). T5 needs a fixture aligned with a tool already in the shared cache.
- **Auto-resolution caveat:** opening a `.ga` with tool steps schedules a 300ms-debounced toolshed fetch (see `extension.ga.e2e.ts` empty-cache test). For T1 use `useEmptyCache()` + a fixture whose `content_id` (e.g. `wc_gnu`) won't resolve, to avoid the clean output drifting mid-test.

---

## Priority order

1. ~~**T1** (legacy tool_state code action)~~ — ✅ done (uncommitted)
2. ~~**T3** (native uncached tool diagnostic)~~ — ✅ done (uncommitted)
3. ~~**T2** (native schema validation)~~ — ✅ done (uncommitted)
4. ~~**T4** (format2 profile switch)~~ — ✅ done (uncommitted)
5. **T6** (document symbols) — straightforward
6. ~~**T5** (completions)~~ — ✅ done (uncommitted)

---

## Unresolved questions

- General: is CI currently running E2E tests? If not, address first.

Resolved (2026-04-12, commit `2fec34e`):
- ✅ `toolCache.directory` can be updated mid-session — `useCacheDir()` does `updateSettings("toolCache.directory", dir)` + 500ms sleep for `ToolRegistryService.configure()` to rebuild.
- ✅ Cache entry format = `@galaxy-tool-util/core` `index.json` (`{entries: {[hash]: {tool_id, tool_version, ...}}}`); populate via `populateTestCache.ts`.
