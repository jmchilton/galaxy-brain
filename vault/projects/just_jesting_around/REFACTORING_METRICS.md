Two sections - the pitch - a concise, empirical case for the vitest_readability refactoring loop for inclusion in a PR someday and an internal notes new agents can pick up and build/update the metrics case against.
## Refactoring Metrics - the Pitch

`vitest_readability` rewrites Galaxy's client and Tool Shed frontend unit tests one file at a time, for readability and reuse, keeping what each test checks. Each selected test gets its own commit and a review note. Tests are drawn at random with a recorded seed.

<!-- case_metrics:lane1:start -->
264 test files, dev merge-base `df3932ed4ba` → `vitest_readability` `077ef173840`, as of 2026-10-10.

| Signal | Before | After | Δ | Δ with helpers |
| --- | ---: | ---: | ---: | ---: |
| Executed tests (`vitest list`) | 2,412 | 2,878 | +466 (+19%) | |
| Line coverage (source the tests load) | 44.0% | 44.1% | +0.1 pp | |
| Branch coverage (source the tests load) | 35.8% | 36.0% | +0.2 pp | |
| Test lines | 47,030 | 43,646 | −3,384 (−7%) | −2,829 (−6%) |
| Strong Checks - exact `toEqual`/`toStrictEqual` | 654 | 764 | +110 (+17%) | +110 (+17%) |
| Weak Checks - `toBeTruthy`/`toBeFalsy` | 292 | 94 | −198 (−68%) | −198 (−68%) |
| Imports of shared `@tests/test-data` fixtures | 20 | 84 | +64 (+320%) | +65 (+310%) |
| Direct `mount`/`shallowMount` calls | 360 | 216 | −144 (−40%) | −143 (−39%) |
| `.vm` reach-ins | 276 | 161 | −115 (−42%) | −113 (−41%) |
| `as any`/`as unknown`/`as never` casts | 220 | 38 | −182 (−83%) | −182 (−82%) |
| `flushPromises`/`setTimeout` calls | 663 | 454 | −209 (−32%) | −206 (−31%) |
| `vi.mock` module mocks | 228 | 181 | −47 (−21%) | −36 (−16%) |
| `eslint-disable` | 5 | 1 | −4 (−80%) | −3 (−60%) |

Files that lost an executed test: 0 of 264; 82 gained tests and the rest kept the same count.

Coverage runs the 252 client test files at both refs (the Tool Shed frontend has no coverage provider) and measures the 1136 non-test source files they load; production code is identical at both refs.

Δ with helpers also counts the non-test files the work changed (shared helpers, fixtures, docs): 29 files changed, 746 insertions(+), 191 deletions(-).
<!-- case_metrics:lane1:end -->

What the numbers mean:
- **Less to read, more reuse.** Shared `@tests/test-data` factories and per-component mount helpers replace setup that used to be repeated in every file.
- **Stricter assertions.** Truthy/falsy checks give way to exact `toEqual`s.
- **Behaviour, not internals.** Fewer `.vm` reach-ins into component instances, and fewer whole-module mocks.
- **Fewer escape hatches.** Typed fixtures remove most casts. Manual promise flushes and real-time sleeps drop too.

**No tests were lost.** The executed-tests row comes from `vitest list` run at both refs. It counts every row of an `it.each` table, which is why it rises while the number of `it(` calls in the source falls slightly: copy-pasted cases became tables. The rise mostly splits existing checks into one test per row; it isn't new coverage. The number of `expect(` calls in the source falls about 8% for the same reason.

**Stricter assertions catch test defects.** In UserSharing, a truthy `emitted("cancel")` check became an exact `toEqual([[]])`. That exposed a second `cancel` event: the test's synthetic `GModal` emit had left the native dialog open. The test now clicks the real button through a shared `clickModalButton` helper.

## How this was generated (internal)

**Refresh the table.** From this directory, run:

```sh
uv run case_metrics.py --fetch --update REFACTORING_METRICS.md
```

This rewrites only the block between the `case_metrics:lane1` markers. Don't hand-edit that block. Run without `--update` for the full output, including the lane 2 and 3 tables and the largest per-file `expect` and case drops. Commit with explicit paths and don't push galaxy-brain.

