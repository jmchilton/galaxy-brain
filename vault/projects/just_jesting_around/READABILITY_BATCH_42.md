# Readability batch 42

Four originators, one test per commit, after one shared helper commit, then one range review. CommandPalette `reports` is follow-through from batch 41's page factory; the other three were drawn with seed `2610942`. [Manifest](readability_batch_42.yml).

## Shared helper

`signIn(username = "me")` in `client/src/components/CommandPalette/test-utils.ts` signs in a `getFakeRegisteredUser` with the original id and email. It replaces local `signIn`s that cast the user `as never` in the histories and workflows provider tests (supporting, in the helper commit), and reports uses it. All 15 CommandPalette test files pass with it (326 tests). [Note](reviews/batch42/signIn.md).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| CommandPalette `reports` | `mockPage` wraps `getFakePageSummary`, so the cast is gone. A local `searchScope(key, query?, ctx?)` replaces 19 copies of the scoped-search call. [Review](reviews/batch42/reports.md). | 26 → 26 |
| LoginIndex | Split into the initial render with user creation off and the false → true `setProps` change. Commented-out register-toggle assertions and a stale TODO became live checks on the `GLink` (text and `href`), each shown to fail. Still a full mount; the deprecated `injectTestRouter` is gone. [Review](reviews/batch42/LoginIndex.md). | 1 → 2 |
| LibraryDataset | Module-level `localVue`, an `{ isAdmin }` option, `props`/`global: withPlugins`. `loadedProviderStub(item)` replaces two identical stubs; a `TABLE_FIELDS` loop checks the same ten fields. `vi.mock("app")` and `vi.mock("onload/loadConfig")` are gone: neither id resolves, so they mocked nothing, and coverage is identical. The user is still set after mount. [Review](reviews/batch42/LibraryDataset.md). | 9 → 9 |
| FormCardSticky | `DEFAULT_PROPS`, `mountFormCardSticky`, `SELECTORS`. A dead `global.components` registration is gone (the SFC imports both). Description and version are exact checks on their own elements, not `wrapper.text()` containment. The slot case the README cites keeps its shape. [Review](reviews/batch42/FormCardSticky.md). | 8 → 8 |

## Reuse and follow-through

Closes batch 41's reports follow-up. Follow-ups:
- `Login/LoginForm.test.ts` has the same stale GLink TODO, and its "hides register link when local accounts are disabled" check means something again.
- 14 test files still contain `vi.mock("app")`, which mocks nothing.
- `CommandPalette.test.ts` seeds a user inline six times with `as never`, but a later lane owns it.

Guidance: one sentence added to `client/README.md` (`5c8e96d8830`). A `vi.mock` path must resolve to the module the code imports, or it silently mocks nothing; bare ids left over from Jest's module mapping, like `vi.mock("app")`, match no module here. Evidence: LibraryDataset's two mocks, and the 14 remaining copies.

## Validation and review

103 cases across 6 suites pass; the originators' baseline was 44. Each commit's tests pass at that commit, shuffled with seed `420101`; full client vue-tsc, ESLint, Prettier and hooks pass. Per-test coverage at the batch base and the tip: no source file lost covered lines or branches (700 compared). The [independent review](reviews/batch42/review.md) approved all five commits.

Commits: `1c12e38818a` (signIn), `4885800885e` (reports), `ab31779ec0b` (LoginIndex), `bc4f8978e0a` (LibraryDataset), `285932b90c6` (FormCardSticky), `5c8e96d8830` (README).
