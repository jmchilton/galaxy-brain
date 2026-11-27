Run via Claude Opus 5.5 at high effort. **Recommendation: expand, modestly, one more time. Add two one-line fixes to tools the branch already edits: ML Jupyter's "Start with a code repository" mode, and Extract Genomic DNA's Python 3 bytes/str bug. Otherwise ship as implemented. Keep joiner2 out of `tool_conf.xml.sample`, and leave the HiGlass track-name question to dev.** The re-scope did its job. The `.ipynb` suffix fix is in, and the HiGlass guard was rightly dropped, because HiGlass never lost a file. One new bug turned up in this evaluation. ML Jupyter's template tests `mode_select == 'github'`, but the option's value is `pull_repo`. So the repository mode falls into the notebook branch, and every such job fails at command build with `NotFound: cannot find 'ipynb'` (rendered at base and HEAD). The `git clone --` this branch added is on a line that never renders. The mismatch has been there since the feature was added in `a55a56938b6` (2024). Changing `'github'` to `'pull_repo'` makes the mode render as intended, and the analyser findings stay the same. The Extract Genomic DNA fix (`stderr = b""`) is in the script of a tool whose GFF check this branch changes. Without it, every job with a history FASTA fails, so the two tool tests that exercise the branch's `is_of_type` change can't pass. Both fixes are the same kind as joiner2 and shrimp_wrapper, which John chose to fix: jobs that fail today start working, and ids and inputs stay the same. Everything larger hits a standing decision by John or is dev-only work. The data source `output_size_limit` item is closed, because branch 1 now allows that read.

## Possible Decompositions

The net diff is 30 files: about 210 changed lines of tool XML (156 insertions, 103 deletions, less the 49-line joiner2 expected output). Use `stock_tools_review_clean_reshaped` (`a1e25a262e5`, 23 commits) as the source. Its tree equals the pushed head `dcd4d5eb9a1`. It drops the two add/remove pairs (the upload1 unit test, the HiGlass guard), puts the HiGlass and ilastik refactors first, and keeps each tool's commits together. Every file is in exactly one group, so the groups don't depend on each other and can land in any order. None needs the analyser or the security branches.

| Group | Reshaped rows | Changed lines |
|---|---|---|
| **U: upload1** | 1 (literal separator) | 2 |
| **C: command-line tools** | 2–8 (liftOver, axt ×3, gtf2bedgraph, interval2maf, blat, BEAM/master2gd_snp, SRMA), 19–21 (history import, Extract Genomic DNA `is_of_type`, optparse `--`) | 33 |
| **I: interactive tools** | 9 (AskOmics, cellxgene), 10–11 (Jupyter ×5 `./`, ML suffix), 12 (Panoply/VRM/Phinch), 13–15 (ilastik), 16–18 (HiGlass: R1, R3, quoting) | 158 |
| **F: functional fixes** | 22 (shrimp_wrapper), 23 (joiner2 + `<test>` + test data) | 17 + 49 data |

If the expansion is taken, the ML `pull_repo` fix goes next to rows 10–11 in I. The Extract Genomic DNA fix goes in F, or next to row 20 in C so its tests can pass alongside the change they cover.

- **Option 1: one PR.** U + C + I + F, with the thermo review's quoting rule in the description: sanitized values get `'$x'`, raw element identifiers get `shlex.quote` or a regex clean.
- **Option 2: three PRs.** (1) U, the one line that leaves the upload1 exemption covering a single `getVar`. (2) F, broken stock tools that now work, which is easy to justify on a release branch. (3) C + I, "stock tools pass the review".
- **Option 3: as option 2, with C and I split.** C is small and has test or render evidence for each tool. I has the larger rewrites (HiGlass, ilastik) and no tests that run in CI, so its maintainers can review it separately.
- **Option 4: by whether argv changes.** (4a) argv identical for ordinary values: U, most of C, AskOmics, cellxgene, and refactors R1–R3. (4b) words change but not meaning: Jupyter `./` and `git clone --`, the optparse `--` reorders, the quoting in HiGlass and ilastik, and the Panoply/VRM/Phinch `/` replacement. F stays separate. This option answers open question 2 of the initial debrief, but the ilastik and HiGlass chains split across 4a and 4b, so it's the only option that needs care when cherry-picking.

## Scopes considered

### As implemented

Stock tool XML only, on release_26.1. The commands quote values and pass `./` paths or `--`. Extract Genomic DNA drops `$__app__`. upload1's separator is written literally. joiner2 and shrimp_wrapper are fixed, and so is ML Jupyter's `.ipynb` suffix check. upload1 is exempted on the dev security branches, and each of the 91 remaining findings has a stated reason.

