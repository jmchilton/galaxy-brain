Run via Claude Opus 5.5 at high effort. **Recommendation: expand, modestly. Fix two more bugs in templates the branch already rewrites: the ML Jupyter tool's `.ipynb` suffix check, and a duplicate-name guard for HiGlass like the one ilastik now has. Otherwise ship as implemented, and leave John's deferrals as they are.** The branch covers what John asked for. Every stock tool's vulnerability findings were either fixed or given a reason (170 down to 91). `uncheckable-template-code` remains only on upload1, which is exempted. The example tools the security tests use are untouched. The two additions are pre-existing bugs that sit on or next to edited lines. Each has a precedent: the other four Jupyter tools already have the correct `endswith(".ipynb")`, and ilastik's duplicate check is on this branch. One of them also widens because of the branch. HiGlass now maps `a/b` and `a_b` to the same file and silently overwrites the first, where before `a/b` failed loudly. Together they're a few lines, need no Galaxy code change, and don't touch anything John deferred. The larger expansions below all hit a standing decision by John (the data source `output_size_limit` fix, HiGlass `uploaded_genomes`, sample_sheet newlines, the analyser false positives) or are dev-only refactors. They're listed so the decisions stay visible, not to reopen them.

## Possible Decompositions

The net diff touches 30 files, about 200 lines of tool XML plus a 49-line expected-output file. Use `stock_tools_review_clean_reshaped` (`2b77672f10a`) as the source; its tree is identical to the pushed head. It puts the HiGlass and ilastik refactors ahead of their tools' changes, so any group below cherry-picks cleanly. Every file belongs to exactly one group, so the groups don't depend on each other and can land in any order. None of them depends on the analyser or on the security branches. If the test challenges advice is taken, `0803734dbf3` and `15e81e6d910` are dropped together in every option.

The groups the options are built from:

| Group | Commits (pushed names) | Lines |
|---|---|---|
| **U: upload1** | `a1decd9f417` (literal separator) | 2 |
| **F: functional fixes** | `917c41da640` shrimp_wrapper, `605f9b26407` joiner2 (+ `<test>` and `test-data/joiner2_out.tabular`) | 17 + 49 data |
| **C: command-line tools** | liftOver, axt ×3, gtf2bedgraph, interval2maf, blat, BEAM, master2gd_snp, SRMA, history import, Extract Genomic DNA `is_of_type`, optparse `--` (Extract_features1, vcf_to_maf_customtrack1) | ~33 |
| **I: interactive tools** | AskOmics, cellxgene, Jupyter ×5, Panoply/VRM/Phinch, ilastik (R2 refactor, quoting, duplicate check), HiGlass (R1 refactor, quoting) | ~150 |

**Option 1: one PR.** U + F + C + I. A single, ~200-line XML review against release_26.1, with the quoting rule from the thermo-nuclear review stated in the description. The two functional fixes are a different kind of change and a reviewer may ask to pull them out.

**Option 2: upload1, functional fixes, hardening.**
1. U. One line, which makes the upload1 exemption on the security branches cover a single `getVar`.
2. F. Two tools that failed on every job. Easy to justify on a release branch, independent of the security work.
3. C + I. The "stock tools pass the review" PR.

**Option 3: as option 2, with the hardening split by tool kind.**
- 3a. C. Small, mostly argv-identical; each tool has test or render evidence.
- 3b. I. Interactive tools have no tests at any layer, and this is where the larger template rewrites are (HiGlass, ilastik). Reviewers who maintain the interactive tools can take it separately.

**Option 4: split by whether the argv changes.** For open question 2 in the initial debrief.
- 4a. Argv-identical for ordinary values: U, most of C (quoting, `is_of_type`, history import), AskOmics, cellxgene, and the HiGlass and ilastik refactors (R1, R2).
- 4b. Words change, meaning doesn't: Jupyter `./` paths and `git clone --`, the optparse `--` reorders, HiGlass and ilastik quoting (`echo ''`, space and slash cases), and the Panoply/VRM/Phinch `/` replacement.
- F stays separate.

  Reviewers can accept 4a quickly, and 4b carries the release-branch question by itself. Per-file chains (ilastik, HiGlass) split across 4a and 4b, so this is the only option that needs care when cherry-picking.

If the recommended expansion is taken, the ML Jupyter fix and the HiGlass guard go with I (or 4b).

## Scopes considered

### As implemented

Stock tool XML only, on release_26.1. The tools' commands quote values and pass `./` paths or `--`. Extract Genomic DNA drops `$__app__`. upload1's option separator is written literally. joiner2 and shrimp_wrapper are fixed. upload1 is exempted on the security branches, and each of the 91 remaining findings has a stated reason.

