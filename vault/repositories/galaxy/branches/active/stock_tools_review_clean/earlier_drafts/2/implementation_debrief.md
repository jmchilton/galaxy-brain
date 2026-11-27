# Implementation debrief

```
created .../stock_tools_review_clean/differential-review/snapshots/20261127T012304Z-hardening-dcd4d5eb9a14.json
  hardening @ dcd4d5eb9a14 vs origin/release_26.1 (merge-base 7e8075a360e9)
  since 20261126T234757Z-implementation-258532ee094f:
    commits: 20 same, 0 rebased, 0 changed, 8 new, 0 dropped
    hunks:   31 carried, 4 changed, 1 new, 4 dropped
```

**STATUS: BLOCKED on a scope decision.** The branch was re-scoped once and re-hardened. The second scope evaluation recommends one more modest expansion, so per process it is parked for John. Otherwise the work is ready.

- **Head:** `dcd4d5eb9a1` on `jmchilton/stock_tools_review_clean`: 27 commits on `origin/release_26.1` (`7e8075a360e`), about 210 changed lines of tool XML plus 49 lines of joiner2 test data.
- **Reshaped history:** the local, unpushed `stock_tools_review_clean_reshaped` (`a1e25a262e5`, 23 commits) has the same tree. Its refactors come first, the add/remove pairs are folded out, and each tool's commits are grouped (`baseline_refactor.md`). Adopting it means resetting the working branch to it and force-pushing, which needs John's go-ahead.
- **Alt:** `stock_tools_review_clean_alt_original_scope` (`9cf1f2cadb1`).

## What it is

Galaxy's stock tool XML (`tools/` and `lib/galaxy/tools/`) is changed so the static security review reports fewer vulnerability findings, without changing what users get. Across the 204 stock XML files the count goes from 170 to 91. Each of the 91 left has a recorded reason in `initial_implementation_debrief.md`: an analyser false positive, a value the server sets, upload1's exemption, or something John deferred. Only upload1 still has `uncheckable-template-code`.

- **upload1:** writes its `file_type` separator literally. `getVar` and `$paramfile` stay, and upload1 is exempted in the review on branches 3 and 4 (John, 2026-11-26).
- **Quoting:** values in about 20 command-line and interactive tools are now quoted. Element identifiers, which aren't sanitized, use `shlex.quote`; sanitized values use `'$x'`.
- **Names and paths:**
  - the Jupyter tools pass `./` paths, and the ML Jupyter tool puts `--` before its `git clone` URL;
  - names used as file names have no slashes;
  - two optparse tools put `--` before their positional arguments.
- **Extract Genomic DNA:** checks for GFF with `is_of_type` instead of reading `$__app__`.
- **Broken tools fixed:** joiner2 (new `<test>`) and shrimp_wrapper (John, 2026-11-26).
- **Re-scope:** ML Jupyter's `.ipynb` suffix check. The HiGlass guard was added and reverted, because its premise was wrong (`implementation_rescope_debrief.md`).
- **Thermo:** HiGlass sets each file's names once, with 3 `shlex.quote` calls instead of 31. ilastik's links follow its duplicate check.

## Hardening

| Step | Result |
|---|---|
| Normal reviews | `subagents/review_implementation.md`, `review_rescope.md`; acted on (ilastik duplicate check; HiGlass guard dropped) |
| Test challenges | `test_challenges_debrief.md`: no changes this round. The joiner2 test fails on the old command. Extract Genomic DNA tests 5 and 6 cover `is_of_type`, but CI never runs them. |
| Codex | Blocked by the host sandbox: no `bwrap`, and AppArmor restricts user namespaces (`codex_review.md`) |
| Thermo-nuclear | `thermo_nuclear_review.md`: two commits; argv identical in 61 cases |
| Baseline refactor | `baseline_refactor.md`: three base refactors, expressed only on the reshaped branch |
| Scope evaluations | Round 1: expand, and re-scoped. Round 2: expand again, so the branch is parked here |
| Check branch | Not run. The process stops at the scope recommendation; run it after John decides |

Earlier hardening drafts are in `earlier_drafts/1/`.

## Tests

All runs used pytest `-p no:postgresql`, one at a time.
- **Framework:** joiner2, gtf2bedgraph, Extract_features1, vcf_to_maf_customtrack1 (2), axt_to_fasta and axt_to_concat_fasta all pass.
- **API:** `test_tools_upload.py` (7 tests that check upload1's `file_type` options) and the `test_histories.py` import tests (7) all pass.
- **Render comparison:** every changed command is identical for ordinary values. The deliberate differences are listed in the initial debrief.
- **Analyser:** run before and after, from an extract of `tool_security_static_findings`.

## Decisions for John

1. **Scope (the reason this is BLOCKED).** The second evaluation recommends two one-line fixes to tools the branch already edits:
   - **ML Jupyter repository mode:** the template tests `mode_select == 'github'`, but the option's value is `pull_repo`. Every job in "Start with a code repository" mode fails with `NotFound: cannot find 'ipynb'`, which is also true on release_26.1. The branch's `git clone --` line never renders. Fix: compare with `'pull_repo'`.
   - **Extract Genomic DNA:** `stderr = ""` gets bytes appended to it on Python 3, so every job with a history FASTA fails. Fix: `stderr = b""`, in a script the branch doesn't otherwise touch; the tool is deprecated.

   Once decided, validation still needed: render and analyser checks for the fixed tools, Extract Genomic DNA tests 5 and 6, and `GX_PROCESS_CHECK_BRANCH.md`. The earlier reviews and tests still apply to the rest of the branch.
2. **History:** adopt `stock_tools_review_clean_reshaped` with a force-push, and choose a PR split. `scope_evaluation.md` lists four, for example upload1, then the functional fixes, then the hardening.
3. **Codex:** unblock the host (install `bubblewrap`) if a review by a model other than Claude is wanted.
4. **Behaviour questions:**
   - Are the `./` and `--` argv changes acceptable on release_26.1?
   - Should the export tools' option string, which the server builds, be split?
   - Should HiGlass refuse jobs where two tracks would share a name? Currently it ingests both, which is fine; any change belongs on dev.
5. **Not recommended:** adding joiner2 to `tool_conf.xml.sample` so CI runs its test, since that would ship the tool to new deployments.
6. **Deferred by John:** HiGlass `uploaded_genomes`, the sample_sheet newlines, and the analyser false-positive groups. The dev-only refactors are listed in `thermo_nuclear_review.md`.
