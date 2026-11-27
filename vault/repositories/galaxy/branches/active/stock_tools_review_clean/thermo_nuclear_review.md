Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear code quality review: stock_tools_review_clean (re-harden)

**Top line:** This is a fresh review of the branch after the re-scope (head was `4cf60e5ebfb`). It has no structural regressions. It changes stock tool XML only, adds no shared Python, and leaves every file far under 1000 lines (HiGlass, the largest, is about 200). The one real maintainability problem left was in HiGlass, the template the branch rewrote most: 31 inline `${shlex.quote(...)}` calls in the full-dataset loop. One name, `$stem`, was also misleading. I fixed that and added one comment to ilastik. Both commits are pushed to `jmchilton/stock_tools_review_clean`:

- `dade30a02e4` Quote HiGlass' per-file names once, in `#set`, instead of at each use.
  - The loop now builds two quoted words per file: `$track_name` (the file under `data/` that is ingested) and `$copy_name` (the input's copy, with its extension).
  - Each use is now `data/$track_name`, `data/${copy_name}.presort`, and so on. The loop's 31 `shlex.quote` calls became 3: the two `#set` lines, plus the `uploaded_genomes` lookup, which is unchanged.
  - This also removes `$stem`. Despite its name, it held the name *with* the extension.
  - A comment says why these names are quoted: element identifiers aren't sanitized.
  - The unquoted name can no longer slip into a command by mistake. The only raw value left is `$safe_name`, which is used only to build the two quoted words.
- `dcd4d5eb9a1` Say why ilastik quotes its link names with `shlex.quote`. This is a one-line Cheetah comment that doesn't render into the command.

**Proof** (both commits, HEAD before them against the working tree):
- **Render comparison:** argv is identical in all 61 cases.
  - `it_higlass` (18): all six types, with ordinary, space and slash identifiers.
  - `it_higlass_mixed` (2), `it_higlass_duplicates` (6) and `it_ilastik` (5).
  - A new `it_higlass_odd` (30): every type with the identifiers `it's`, `-x`, the empty string, ``a;b$(c)`d` `` and `a b'c/d`. These check that appending a suffix after a quoted word gives the same argv.
  - HiGlass at template version 2.7, its real setting, is also identical in every case.
- **Analyser** (`tool_security_static_findings` extract): HiGlass and ilastik findings are identical apart from line numbers.
  - **Taint probe:** with `#set $track_name = $safe_name` (no quoting), the analyser raises `shell-injection` at every use site. So it tracks the identifier through `#set`, and the identical result means the quoting is still seen.
- **Galaxy linter:** HiGlass results are unchanged. It keeps its existing boolean-conditional warning.
- Both XML files parse with lxml, and `git diff --check` is clean.
- **Tests:** neither tool has tests that can run (they need their container images), so I ran none.
- **Reshaped branch:** I cherry-picked both commits onto the local, unpushed `stock_tools_review_clean_reshaped` (now `508875c637e`) in a temporary worktree, which I removed afterwards. Its tree equals the working branch's (`13ac7eeb58e`).

**Where this differs from the earlier draft:** `earlier_drafts/1/thermo_nuclear_review.md` left the repeated `data/${shlex.quote(...)}` explicit, for two reasons:
- **It thought appending a suffix after a quoted word was too clever.** It is the shell idiom base already uses: ilastik on release_26.1 has `./'$input.element_identifier'.tif`.
- **It thought the analyser might not track `shlex.quote` through `#set`.** I tested this, and the probe above shows that it does.

Not acted on, and why:
- **The five Jupyter tools share about 20 identical template lines** (name cleaning, `./` paths, trust, nbconvert, the final copy). A shared macro would mean refactoring untouched code across five files, so it belongs on dev. The per-tool `./` edits are the minimal fix.
- **HiGlass and ilastik use a different name-cleaning idiom from the rest of `tools/interactive/`.** About 15 interactive tools clean identifiers with `re.sub('[^\w\-\.]', '_', ...)`, which needs no `shlex.quote`. Galaxy also has `filesystem_safe_string` and `get_staging_path()`. Switching either tool would change file names that work today:
  - HiGlass track names with `+`, `,`, `:`, `=` or `@` would change.
  - ilastik's link names would change, and an existing `MyProject.ilp` refers to the images by those names.

  `.replace('/', '_')` plus `shlex.quote` is the behaviour-preserving choice for release_26.1. Bringing these tools onto one helper is dev work, ideally as a wrapper property for a safe base name. That would also stop leading-dot names like `..`, which are a problem on base too.
- **ilastik's `echo '  '<name>`:** the indent works around the analyser, which treats any `echo` argument that starts with a value as an option. It's harmless (an indented line in an error message), and it can go once the analyser is fixed.
- **Partial quoting** (blat_wrapper, interval2maf, master2gd_snp, SRMA): the rule across the branch is to quote what the analyser flags. Quoting more on a release branch adds churn without changing argv.
- **Mixed `'$file.metadata.dbkey'` and `'${file.metadata.dbkey}'` in HiGlass:** both spellings were on base, and the braced form is needed inside `negspy/.../chromInfo.txt`. This is a cosmetic difference, not structure.
- **Panoply and VRM Editor build the name inline, in a single-quoted word.** Phinch uses `#set`. Each has one use site, so a `#set` wouldn't remove anything. Their double-quoted `"/"` avoids looking like it closes the shell quote.
- **vcf_to_maf_customtrack:** moving the options ahead of `--` makes the command simpler than base. Nothing to do.
- **joiner2 joins on any whitespace, then runs `tr " " "\t"`.** Fields that contain spaces are split wrongly. `join -t` with a tab would fix that, but it changes the author's design, so it's for dev.
- **Already deferred:** HiGlass `uploaded_genomes`, which is a string used as a dict, and the export tools' server-built option string.

No security issues were found. These changes are the same argv with the quoting written in fewer places.

<details>

## Review

### 1. Structural regressions
None. The branch changes tool XML and one test-data file. No new conditionals land in shared code.

### 2. Code-judo opportunities
- **HiGlass (acted on).** The re-scope left one file loop with the type dispatch inside it, which is right. The noise was in quoting at each use: `data/${shlex.quote($stem + '.presort')}`, and so on, across six branches. Quoting a name once, when it is made, is the smallest model. A file name is either raw, used only to build names, or quoted, used in commands. Readers no longer check 31 sites for a missing `shlex.quote`.
- **Naming (acted on).** `$stem` meant "name with extension", the opposite of the usual meaning. `$copy_name` and `$track_name` say what each file is for in the pipeline.
- **Jupyter ×5 and the shared cleaning helper (listed).** Both are cross-file refactors of untouched code.

### 3. Spaghetti / branching growth
None added. joiner2 and vcf_to_maf_customtrack are simpler than base.

### 4. Boundary / contract
- **The quoting idiom tracks a real boundary.** Wrapper attributes and parameter values are sanitized, so `'$x'` is enough. `element_identifier` is raw, so it needs `shlex.quote` or a regex clean. The two templates that use `shlex.quote` now say why in a comment.
- **The PR description should still state the rule,** so the Jupyter tools' `'./${cleaned_name}'` isn't "fixed" to `shlex.quote`, or the reverse.

### 5. File size
Not a concern.

### 6. Modularity
See the Jupyter macro and canonical-helper items.

### 7. Legibility nits, not acted on
- In ilastik, `./${shlex.quote($label + '.tif')}` could be written `./${shlex.quote($label)}.tif`, like HiGlass now. It's the only use site, so I left it.

## Commands

- `render_compare.py <worktree> HEAD WORKTREE cases/<case>.py` for `it_higlass`, `it_higlass_mixed`, `it_higlass_duplicates`, `it_higlass_odd` (new) and `it_ilastik`: all same. The same at template version 2.7 (`tn2_render27.py`).
- `run_review.py` on the HEAD copies (`tn_head/`) and the working-tree files. The unquoted probe is in `tn2probe/`.
- `lint_tools.py`, run from the worktree root, on HEAD and the working tree: identical.
- The edit script is `tn2_higlass.py`.

All of these are in this session's scratchpad.

</details>