| Pros | Cons |
|---|---|
| <ul><li>Meets John's request as revised by his 2026-11-26 decisions.</li><li>No Galaxy code change; every commit is one tool or a small group.</li><li>Behaviour is proven by render comparison, tool tests and API tests, and argv is unchanged for ordinary values.</li><li>Removes the only other stock `uncheckable-template-code` (Extract Genomic DNA).</li></ul> | <ul><li>Leaves two known bugs in templates it rewrites (ML Jupyter suffix, HiGlass overwrites). A reviewer will see the first in diff context.</li><li>The `a/b` vs `a_b` overwrite in HiGlass is newly reachable through the branch's `/` replacement.</li><li>91 findings stay. Most need analyser changes that live on another branch.</li></ul> |

### Expand modestly (recommended): ML Jupyter suffix check and HiGlass duplicate guard

In `interactivetool_ml_jupyter_notebook.xml`, change `endswith(".ipynb"'$jupyter_notebook')` to `endswith(".ipynb")`, as in the four sibling Jupyter tools. In HiGlass, compute the safe names once (the R1 preamble already does), then fail with a message when two inputs share one, as ilastik does.

| Pros | Cons |
|---|---|
| <ul><li>Fixes bugs in touched code, which reviewers expect on the same PR.</li><li>Both follow precedents: the sibling Jupyter tools, and ilastik's guard from this branch.</li><li>Closes the one collision this branch widens.</li><li>A few lines each, no Galaxy code, no analyser impact expected.</li></ul> | <ul><li>Both change behaviour. A notebook named `x.ipynb` stops becoming `x.ipynb.ipynb`, and HiGlass jobs with duplicate names now fail instead of silently losing a file.</li><li>Neither tool has tests, so the evidence is render comparison only.</li></ul> |

<details><summary>Why these two, and the alternatives</summary>

- **ML Jupyter.** `".ipynb"'$jupyter_notebook'` is two adjacent string literals, so the suffix tested is not `.ipynb`. A Cheetah render of the expression with a name of `x.ipynb` takes the append branch, so a notebook that already ends in `.ipynb` gets a second one. The four sibling tools (1.0.0, 1.0.1, 1.0.3, Qiskit) use the plain form, and the review found it next to lines this branch edits. It's on `origin/release_26.1` (last changed in `a55a56938b6`), so it's a real release bug, not branch work.
- **HiGlass.** Before the branch, a `/` in an identifier named a missing directory and the job failed. Identical identifiers already silently overwrote each other. With the branch, `a/b` and `a_b` also overwrite silently. A guard catches both. To keep every file instead of failing, suffixing an index (`a_b`, `a_b_1`) would also work. ilastik's precedent favours failing, and it's the smaller change.
- **Not included:** completing the quoting of the partially quoted commands (blat_wrapper, interval2maf, master2gd_snp, SRMA). The unquoted words are dataset paths and sanitized integers or selects, so argv is identical and nothing is fixed. The thermo-nuclear review's rule (quote what the analyser flags) is consistent, and the extra quoting is churn on a release branch. Cheap to add if a reviewer asks.

</details>

### Expand: data source `output_size_limit` moves into the job's JSON params

Add `OUTPUT_SIZE_LIMIT` to `DataSourceTool.exec_before_job`'s `job_config`. Read it in `data_source.py`, falling back to `argv[2]`. Drop the argument from the 26 data source XMLs. About 5 Python lines and 26 one-line edits.

| Pros | Cons |
|---|---|
| <ul><li>The largest remaining set of stock refusals: 17 tools in `tool_conf.xml.sample` are refused on every job at branch 3's default, and it's part of why branch 3 is blocked on defaults.</li><li>Small, compatible with remote compute, and keeps the fallback for third-party tools.</li><li>Removes 26 `template-app-access` capability findings.</li></ul> | <ul><li>**John decided "not now" (2026-11-26).**</li><li>It's the only part that would change Galaxy Python on a branch that's otherwise XML-only.</li><li>Better as its own PR, tied to branch 3's defaults decision.</li></ul> |

Revisit it when branch 3's defaults are decided. If it goes ahead, it should be a separate PR on release_26.1, not added to this one.

### Expand: John's deferred fixes (HiGlass `uploaded_genomes`, sample_sheet newlines)

Make `uploaded_genomes` a dict so a labelled chromosome-size upload and the custom-genome bedgraph branch work. Replace newlines in sample_sheet_to_tabular's element identifiers.

| Pros | Cons |
|---|---|
| <ul><li>`uploaded_genomes` is a crash bug in the template this branch rewrites most. On scope alone it's the strongest of the "touched code" candidates.</li><li>Clears 3 of the 91 remaining findings.</li></ul> | <ul><li>**Deferred by John.**</li><li>Both change output: one makes a dead feature start working, the other changes rows for such identifiers.</li><li>No tests for either tool.</li></ul> |