**What it compares.**
- The script reads `~/projects/worktrees/galaxy/branch/vitest_readability` (override with `--repo`).
- Before is `merge-base(origin/dev, jmchilton/vitest_readability)`; after is the pushed tip.
- Test files are the changed `*.test.[jt]s(x)` files, following renames. The signals read them at both refs with `git show`.
- Executed tests: `--update` adds a temporary `git worktree` for each ref, symlinks `node_modules` from the main worktree, and runs `vitest list --json` in `client/` and in the tool shed frontend. `vitest list` collects tests without running them. The worktrees are removed afterwards.
- Coverage: in the same worktrees, `--update` runs the changed client test files with v8 coverage (`--coverage.reporter=json`; lines and branches are counted the way istanbul's summary counts them). The Tool Shed frontend has no coverage provider. The percentages are over the union of non-test source files that either run loads. A file loaded on only one side counts as uncovered on the other, and test helpers, fixtures and stories are excluded. Production code is identical at both refs, so any change comes from the tests. A full `--update` takes about 6 minutes. The script refuses to run if `package.json`, the lockfile or the vitest config differ between the refs, because the shared `node_modules` would then be wrong.
- Coverage losses: `--update` prints every source file whose covered lines or branches fell.
  - Each lost file's unchanged sibling test (`Foo.test.ts` beside `Foo.vue`) is rerun at both refs and its hits merged in first, since the main run loads only changed tests. A parent that now stubs a child loses nothing the child's own test still covers. The pitch percentages leave these reruns out.
  - A file the tip run never loaded is listed apart: only a dynamic `import()` can go missing, and whether it resolves before the run ends is timing. `JobMetrics.vue`'s `awsEc2ReferenceData.js` flips between runs at both refs.
  - Fix losses in the tests: restore the behaviour with a user-visible assertion, or extend the child's own test when a parent no longer renders it. Don't add a mount just to raise the number. Run candidate tests one at a time at both refs with `--coverage.include=<source>` to find which test lost it.
  - Known and accepted: `userTagsStore.ts` (24 → 20 lines) through MultipleView, from timing alone; see its review note.
- "Δ with helpers" adds back every other changed file (helpers, fixtures, `client/README.md`), so the reductions can't hide in shared code.

**Signals.** Each is a regex count over raw source, defined in `SIGNALS`:

| Row | Matches | Caveat |
| --- | --- | --- |
| `.vm` reach-ins | `.vm` | Includes `findComponent(...).vm` and child wrappers, not just `wrapper.vm` |
| Casts | `as any`, `as unknown`, `as never` | Counts `as unknown as X` once; `: any` annotations and `@ts-expect-error` aren't counted |
| Flush/sleep | `flushPromises(`, `setTimeout(` | `nextTick`, `waitFor` and fake-timer calls aren't counted; fake timers are the preferred replacement for sleeps |
| `vi.mock` | `vi.mock(`, `jest.mock(` | |
| `eslint-disable` | Any directive | |
| Truthy checks | `.toBeTruthy(`, `.toBeFalsy(` | `toBe(true)` and `toBeDefined` aren't counted |
| Exact equality | `.toEqual(`, `.toStrictEqual(` | Doesn't separate exact objects from `expect.objectContaining` inside them |
| Test-data imports | `from "@tests/test-data…"` | Alias only; local `test-utils` imports aren't counted |
| Direct mounts | `mount(`, `shallowMount(` | A helper's one `mount(` shows up only in "Δ with helpers" |

**Left out of the pitch on purpose.** The class-name selector count (full output only) matches only literal strings. Most of its drop came from moving selectors into named constants, and once those are resolved the total is roughly flat (about 366 → 363 at `1e6d8358e8f`).

**Why there are no static case or `expect` rows.** Static counts mislead: `parseBool` goes from 7 to 3 cases in the source but runs 13 tests instead of 7. The script still prints `cases`, `expects` and `.each tables` in its full output, and the executed-tests row replaces them in the pitch.

**Candidate measures.** Ranked by value for cost. Numbers marked "probe" are one-off counts from a review subagent at `af169c23ba9`; the script doesn't produce them yet.
1. **More precision and reuse.** Truthy checks, exact equality, test-data imports and direct mounts are already in the table. Candidates to add: `toBe(true|false)` split from exact `toBe(x)`, `toHaveBeenCalledWith`/`Times` (probe 340 → 377), and imports of local `test-utils` (probe 150 → 196).
2. **Production footprint.** No production files change; all 25 non-test files are helpers, fixtures or the README. Trivial: a generated line.
3. **Per-test coverage.** The table's coverage is suite-wide, so a branch one rewritten test stopped reaching doesn't show if another test still reaches it. One example: `UserSharing.vue`'s no-current-user arm, handed to the readability loop. Running coverage one test file at a time, at both refs, would catch these. Medium cost.
4. **Mutation score on a stratified sample.** Stryker, or hand-written mutants as in PLAY_LOG, on 8–10 utils and composables at both refs. The only measure that shows assertions kept their strength. High cost.
5. **Duplication.** `jscpd` over the changed tests plus helpers at both refs. Low to medium cost.
6. **Runtime and shuffle stability.** Five shuffled seeds at both refs on the changed files. Probe on 19 files: wall time is flat (7.4s vs 6.8s). Medium cost; run serially.
7. **Sliceability.** Probe: 247 commits, median churn 75 lines, p90 248. Trivial, from `git log --numstat`.
8. **Test defects found.** Hand-tallied from the review notes: dead mocks, vacuous assertions, order dependence, synthetic-emit artifacts. Keep these separate from product bugs, which all came from the story and play lanes.

**Gaps.**
- Wall time for the full suite, dev against the tip.
- A count of lessons that made it into `client/README.md#client-side-unit-testing`.

The lanes above readability (stories, play functions) are covered in [CASE_FOR_CONVERSION.md](CASE_FOR_CONVERSION.md).