| Pros | Cons |
|---|---|
| <ul><li>Meets John's request as revised on 2026-11-26.</li><li>No Galaxy Python changes. The commits are per tool and reshaped for splitting.</li><li>Behaviour is shown by render comparison (argv the same for ordinary values), tool tests and API tests. Three reviews found nothing to act on beyond what was done.</li></ul> | <ul><li>ML Jupyter's repository mode fails on every job, and the branch's edit to that mode never renders. A reviewer reading the `git clone --` hunk may notice this.</li><li>Extract Genomic DNA's history-FASTA path fails on Python 3, so the tests that cover the branch's GFF change can't pass.</li><li>No independent non-Claude review yet (Codex is blocked by the host sandbox).</li></ul> |

### Expand modestly (recommended): ML Jupyter `pull_repo` and Extract Genomic DNA `b""`

In `interactivetool_ml_jupyter_notebook.xml`, change `#elif $mode.mode_select == 'github':` to `'pull_repo'`. In `tools/extract/extract_genomic_dna.py`, change `stderr = ""` to `stderr = b""`. Decoding the bytes when they go into the exception message makes the error text readable.

| Pros | Cons |
|---|---|
| <ul><li>Both are bugs in tools the branch edits, and the ML one is on a line next to a hunk the branch changes.</li><li>The same kind of fix as joiner2 and shrimp_wrapper, which John approved: broken jobs start working, with ids, inputs and versions unchanged.</li><li>One line each. Analyser findings for ML Jupyter are identical before and after (capability findings only).</li><li>Extract Genomic DNA's tests 5 and 6 then pass, and they fail with the GFF branch disabled. So the `is_of_type` change gets real test evidence instead of render comparison only.</li></ul> | <ul><li>Both change behaviour on a release branch. A mode that never worked starts cloning repositories, and a deprecated tool's history-FASTA path starts running.</li><li>Neither runs in CI. ML Jupyter needs its image, and Extract Genomic DNA is in `known_broken_tools.txt` and not in the sample conf.</li><li>The Extract Genomic DNA fix is in a Python script, the branch's first non-XML change to a tool.</li></ul> |

<details><summary>Evidence and alternatives</summary>

- **ML Jupyter.** The mode `<select>` offers `scratch`, `pull_repo` and `previous`. The template tests `scratch`, then `github`, then falls to `#else`, which reads `$mode.ipynb`. That name exists only under `previous`. A render with `mode_select="pull_repo"` raises `NotFound: cannot find 'ipynb'`, the same at `origin/release_26.1` and HEAD. With the one-word fix it renders `cp home_page.ipynb ./`, `git clone -- '<url>'`, then `jupyter lab`. The analyser's report for the tool is the same before and after: `capability-network` ×2, `capability-container`, `capability-api-key`. A sweep of every `== '<literal>'` in the 29 changed tool XMLs against their option and `when` values found no other mismatch; the AskOmics and cellxgene hits are datatype extensions and a Python string. The scratch case file is `scope2/it_ml_pull_repo.py` in this session's scratchpad. The earlier render case used `mode_select="github"`, which is why the comparisons didn't catch this.
- **Extract Genomic DNA.** `stderr = ""` followed by `stderr += <bytes read>` raises `TypeError` even when stderr is empty. So every history-FASTA job fails with `Error running faToTwoBit. can only concatenate str (not "bytes") to str`, on base and on the branch. The test challenges debrief ran tests 5 and 6 with this one-line fix applied temporarily. Both pass, and both fail with the GFF branch disabled. Its header calls the tool deprecated ("IUC provides same tool"), so taking only the ML fix is a reasonable fallback.
- **Not included: ML Jupyter's open and scratch modes don't save a notebook to `$jupyter_notebook`,** unlike the siblings, which end with a `cp` that always runs. The dead `#set $output_notebook_name = $cleaned_name` suggests the author once meant to copy it. But scratch mode starts several notebooks, so which one to save is a design choice, and the behaviour goes back further than the 2024 update. It belongs on dev, if anywhere.

</details>

### Expand: joiner2 in `tool_conf.xml.sample`

Add `filters/joiner2.xml` to the sample conf, so `main_tools.yaml` runs its new `<test>`.

| Pros | Cons |
|---|---|
| <ul><li>CI would exercise the joiner2 fix.</li></ul> | <ul><li>Ships a tool to every new deployment, which is a product decision, not a test change.</li><li>There is no other CI path for stock tools to piggyback on: `main_tools` runs only the sample conf, and no functional test conf includes stock tools.</li><li>Planemo or a custom conf already runs the test.</li></ul> |

Not recommended. Mention it in the PR description so a reviewer can ask for it.

### Expand: distinct HiGlass track names for duplicate inputs