### Expand: export tools' option string as separate parameters

Split `__EXPORT_HISTORY_COMMAND_INPUTS_OPTIONS__` into separate job parameters in `history_imp_exp.py`, so the export commands quote each one (open question 1 in the initial debrief).

| Pros | Cons |
|---|---|
| <ul><li>Clears 5 findings on Galaxy's own tools.</li><li>Removes a deliberately split multi-word value from the commands.</li></ul> | <ul><li>A framework change on a well-used path (history export) to fix findings on server-built values.</li><li>The findings are low and don't refuse at branch 3's default.</li><li>The cleaner fix is in the analyser: treat these server-set names as trusted.</li></ul> |

### Expand: analyser false-positive fixes

Teach the analyser about positional scripts, `data_column` validation, `repr()` of strings, `--` beyond one word, `urlsafe_b64encode`, `shlex.quote`, `echo` arguments and the other gaps the debrief lists. That would remove most of the 91.

| Pros | Cons |
|---|---|
| <ul><li>Where most of the remaining findings belong.</li><li>Would let the ilastik `echo '  '` workaround go.</li></ul> | <ul><li>**Deferred by John.**</li><li>The analyser isn't on release_26.1. These changes go to `tool_security_static_findings`, not here.</li></ul> |

### Expand: dev-only refactors

A shared Jupyter macro for the five tools, a safe-basename helper in place of `.replace('/', '_')` (it would also handle names with leading dots), and `join -t` with a tab in joiner2.

| Pros | Cons |
|---|---|
| <ul><li>Removes about 20 duplicated lines per Jupyter tool.</li><li>Converges on Galaxy's existing `filesystem_safe_string` / `get_staging_path`.</li></ul> | <ul><li>Refactors untouched code, changes file names, or changes joiner2's design. All belong on dev.</li><li>A safe-name helper adds a `template-import` capability unless it lives on the wrapper.</li></ul> |

### Expand: joiner2 in the sample tool conf

Add joiner2 to `tool_conf.xml.sample` so its new `<test>` runs in `main_tools.yaml`.

| Pros | Cons |
|---|---|
| <ul><li>CI would exercise the fix.</li></ul> | <ul><li>Ships the tool to every new deployment, which is a product decision, not a test change.</li><li>No stock tool sets a precedent for adding one for test coverage.</li></ul> |

### Original request: rework upload1 to drop `getVar`

Expose upload1's dynamically created outputs to the template and loop over them, instead of exempting the tool.

| Pros | Cons |
|---|---|
| <ul><li>What John first asked for. No exemption code would be needed on the security branches.</li></ul> | <ul><li>**Replaced by John's exemption decision.**</li><li>Needs a Galaxy change, since `upload_common.create_job` adds `output0..N` and nothing in `param_dict` lists them, plus an analyser change. Without the analyser change it swaps the reflection finding for a low `option-injection`.</li><li>Branch 3's measurements show the exemption covers every refusal upload1 hits.</li></ul> |

### Contract: argv-identical changes only

Drop the commits that change the words passed (Jupyter `./` and `--`, the optparse `--` reorders, HiGlass `echo ''`, the `/` replacements), and keep only quoting that leaves argv byte-identical for ordinary values.

| Pros | Cons |
|---|---|
| <ul><li>Answers open question 2 by not asking it; the safest release-branch shape.</li></ul> | <ul><li>Leaves most of the interactive tools' medium and high findings, so those tools don't pass the review.</li><li>The dropped changes fix real failures too (slash names that pointed at missing directories).</li><li>Option 4 of the decompositions gets the same review benefit without dropping anything.</li></ul> |

### Contract: only what changes refusals at branch 3's default

Keep just Extract Genomic DNA's `is_of_type` (the one stock `uncheckable-template-code` the branch removes) and upload1's separator.

| Pros | Cons |
|---|---|
| <ul><li>Tiny. Targets exactly what refuses jobs today.</li></ul> | <ul><li>John asked for tools that load without findings, not just tools that aren't refused.</li><li>Leaves every injection-shaped finding for when an admin raises the enforcement level.</li><li>Throws away fixes that are already proven.</li></ul> |

### Contract: drop joiner2 and shrimp_wrapper

Ship the review fixes only. Send the two functional fixes upstream separately, or not at all.

| Pros | Cons |
|---|---|
| <ul><li>Keeps the PR about one thing.</li></ul> | <ul><li>**John decided to fix both.**</li><li>They're already split cleanly (group F), so decomposition gets the same focus without dropping them.</li></ul> |
