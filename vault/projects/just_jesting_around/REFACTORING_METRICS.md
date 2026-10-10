Two sections - the pitch - a concise, empirical case for the vitest_readability refactoring loop for inclusion in a PR someday and an internal notes new agents can pick up and build/update the metrics case against.
## Refactoring Metrics - the Pitch

`vitest_readability` rewrites Galaxy's client unit tests one file at a time for readability and reuse, keeping what each test checks. Every test gets its own commit and a review note.

<!-- case_metrics:lane1:start -->
237 test files, dev `df3932ed4ba` → `vitest_readability` `1e6d8358e8f`, as of 2026-10-10.

| Signal | Before | After | Δ | Δ with helpers |
| --- | ---: | ---: | ---: | ---: |
| Test lines | 43,625 | 39,835 | −3,790 (−9%) | −3,294 (−7%) |
| `wrapper.vm` reach-ins | 259 | 149 | −110 (−42%) | −108 (−41%) |
| `as any`/`as unknown` casts | 166 | 8 | −158 (−95%) | −158 (−95%) |
| `flushPromises`/`setTimeout`/timer pokes | 656 | 464 | −192 (−29%) | −189 (−29%) |
| `vi.mock` module mocks | 203 | 164 | −39 (−19%) | −28 (−14%) |
| Class-name selectors (`.find(".x")`) | 278 | 233 | −45 (−16%) | −43 (−15%) |
| `eslint-disable` | 5 | 1 | −4 (−80%) | −3 (−60%) |

Δ with helpers also counts the non-test files the work changed (shared helpers, fixtures, docs): 25 files changed, 678 insertions(+), 182 deletions(-).
<!-- case_metrics:lane1:end -->

What the numbers mean:
- **Less to read.** Shared factories and mount helpers replace setup that used to be repeated in every file.
- **Behaviour, not internals.** Fewer `wrapper.vm` reach-ins and class-name selectors, and fewer whole-module mocks.
- **Fewer escape hatches.** Typed fixtures leave almost no casts, and there are far fewer manual flushes and sleeps.

**Coverage held.** The number of `it(` calls in the source drops slightly, because copy-pasted cases became `it.each` tables, and a table counts once however many rows it runs. The executed counts recorded in each review note held or grew:

| Test | Executed cases |
| --- | --- |
| `filterConversion` | 16 → 39 |
| `collectionTypeDescription` | 9 → 18 |
| `tool-version` | 14 → 21 |
| `CollectionDescription` | 2 → 13 |
| `SwitchToHistoryLink` | 7 → 12 |
| `JsonDiffViewer` | 13 → 13 |
| `canvasDraw` | 11 → 11 |

**Stricter assertions find real problems.** In UserSharing, a truthy `emitted("cancel")` check became an exact `toEqual([[]])`. That exposed a second `cancel` event: the test's synthetic `GModal` emit had left the native dialog open. The test now clicks the real button through a shared `clickModalButton` helper.

## How this was generated (internal)

**Refresh the table.** From this directory, run:

```sh
uv run case_metrics.py --fetch --update REFACTORING_METRICS.md
```

This rewrites only the block between the `case_metrics:lane1` markers. Don't hand-edit that block. Run without `--update` for the full output, including the lane 2 and 3 tables and the largest per-file `expect` and case drops. Commit with explicit paths and don't push galaxy-brain.

**What it compares.**
- The script reads `~/projects/worktrees/galaxy/branch/vitest_readability` (override with `--repo`).
- Before is `merge-base(origin/dev, jmchilton/vitest_readability)`; after is the pushed tip.
- Test files are the changed `*.test.[jt]s(x)` files, read at both refs with `git show`, so nothing is checked out.
- "Δ with helpers" adds back every other changed file (helpers, fixtures, `client/README.md`), so the reductions can't hide in shared code.

**Signals.** Each is a regex count over raw source, defined in `SIGNALS`:

| Row | Matches | Caveat |
| --- | --- | --- |
| `wrapper.vm` | `.vm` | Any `.vm`, including ones on child wrappers |
| Casts | `as any`, `as unknown` | Counts `as unknown as X` once |
| Flush/sleep | `flushPromises(`, `setTimeout(`, `vi.advanceTimers` | `nextTick` isn't counted |
| `vi.mock` | `vi.mock(`, `jest.mock(` | |
| Class-name selectors | `find`/`findAll`/`get`/`querySelector(All)` with a literal leading `.` | Misses compound and variable selectors |
| `eslint-disable` | Any directive | |

**Why the table has no case or `expect` rows.** Static counts mislead: `parseBool` goes from 7 to 3 cases in the source but runs 13 tests instead of 7. The script still prints `cases`, `expects` and `.each tables` in its full output, and the drop tables there are the list to explain.

**Executed counts** come from the review notes (`reviews/batchNN/<Test>.md`, the "Baseline and final" or "Cases N → N" line). They exist only for the originators; follow-through edits to other suites record pass/fail, not before/after counts. To add a row, take a file from the script's drop tables, find its note with `grep -l <Test> reviews/*/*.md`, and copy the counts.

**Gaps.**
- Executed counts for every file, using `vitest list --project unit` at dev and at the tip. That needs a dev checkout with `node_modules`.
- Wall time for the full `unit` suite, dev against the tip.
- A count of lessons that made it into `client/README.md#client-side-unit-testing`.

The lanes above readability (stories, play functions) are covered in [CASE_FOR_CONVERSION.md](CASE_FOR_CONVERSION.md).