When two inputs map to the same name, pass `ingest_tileset` an indexed `--name`, so tracks are distinguishable. The other answer to John's question would be to fail such jobs, which the reverted guard did.

| Pros | Cons |
|---|---|
| <ul><li>Answers the open track-name question.</li><li>Two tracks with the same label are confusing in the viewer.</li></ul> | <ul><li>No data is lost today. Each file is ingested into storage that never overwrites, so the branch's `/` replacement turns a failed job into two working tracks.</li><li>New behaviour in a tool with no runnable tests, and it needs the image to verify.</li><li>Failing on duplicates turns jobs that work today into failures, which was the reason for the revert.</li></ul> |

Leave it to dev, or to John's answer. Nothing on this branch makes it worse.

### Expand: John's deferred fixes (HiGlass `uploaded_genomes`, sample_sheet newlines)

Make `uploaded_genomes` a dict, so labelled chromosome-size uploads and the custom-genome bedgraph branch work. Replace newlines in sample_sheet_to_tabular's element identifiers.

| Pros | Cons |
|---|---|
| <ul><li>`uploaded_genomes` is a crash bug in the template the branch rewrites most, so on scope alone it's the strongest touched-code item.</li><li>Clears 3 of the 91 remaining findings.</li></ul> | <ul><li>**Deferred by John (2026-11-26).**</li><li>Both change output, and neither tool has tests.</li></ul> |

### Expand: data source `output_size_limit` via the job's JSON params

Move the limit from the command line into `DataSourceTool.exec_before_job`'s `job_config`, and drop the argument from 26 XMLs.

| Pros | Cons |
|---|---|
| <ul><li>Would remove 26 `template-app-access` capability findings.</li></ul> | <ul><li>**Superseded.** Branch 1 now allows that exact read, so it no longer causes refusals, which was the main reason for it.</li><li>The only Galaxy Python change in the scope, on an XML-only branch.</li></ul> |

Closed. Don't revisit unless the allowance on branch 1 is reverted.

### Expand: analyser false-positive fixes and the export option string

Teach the analyser about positional scripts, `data_column` validation, `repr()` of strings, `--`, `urlsafe_b64encode`, `shlex.quote` and `echo`. Separately, split the export tools' server-built option string into separate job parameters.

| Pros | Cons |
|---|---|
| <ul><li>Most of the 91 remaining findings belong in the analyser.</li><li>The ilastik `echo '  '` workaround could then go.</li></ul> | <ul><li>**Analyser changes deferred by John.** They go to `tool_security_static_findings`, not to release_26.1.</li><li>The export split is a framework change on a busy path, for low findings on server-set values.</li></ul> |

### Expand: dev-only refactors

A shared macro for the five Jupyter tools, one safe-name helper across `tools/interactive/` (which would also handle leading-dot names), `join -t` with a tab in joiner2, and ilastik's `./${shlex.quote($label)}.tif` nit.

| Pros | Cons |
|---|---|
| <ul><li>Removes about 20 duplicated lines per Jupyter tool, and converges on `filesystem_safe_string` / `get_staging_path`.</li></ul> | <ul><li>Refactors untouched code, changes file names that work today, or changes joiner2's design. All of this belongs on dev.</li><li>The ilastik nit is cosmetic, and it can be folded in if a reviewer asks.</li></ul> |

### Original request: rework upload1 to drop `getVar`

Expose upload1's dynamically created outputs to the template and loop over them.

| Pros | Cons |
|---|---|
| <ul><li>What John first asked for, with no exemption code.</li></ul> | <ul><li>**Replaced by John's exemption decision,** which is now implemented on the dev security branches.</li><li>Needs both a Galaxy change and an analyser change.</li></ul> |

### Contract: drop the behaviour-changing fixes (back to the original-scope alt, or further)

Ship only finding removals. Drop the ML suffix fix (back to `stock_tools_review_clean_alt_original_scope`), and possibly joiner2 and shrimp_wrapper too.

| Pros | Cons |
|---|---|
| <ul><li>Every commit then preserves behaviour, which is the most conservative shape for a release branch.</li></ul> | <ul><li>John decided to fix joiner2 and shrimp_wrapper. The suffix fix is the same kind and has its siblings as precedent.</li><li>The decompositions already isolate these fixes (group F, rows 10–11), so a reviewer gets the same focus without dropping them.</li></ul> |

### Contract: argv-identical changes only

Drop the commits that change the words passed: `./`, `--`, `echo ''` and the `/` replacements.

| Pros | Cons |
|---|---|
| <ul><li>Avoids open question 2.</li></ul> | <ul><li>Most interactive tools would keep their medium and high findings.</li><li>The `/` replacements also fix jobs that failed.</li><li>Decomposition option 4 gives the same review split without dropping anything.</li></ul> |
