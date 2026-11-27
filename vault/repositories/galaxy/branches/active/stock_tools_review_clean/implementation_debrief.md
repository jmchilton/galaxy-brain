# Implementation debrief

```
exists .../stock_tools_review_clean/differential-review/snapshots/20261127T143029Z-revision-6cfe8e271c16.json
  revision @ 6cfe8e271c16 vs origin/release_26.1 (merge-base 7e8075a360e9)
  since 20261127T012304Z-hardening-dcd4d5eb9a14:
    commits: 0 same, 17 rebased, 1 changed, 7 new, 10 dropped
    hunks:   35 carried, 1 changed, 2 new, 0 dropped
```

**STATUS: READY**, with the decisions below. John settled the scope question on 2026-11-27: take both fixes the second scope evaluation suggested, and adopt the reshaped history. The previous (BLOCKED) debrief is in `earlier_drafts/2/`.

- **Head:** `6cfe8e271c1` on `jmchilton/stock_tools_review_clean`, 25 commits on `origin/release_26.1` (`7e8075a360e`). It was force-pushed with a lease over `dcd4d5eb9a1`; that old head is kept as the local branch `stock_tools_review_clean_pre_reshape`.
- **History:** the first 23 commits are the reshaped history (`a1e25a262e5`), whose tree equals the old head. Refactors come first, the add/remove pairs are folded out, and each tool's commits are grouped (`baseline_refactor.md`). Two new commits follow.
- **Alt:** `stock_tools_review_clean_alt_original_scope` (`9cf1f2cadb1`).

## What it is

Galaxy's stock tool XML is changed so the static security review reports fewer vulnerability findings, without changing what users get. Across the 204 stock XML files the count goes from 170 to 91. Each of the 91 left has a reason recorded in `initial_implementation_debrief.md`. The summary of the change itself is in `earlier_drafts/2/implementation_debrief.md` ("What it is"), and it still holds.

New in this revision, both fixing jobs that never worked:
- **`a7287fbf099` ML Jupyter repository mode.** The template now compares with `'pull_repo'`, the option's real value, instead of `'github'`. Before, every "Start with a code repository" job failed with `NotFound: cannot find 'ipynb'`. It now renders `cp home_page.ipynb ./ && git clone -- '<url>' && jupyter lab …`, so the branch's `git clone --` line runs for the first time.
- **`6cfe8e271c1` Extract Genomic DNA.** faToTwoBit's stderr is read into `b""` and decoded for the error message. Before, every job with a history FASTA failed with `can only concatenate str (not "bytes") to str`. This is the branch's only change to a tool's Python script.

## Validation of the revision

All runs were sequential.
- **Extract Genomic DNA tests 5 and 6** (GFF input, history FASTA) pass on HEAD with the framework runner from `test_challenges_debrief.md`. They are the tests that cover the branch's `is_of_type` change. The test challenges showed they fail with the GFF branch disabled, and fail without this fix.
- **Error path:** a malformed FASTA and a missing FASTA now report faToTwoBit's own message (`Expecting '>' line 1`, `Couldn't open …`). Base reports the TypeError instead.
- **Render comparison** (before the two commits vs HEAD): the 18 other ML Jupyter cases are identical, and only `pull_repo` changes. The earlier render cases used the non-existent value `github`; they now use `pull_repo`.
- **Analyser:** findings for both tools are identical before and after: ML Jupyter has 4 capability findings, and Extract Genomic DNA has none.
- **Check branch:** `make format` leaves every file unchanged. mypy on the script goes from 15 errors to 14; the one removed is the str + bytes operand error. `tools/` isn't in CI's mypy scope.
- **Normal review:** `subagents/review_revision.md`. It found no blockers and no should-fix items.

Earlier reviews and tests still apply to the 23 reshaped commits, because their tree is unchanged. With only 2 tests involved, test challenges weren't regenerated.

## Hardening (unchanged since `earlier_drafts/2/`)

Normal reviews, test challenges, thermo-nuclear, baseline refactor and two scope evaluations are done. Codex is still blocked by the host sandbox (`codex_review.md`). CI has not run.

## Decisions for John

1. **PR split.** `scope_evaluation.md` lists four options. The two new commits belong with the functional fixes (joiner2, shrimp_wrapper).
2. **Codex:** unblock the host (install `bubblewrap`) if you want a review from a model other than Claude.
3. **Behaviour questions:**
   - Are the `./` and `--` argv changes acceptable on release_26.1?
   - Should the export tools' option string, which the server builds, be split?
   - Should HiGlass refuse jobs where two tracks would share a name? Today it ingests both. Any change belongs on dev.
4. **Recorded and not acted on** (`subagents/review_revision.md`):
   - The Extract Genomic DNA stderr loop now runs, and it would spin if faToTwoBit's stderr were exactly k MiB. That's practically unreachable, and the fix was kept to one line.
   - ML Jupyter's `repo_url` default sanitizer breaks SSH URLs (`@` becomes `X`). This predates the branch.
   - Nobody has checked whether the ML image ships `git`.
5. **Housekeeping:** the review pulled a 1.5 GB `galaxy/higlass-it:1.0` Docker image; say whether to remove it. Delete the local `stock_tools_review_clean_pre_reshape` once you no longer need it.
6. **Not recommended:** adding joiner2 to `tool_conf.xml.sample` so CI runs its test, because that would ship the tool to new deployments.
7. **Deferred by you:** HiGlass `uploaded_genomes`, the sample_sheet newlines, the analyser false-positive groups, and the dev-only refactors in `thermo_nuclear_review.md`.
