Two sections - the pitch - a concise, empirical case for the vitest_readability refactoring loop for inclusion in a PR someday and an internal notes new agents can pick up and build/update the metrics case against.
## Refactoring Metrics - the Pitch

`vitest_readability` rewrites Galaxy's client and Tool Shed frontend unit tests one file at a time, for readability and reuse, keeping what each test checks. Each selected test gets its own commit and a review note. Tests are drawn at random with a recorded seed.

<!-- case_metrics:lane1:start -->
247 test files, dev merge-base `df3932ed4ba` → `vitest_readability` `f324bca585c`, as of 2026-10-10.

| Signal | Before | After | Δ | Δ with helpers |
| --- | ---: | ---: | ---: | ---: |
| Executed tests (`vitest list`) | 2,322 | 2,754 | +432 (+19%) | |
| Test lines | 45,121 | 41,355 | −3,766 (−8%) | −3,268 (−7%) |
| Strong Checks - exact `toEqual`/`toStrictEqual` | 591 | 671 | +80 (+14%) | +80 (+14%) |
| Weak Checks - `toBeTruthy`/`toBeFalsy` | 281 | 86 | −195 (−69%) | −195 (−69%) |
| Imports of shared `@tests/test-data` fixtures | 20 | 77 | +57 (+285%) | +58 (+276%) |
| Direct `mount`/`shallowMount` calls | 351 | 206 | −145 (−41%) | −144 (−40%) |
| `.vm` reach-ins | 269 | 156 | −113 (−42%) | −111 (−41%) |
| `as any`/`as unknown`/`as never` casts | 209 | 34 | −175 (−84%) | −175 (−83%) |
| `flushPromises`/`setTimeout` calls | 621 | 409 | −212 (−34%) | −209 (−33%) |
| `vi.mock` module mocks | 218 | 172 | −46 (−21%) | −35 (−16%) |
| `eslint-disable` | 5 | 1 | −4 (−80%) | −3 (−60%) |

Files that lost an executed test: 0 of 247; 70 gained tests and the rest kept the same count.

Δ with helpers also counts the non-test files the work changed (shared helpers, fixtures, docs): 26 files changed, 689 insertions(+), 191 deletions(-).
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
- Executed tests: `--update` adds a temporary `git worktree` for each ref, symlinks `node_modules` from the main worktree, and runs `vitest list --json` in `client/` and in the tool shed frontend. `vitest list` collects tests without running them. It takes about 3 minutes, and the worktrees are removed afterwards. The script refuses to run if `package.json`, the lockfile or the vitest config differ between the refs, because the shared `node_modules` would then be wrong.
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
3. **Branch-arm coverage per source file.** `vitest run --coverage` at both refs, diffing the `b[]` arms in `coverage-final.json`. Report arms gained and lost. A probe found one incidental loss: in `UserSharing.vue`, the falsy arm of `v-if="currentUser && isConfigLoaded"` is no longer reached, because the test now seeds the user before mounting. A fix has been handed to the readability loop. Medium cost.
4. **Mutation score on a stratified sample.** Stryker, or hand-written mutants as in PLAY_LOG, on 8–10 utils and composables at both refs. The only measure that shows assertions kept their strength. High cost.
5. **Duplication.** `jscpd` over the changed tests plus helpers at both refs. Low to medium cost.
6. **Runtime and shuffle stability.** Five shuffled seeds at both refs on the changed files. Probe on 19 files: wall time is flat (7.4s vs 6.8s). Medium cost; run serially.
7. **Sliceability.** Probe: 247 commits, median churn 75 lines, p90 248. Trivial, from `git log --numstat`.
8. **Test defects found.** Hand-tallied from the review notes: dead mocks, vacuous assertions, order dependence, synthetic-emit artifacts. Keep these separate from product bugs, which all came from the story and play lanes.

**Gaps.**
- Wall time for the full suite, dev against the tip.
- A count of lessons that made it into `client/README.md#client-side-unit-testing`.

The lanes above readability (stories, play functions) are covered in [CASE_FOR_CONVERSION.md](CASE_FOR_CONVERSION.md).
