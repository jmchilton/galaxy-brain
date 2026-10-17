# Test challenges debrief — issue_19234_batch_mode_hint_25.1 (round 2)

Acted on: nothing needed changing. Re-ran every check fresh against the post-rescope head `de8046bcdf3`. Baseline commit passes on base code (23/23), head passes (30/30), and with base `FormData.vue` + `variants.ts` exactly the 8 non-baseline-pinned tests fail, each at its own assertion. No commits, no push; head unchanged at `de8046bcdf3`.

Not acted on:
- **No E2E/Selenium test.** There is no tool-form Selenium coverage of the batch/map over info line to extend. A new test needs a `list:paired` fixture, a paired-input tool flow, and a new navigation selector, all to check a hint string in a 25.1 backport. The server side (`map_over_type` on options) predates this branch and API tests cover it. The jest tests mount the real component with server-shaped options, including the drag-and-drop path.
- **No API/integration rewrite.** The rule under test is client rendering only.
- **No mock cleanup.** No new mocks. The tests reuse the file's existing `createTarget` (testing pinia + `FontAwesomeIcon` stub). Fixtures are plain option objects in the existing `defaultOptions` style.
- **No pure-helper extraction for `mapOverUnit`.** `isBatchSelection` is already a pure helper in `variants.ts`. Pulling `mapOverUnit` out as well would only duplicate assertions the DOM tests already make with no mocks. It would also add surface to a backport.
- **Kept the two multi-selection tests.** "Any of multiple maps over" (mixed) and "names no job unit when several map over" (homogeneous) look alike. The homogeneous one guards a different likely bug: deriving a unit when every selection shares a `map_over_type`. So it is not a duplicate.
- **First baseline test now expects a unit.** Its assertion changed after the baseline commit (`MAPPED_OVER` → `MAPPED_OVER_PER_DATASET`), so the head version is red on base code. This is fine. The baseline commit still pins the old text and passes on base. The later change is stricter: it is red→green for the unit wording.

## Details

### Per-test challenge (`client/src/components/Form/Elements/FormData/FormData.test.js`, `describe("FormData batch hint")`)

| Test | Commit role | Base impl result | Verdict |
|---|---|---|---|
| collection on `data` input → "one job per dataset" | baseline (later strengthened) | fails at `toMatch` (no unit) | keep |
| single dataset on `data` input → no info | baseline | pass | keep |
| multiple datasets → batch mode text (exact `toBe`) | baseline | pass | keep |
| collection directly on collection input → no info | baseline | pass | keep |
| multiple directly selected collections → no info | baseline | pass | keep |
| nested `list:paired` on `paired` input → "dataset pair", `batch: true`, no checkbox | fix | fails at `info.exists()` | keep |
| toggle selection both ways | fix | fails at `info.exists()` | keep |
| dropped `list:paired` → emitted `map_over_type: "paired"` + hint | fix | fails at `info.exists()` | keep |
| any of multiple selections maps over → plain mapped over line | fix | fails at `info.exists()` | keep |
| `single_datasets` → "dataset" | unit | fails at `info.exists()` | keep |
| unlabeled `paired_or_unpaired` → `<code>` fallback | unit | fails at `info.exists()` | keep |
| several map over selections → no unit | unit | fails at `info.exists()` | keep |

None of these tests check implementation details. They assert rendered text with end-anchored exact regexes, emitted payloads, and checkbox presence, and none of them read component internals. The `batchInfoText` helper asserts `info.exists()` before reading text, so a red test fails at an assertion and not on an empty-wrapper throw.

### Best practices
- `client/README.md` (25.1 is on Jest + vue-test-utils): the tests mount the component and check rendered features. Prettier/eslint were already clean.
- `doc/source/dev/writing_tests.md`: this is a client component, so a Jest test in `client/src` is the right layer.

### Verification (fresh, this round)
- `9b6f39b7609` test file + base impl: 23/23 pass.
- Head `de8046bcdf3`: 30/30 pass.
- Head tests + `8bb256be5b1` `FormData.vue`/`variants.ts`: 8 fail, 22 pass. Every failure is at an `expect` (7 at `batchInfoText`'s `exists()`, 1 at `toMatch`).
- Command: `npx jest --config tests/jest/jest.config.js src/components/Form/Elements/FormData/FormData.test.js`, with node 22.20.0. The worktree was restored afterwards and is clean.
