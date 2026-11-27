Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear code quality review: stock_tools_review_clean

**Top line:** The branch is small, one-topic per commit, and mostly single-token quoting, so it has no structural regressions. No file comes near 1000 lines, and no shared Python code changes. The real maintainability problem was copy-pasted `#set` naming logic in the two templates the branch rewrote most: HiGlass and ilastik. I fixed both with behaviour-preserving commits, pushed to `jmchilton/stock_tools_review_clean`:

- `9790b3338b7` Name HiGlass' input files once per file, before the type branches. Each of the six datatype branches had its own `#for $file` loop and its own `#set $safe_name` / `#set $stem` lines (six and four copies). There is now one file loop with the names computed once, then the type dispatch. Command bodies are unchanged and keep their indentation, so the diff touches only loop and dispatch directive lines.
- `9cf1f2cadb1` Link ilastik's images under the names its duplicate check uses. The link loop recomputed `str(identifier).replace('/', '_')`, a second copy of the expression the duplicate check uses. It now iterates `zip($infiles, $labels)`, so the check and the links can't drift apart. It also drops a redundant `str()` on the already-string label.

Proof, for both commits:
- **Render comparison** (the branch's `render_compare.py`, `shlex.split` argv) of HEAD before the commits against the working tree is identical in every case. HiGlass cases cover all six types with ordinary, space and slash identifiers, plus a new mixed case: six inputs of different types in one job, including an empty one. The `ingest_tileset` order is unchanged. ilastik cases: new, existing, duplicates, slash, and an `a/b` + `a_b` collision.
- **Against `origin/release_26.1`:** the only differences are the ones the initial debrief already documents (HiGlass `echo ''`, the space and slash cases, bigbed `./`).
- **Analyser** (`tool_security_static_findings` extract): findings for both files are identical before and after, apart from line numbers.
- **Galaxy linter:** results are the same before and after. HiGlass keeps its existing boolean-conditional warning.
- **Tests:** neither tool has tests (interactive tools run in containers), so no tool or API tests are affected and none were run.

Not acted on, and why:
- **The five Jupyter tools share about 20 identical template lines** (name cleaning, `./` paths, trust, nbconvert, final copy). That is a cross-file macro extraction on untouched code, so it belongs on dev. The per-tool `./` edits are the minimal fix.
- **Hand-rolled `.replace('/', '_')` in five tools** (HiGlass, ilastik, Panoply, VRM Editor, Phinch). Galaxy already has `filesystem_safe_string` and `DatasetFilenameWrapper.get_staging_path()` for this job. They also strip leading dots, so an identifier like `..` can't name `data/..` or `/config/home/..`, which it can on base and on this branch. Switching changes names for leading-dot identifiers and adds a `template-import` capability, so it's for dev: ideally a wrapper property for a safe basename without extension.
- **Repeated `data/${shlex.quote(...)}` in HiGlass** (about 20 sites). Precomputing quoted paths in `#set` would need suffixes concatenated after a quoted word (`data/${q_stem}.presort`). That is cleverer than the explicit form, and the analyser may not track `shlex.quote` through a `#set`. Left explicit.
- **Mixed quoting idioms** are deliberate and follow Galaxy's sanitization boundary, so I left them. Attributes reached through `DatasetFilenameWrapper.dataset` (for example `display_name`) and parameter values are sanitized, so `'$x'` is enough for them. `element_identifier` is a raw property, so HiGlass and ilastik use `shlex.quote` for it. The Jupyter tools regex-clean identifiers to `[\w.-]`, so `'./${cleaned_name}'` is enough there. This rule should be stated in the PR description.
- **Partial quoting** (blat_wrapper, interval2maf, master2gd_snp, SRMA quote only the flagged argument; liftOver, axt and gtf2bedgraph quote every argument). The rule across the branch is consistent: quote what the analyser flags, which in the second group is every argument. Quoting more on a release branch adds churn with no change to argv.
- **ilastik `echo '  '<name>`** is an analyser workaround visible in tool output: the analyser treats any `echo` argument that starts with a value as an option. It's harmless (an indent in an error message) and can go once the analyser is fixed.
- **Panoply and VRM Editor use `replace("/", "_")`, the others `replace('/', '_')`.** The double quotes sit inside a single-quoted shell word, where `'/'` would look like it closes the shell quote. They're easier to read as they are.
- **joiner2 joins on any whitespace and then runs `tr " " "\t"`.** Tabular fields with spaces split wrongly; `join -t` with a tab is the real fix. That changes the author's design, so it's for dev.
- **Already deferred or listed:** HiGlass `uploaded_genomes`, which is a string used as a dict (the mixed render case with a custom genome raises `TypeError` on base and branch alike). Also the ml_jupyter `endswith(".ipynb"'$jupyter_notebook')` bug and the export option string.

No security issues were identified. The `..` identifier edge above is the user's own data in their own job container, and it behaves the same as on base. At worst it makes that job fail.

<details>

## Review

### 1. Structural regressions
None. The branch changes stock tool XML, one test-data file, and nothing in `lib/` Python. No new conditionals land in shared paths.

### 2. Code-judo opportunities
- **HiGlass (acted on).** The base template dispatched on `typeselect` and then looped over files inside every branch. The branch added per-file naming, so the duplication went from six loops to six loops plus ten `#set` lines. Inverting the nesting (files outer, type inner) makes the naming a single preamble. Each input has exactly one `typeselect`, so the emitted command order is identical, which the mixed render case confirms.
- **ilastik (acted on).** The duplicate check and the link loop each computed the link name, which is the exact bug class review finding 1 described: the check and the use can disagree. They now share one list.
- **Jupyter ×5 (listed).** The largest duplication touched by the branch, but it spans five tool files. The canonical fix is a shared `macros.xml` token or `<xml>` macro, which is a dev refactor of untouched code.
- **Canonical helper (listed).** `filesystem_safe_string` and `get_staging_path` exist for staging element identifiers as file names. The branch's `.replace('/', '_')` is a narrower re-implementation. It's justified on release_26.1 by behaviour preservation, but it should converge on dev.

### 3. Spaghetti / branching growth
- vcf_to_maf_customtrack moved its options before `--`, which is simpler than before.
- joiner2 is now one `&&` chain without `rm -rf`, also simpler.
- No new ad-hoc branches.

### 4. Boundary / contract
- The quoting idiom tracks a real boundary: sanitized wrapper attributes versus the raw `element_identifier` property. It isn't documented in the templates. A one-line note in the PR description would stop future editors from "fixing" `'$infile.display_name'` to `shlex.quote` or the reverse.
- `#import shlex` in HiGlass and ilastik is the honest way to quote raw identifiers. The alternative would be a Galaxy-side `$file.element_identifier_quoted`-style helper, but that's dev scope.

### 5. File size
HiGlass is about 200 lines, and every other file is well under 1000. Not a concern.

### 6. Modularity
See the Jupyter macro and the canonical-helper items above.

### 7. Legibility nits, not acted on
- HiGlass writes both `'$file.metadata.dbkey'` and `'${file.metadata.dbkey}'`. Both spellings were on base.
- ilastik's list is still called `labels`, although the comment calls them link names. I kept the name so the duplicate-check line stays as on base.

## Verification commands
- `render_compare.py <worktree> HEAD WORKTREE cases/it_higlass.py`, `cases/it_higlass_mixed.py` (new) and `cases/it_ilastik.py`: all same. Against `origin/release_26.1`: the expected differences only.
- `run_review.py` on HEAD and working-tree copies of both XMLs: identical findings apart from line numbers.
- `galaxy.tool_util.lint.lint_tool_source_with` on both versions: identical results.

The scripts and cases are in this session's scratchpad (`cases/it_higlass_mixed.py`, `lint_tools.py`, `higlass_hoist.py`).

</details>
