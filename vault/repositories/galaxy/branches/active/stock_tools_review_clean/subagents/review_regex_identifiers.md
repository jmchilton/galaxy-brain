# Review: regex identifiers alt

A normal review of `stock_tools_review_clean_alt_regex_identifiers` (`1a6d0585a37..`, then 7 commits, 18 files), the evaluation alt that replaces the `shlex.quote` on identifier-like values with an allow-list `re.sub`. It found nothing blocking and no security issue.

**Acted on:**
- **Should-fix 1:** an empty identifier now cleans to `_` at the three file-name sites (`collection_type_source*`, ilastik, HiGlass). That is the IUC macro's fallback, and the commit messages say the rule matches the macro. The change is folded into the original commits.

**Not acted on:**
- **Should-fix 2:** `collection_type_source*` now renames discovered elements (`sample 1` becomes `sample_1`). Keys that clean to one name also collide: in `collection_type_source` the second `>` truncates the first, and in `_map_over` the contents are merged. The reviewer suggested keeping spaces in that regex. Not taken: the alt keeps one file-name rule, the IUC one, so it shows that rule's real cost. The cost is recorded in `alts/regex_identifiers.md` for John's decision. The parent has no collisions, but it lets `../x` escape `output/`.
- **Echo sites trade fidelity for no added safety.** This is the reviewer's evaluation judgment. It goes into the recommendation (`alts/regex_identifiers.md`) rather than into a code change.
- **Nits:**
  - ilastik's duplicate error lists the cleaned names.
  - The same regex literal is pasted into 16 tools.
  - Both are left as they are for an evaluation alt.
- **Questions:**
  - The 26.1 alt's three extra `collection_type_source_*` tools: noted in the alt description.
  - HiGlass's `$uploaded_genomes = ""` item assignment, which predates this alt: noted, out of scope.

<details>
<summary>Full review</summary>

**Method:** every changed `<command>` was rendered with Galaxy's `fill_template` and mock wrappers in the branch `.venv`. About 26 hostile identifiers were used, including `x'y`, `$(id)`, backticks, `;|&`, `-n`, `-e\tx`, `.`, `..`, `../../etc`, `a/b`, tab, newline, the empty string, CJK, Arabic digits, `\`, `>`, `>>`, `*`, `~root` and `--x`.

**Blocking:** none.

**Should-fix**
1. **Empty identifier.** It is not mapped to `_`, though the messages say the rule matches the IUC macro.
   - On 200k random strings, the alternation and `@SAFE_ELEMENT_IDENTIFIER@` differ only on `''`.
   - At the file-name sites the result is broken but harmless: HiGlass writes `data/.bed`, then `data/`; `collection_type_source` writes `output/` and fails with "Is a directory"; ilastik makes `./.tif`.
   - This is not a regression. The parent's `data/''` behaves the same, and Galaxy doesn't reject empty element identifiers.
   - Fix: add `or '_'`, or drop the claim.
2. **`collection_type_source*` collisions and renamed elements** (`pattern="__name__"`).
   - `a b` and `a_b` both become `output/a_b`. In the first tool, the `>` truncates and the list ends up with one element and no error. In `_map_over` the contents are merged.
   - Paired inputs and all existing tests are unaffected.
   - Option: keep spaces (`[^\w .-]`) there, or accept the change and document it.

**Evaluation judgment**
- **Echo-only sites** (7 `identifier_*`, 4 "identifier is" tools and 2 collection-name tools).
  - `shlex.quote` was already shell-safe there. Cleaning loses fidelity: `a:b` and `a_b` can no longer be told apart.
  - The parent's own hole: `shlex.quote('-n')` is a bare `-n`, which `echo` swallows. `printf '%s\n' ${shlex.quote(...)}` beats both.
  - Suggestion: regex for file names, `shlex.quote`/printf for echoed text.
- **Current tests should still pass, on reasoning.**
  - Tool `<tests>` use `i1`, `samp1`, `forward`, `1.tabular` and `collection name`.
  - API tests use `Plain HDA`, `Normal HDA1`, `foo`/`bar`, `sample_a`/`sample_b`, `test0` and `test_level_1`. These are all in the kept set, and echo keeps spaces.
- **HiGlass's visible track and file names change**, e.g. `Sample (rep1)` becomes `Sample__rep1_`. Duplicate cleaned names are harmless because each ingest runs before the next overwrite. Question: could `ingest_tileset --name` carry the original name?

**Checked and correct**
- **Escaping.** `\\w` is literal in XML both inside and outside CDATA, and reaches Python as `\w`. This avoids the invalid-escape `SyntaxWarning` that the existing `'[^\w\-\.]'` sites in the Jupyter and AskOmics tools have.
- **Cheetah.** Nested `'...'` inside `${...}` inside shell single quotes parses. `#set` inside `#for` is evaluated on each iteration. Braces are used before suffixes.
- **Shell safety.**
  - Every output is a single-quoted word with no `'`, `\`, `$`, backtick or newline.
  - With `/` removed, there is no traversal. `..` becomes `_.`, and `.` becomes `_`.
  - Echoed labels have no leading `-`.
- **Regex edge cases.**
  - Tab, newline, U+202E and ZWJ become `_`.
  - Decomposed accents are mangled (`e`+U+0301 becomes `e_`).
  - Length is unbounded, as on the parent. Dev's `safe_filename_component` bounds it.
- **HiGlass `--coordSystem`.** Keeping `shlex.quote` there is right. The value is a genome label that must match `$file.metadata.dbkey` and the raw `in $existing_genomes` checks.
- **ilastik.** Names that clean to the same link are now rejected rather than overwritten. The new false-duplicate case is `img 1` with `img_1`.
- **No site missed or wrongly changed.** The remaining `shlex.quote` uses are on non-identifiers:
  - `cheetah_casting`, `directory_uri`, `gx_directory_uri*` and `unicode_stream`;
  - HiGlass's `$uploaded_genomes` values.
- **Panoply, VRM Editor and Phinch** use `display_name`, which the wrapper sanitizes. They are out of scope.
- **`safe_element_identifier`** is absent on `origin/release_25.1`. It is a dev wrapper property and doesn't apply to `.keys()` strings anyway, so an inline regex is right for 25.1.

**Commit hygiene:** the commits are small and mirror the parent's split. There are no stray files. The only inaccuracy was the IUC-equivalence claim, fixed above.

**Nits:**
- ilastik's duplicate error shows the cleaned names.
- The regex literal is repeated in 16 tools, with no shared macro.

**Questions:**
1. The 26.1 alt's `collection_type_source_{conditional,digit_name,section_repeat}` would need the same change.
2. HiGlass sets `#set $uploaded_genomes = ""` and then assigns items on it. That raises a TypeError when a labeled chromsizes file matches an existing genome. It predates this alt.

</details>
