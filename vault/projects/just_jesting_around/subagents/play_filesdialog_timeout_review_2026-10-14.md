# FilesDialog initial source wait review

PASS: reviewed the three-line timeout repair and found no required fixes. No implementation edits were made. The driver captured actual exit 0 for the full browser retry: 96 files / 556 tests passing.

Not acted on:

- No additional mutation proof: the change only extends an existing synchronization deadline and preserves every assertion.
- No unrelated lane-history review or production changes: scope is the content delta from `7735bca75f6cd48dc0b63665e612e304fe34c454` to `d131c706917c45db80857d83473d002ccb337873`.
- No process termination or independent full gate rerun: the driver owns the running retry and its actual exit result.

## Details

Read the project iteration, story conventions, branch/worker instructions, shared review/security policies, and Galaxy branch/workhorse instructions. No additional AGENTS.md was found in the worktree or checked worktree ancestors.

The entire scoped delta changes only `client/src/components/FilesDialog/FilesDialog.stories.ts`: `seeRows` accepts an optional `{ timeout: number }`, forwards it to `waitFor`, and `seeSources` passes `{ timeout: 5000 }`. The callback remains exactly `expect(rows(canvas).map(nameOf)).toEqual(names)`. Exact row count, names and order therefore remain checked. All fixture arrays, checkbox checked/partial states, selection button checks, templates `findByRole`, FTP/error checks, and later positive/negative synchronization remain unchanged. The surviving FilesDialog unit file is byte-identical to the pre-repair file.

Only `seeSources` supplies the new timeout. `openNamed` and `goBack` still omit it. Inspected the installed Testing Library DOM 10.4.2 implementation: `waitForWrapper(callback, options)` spreads `options` into its internal options object; spreading undefined adds no fields, and the inner timeout defaults to `getConfig().asyncUtilTimeout` (1000). Passing explicit undefined thus preserves the previous default timing and all other wait semantics. The five-second first data wait follows STORY_CONVENTIONS.md. It is a retry deadline, not an unconditional delay.

Gate18's original failure log identifies `Selects Files`, no rows, and the stack from `seeSources` into `seeRows`. This supports the narrowly targeted initial asynchronous listing wait repair. Focused repaired logs each show 14/14 passing (tests 1.35s and 1.34s); the surviving unit log shows 1/1 passing. Parent supplied actual exit 0 evidence for these runs and lint/type/format checks. The retry log inspected during review shows 96/96 files and 556/556 tests passing. The driver subsequently captured terminal exit 0 from retry session 80313 and confirmed the worktree remains clean. The driver also confirmed whole-unit session 90025's terminal exit 0 (516 tests / 86 files), with the unchanged surviving unit passing after the repair.

Verified immutable base `4e522d66ade7f8896b346aaca27fde50e03ed406` is an ancestor of reviewed HEAD. `git diff --exit-code 69e7bfb3bde..HEAD` succeeds; both entire trees are `f217d748342edd2645b1fc0f02fcdf0c992e10d8`. The pinned lower base lacks `seeRows` and `seeSources`, confirming the repaired helpers belong to the play commit. The lane range contains exactly one `Test-File: client/src/components/FilesDialog/FilesDialog.test.ts` trailer, on folded commit `737515477433b15c792f2cbdbb4b58439e313688`; its trailer and Co-Authored-By remain together. The Galaxy worktree was clean at review.
