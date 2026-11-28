# Alt: regex identifiers

`stock_tools_review_clean_alt_regex_identifiers` at `0bd72f5a542` is pushed to `jmchilton`. It is an evaluation alt: 7 commits on top of the parent (`1a6d0585a37`, release_25.1). Where the parent shell-quotes an identifier-like value with `shlex.quote`, the alt cleans it with an allow-list `re.sub` and single-quotes the result. Identifier-like values are element identifiers, collection element keys and collection names. Everything else on the parent is unchanged. John asked for it on 2026-11-28 and decides after reading this; the parent and its 26.1 alt are untouched.

**Decision (John, 2026-11-28):** the regex is used for element identifiers and collection keys in the framework test tools only. The parent took this alt's 4 commits for those sites (`22ff539f97a`), and real tools and collection names keep `shlex.quote`. This alt stays as the record of the regex-everywhere evaluation.

## The documented patterns

| Source | Form | Notes |
|---|---|---|
| planemo `docs/_writing_collections.rst` (~L205) | `"${re.sub('[^\w\-_]', '_', $input.element_identifier)}"` | Keeps a leading `-` |
| IUC Tool Security Checklist, "3. Treat identifiers and generated filenames as untrusted" | `re.sub(r'[^\w.-]', '_', identifier)`, then `ln -s '$input' '${safe_identifier}.fasta'` | "Single-quote the final path"; warns that names collide |
| tools-iuc `macros/element_identifier_macros.xml`, `@SAFE_ELEMENT_IDENTIFIER@` | `[^\w\-.]` to `_`, then a leading `-`/`.` to `_`, and an empty result to `_` | "The result must still be quoted". It is the helper the tool-patches collection copies (`tools/hand_residual.py`) |
| Galaxy `$input.safe_element_identifier` (#23735, `safe_filename_component`) | ASCII `[A-Za-z0-9._-]`, leading `.`/`-` stripped, bounded length | **release_26.2 and dev only.** It is not on release_25.1 or release_26.1; the `safe_element_identifier` there is a local variable in `wrappers.py`. The xsd says it still needs quoting. It exists on dataset and collection wrappers, not on `.keys()` strings |

The `[^\w\-\s]` form is not on the planemo or IUC pages; it appears in 14 tools-iuc tools. Galaxy already ships planemo's form in both cellxgene tools, and `[^\w\-\.]` in the Jupyter tools; the latter is why the parent added `./` there.

## What the alt does

All of this is done with one regex, `'^[-.]|[^\\w.-]'` (written with `\\w` inside the XML). It is the IUC macro's rule in a single alternation; the empty-to-`_` fallback is `or '_'`, used at the file-name sites.

| Sites | Form | Quoting |
|---|---|---|
| **File names:** `collection_type_source{,_map_over}` (`output/<key>`), ilastik's links, HiGlass' two names per file | `re.sub('^[-.]\|[^\\w.-]', '_', str(x)) or '_'` | Single-quoted. The IUC docs ask for quotes, though the cleaned alphabet doesn't need them |
| **Echoed labels:** the 8 `identifier_*` tools, the 4 "identifier is" collection tools, and `collection_paired_test` / `collection_record_test_two_files` | The same rule, but a literal space is also kept (`[^\\w .-]`), and there is no fallback | Single-quoted, which is required because of the space. Not `\s`, because a newline would add an output line |
| **Kept as `shlex.quote`:** HiGlass chromsizes `--coordSystem` | | It is a genome name that must match `dbkey` and the raw `$existing_genomes` checks, so cleaning would break the match. The review agreed |

Spaces are kept in labels because `collection_paired_test` and `collection_record_test_two_files` assert `Collection name: collection name`. Not in scope: Panoply, VRM Editor and Phinch use the sanitized `display_name` and already had no findings. The non-identifier `shlex.quote` sites stay: `directory_uri`, `unicode_stream`, `cheetah_casting`, and HiGlass' `$uploaded_genomes`.

If this goes forward, the 26.1 alt would also need it for `collection_type_source_{conditional,digit_name,section_repeat}`.

## Does it clear the findings?

Branch 1's analyser was run at `53559de55d0` (`~/tool_security/analyser_b1`) and at the current head `590a784bd04`, over `tools/` and `test/functional/tools/`. The two **agree on every tool and every probe**. Vulnerability findings:

| | base 25.1 | parent (quote) | alt (regex) |
|---|---|---|---|
| `tools/` high/medium/low | 15/42/99 | 0/0/78 | 0/0/78 |
| `test/functional/tools/` high/medium/low | 35/21/88 | 8/21/87 | 8/19/79 |

Per changed tool, base → quote → regex:
- **The 8 `identifier_*` tools:** high `shell-injection` + low `option-injection` → low `option-injection` → **none**.
- **The 4 "identifier is" tools and the 2 collection-name tools:** high `shell-injection` → none → none.
- **`collection_type_source`, `_map_over`:** high `shell-injection` + medium `path-traversal` → medium `path-traversal` → **none**.
- **ilastik:** 2 high, 1 medium and 1 low → none → none.
- **HiGlass:** 12 high, 9 medium and 7 low → 4 low → the same 4 low (`$uploaded_genomes`, `dbkey` and `valuecol`; none of them is an identifier).
- **No new findings** anywhere.

So the alt clears 2 mediums and 8 lows that quoting left. The highs it clears are the same ones quoting cleared.

Recognition by form, from synthetic probes (`probes/` in the session scratchpad). Each form was tested quoted and unquoted, as a whole `echo` argument and as a file name:

| Form | Recognised | What remains |
|---|---|---|
| `shlex.quote(x)` | yes | Low `option-injection` when the value leads an argument; medium `path-traversal` (`/`) in a file name |
| planemo `[^\w\-_]`, any quoting | yes | Low `option-injection` (a leading `-` is kept) |
| IUC checklist `[^\w.-]` + `'...'` | yes | Low `option-injection` when leading; none in a file name |
| IUC macro `#def` (lead fix), quoted or not | yes | None |
| Alternation `^[-.]\|[^\w.-]`, quoted or not | yes | None |
| `[^\w\-\s]` / `[^\w .-]` | yes | Unquoted: medium `argument-injection` (space), which is real. Quoted: none with the lead fix |
| Deny-list (`[;&\|$...]`) | Correctly not treated as clean | Medium `argument-injection` (glob characters) + low |
| `$x.safe_element_identifier` | yes; clean even unquoted (`nodes.py` `_DATA_CLEAN` and the collection list) | None. The analyser doesn't know the attribute is 26.2-only |

**No documented form is a false positive.** The allow-list modelling is in `charsets.regex_removed` and `interp._substitute`; alternations are supported. The lows left on forms without the lead fix are real: a leading `-` reaches `echo` or `ln` as an option. So the spec branch's fix list has nothing to add from this.

## What users see differently (vs the parent)

`render_compare` (`rx_compare.py` and `rx_cases/` in the session scratchpad) rendered argv for 23 identifiers per tool:
- **Identical:** every test value (`forward`, `reverse`, `i1`, `samp1`, `1.tabular`, `simple_line.txt`, `collection name`), plus `sample_1`, `rep-2.v1`, `a.b.c`, `échantillon` and `数据`. A space is also identical in labels.
- **Changed in labels, the identifier written out:**
  - A leading `.`/`-` becomes `_` (`-n` → `_n`).
  - `'`, `/`, `;`, `$()`, tab and newline become `_` (`it's` → `it_s`).
  - This fixes one parent bug: `shlex.quote('-n')` is a bare `-n`, which `echo` swallows. But these framework tools exist to show that Galaxy passes identifiers through, and cleaned identifiers can no longer be told apart (`a:b` and `a_b`).
- **Changed in file names, the same characters plus spaces:**
  - **`collection_type_source*`:** discovered output elements are renamed (`my sample` → `my_sample`, `a/b` → `a_b`). Keys that clean to one name collide silently: `collection_type_source`'s second `>` truncates the first, and `_map_over` merges the contents. On the parent, `a/b` failed and `../x` escaped `output/`.
  - **ilastik:** link names change. Names that clean alike (`a b` and `a_b`) are now reported as duplicates and the tool exits, rather than becoming two files. The error lists the cleaned names.
  - **HiGlass:** file and track names change (`Sample (rep1)` → `Sample__rep1_`). Duplicates are harmless, because each ingest runs before the next overwrite.
  - **Empty identifier:** it is `_` at the file-name sites (`output/_`, `./_.tif`). On the parent it was a broken path in both.

## Tests (25.1, each run alone under `~/tool_security/.galaxy-tests.lock`, `-p no:postgresql`)

All on the alt:
- **Framework:** 11/11. That covers every changed tool with test cases; 8 have an empty `<tests>`.
- **Workflow framework:** 9/9 (`zip_collection`, `subcollection_rank_sorting{,_paired}`, `triply_nested_list_mapping`).
- **API:** 47/47. These are the re-grepped nodes in `test_jobs`, `test_tool_execute`, `test_tools`, `test_workflow_extraction` and `test_workflows`, including the helper-driven `identifier_single` job-cache tests.
- **Integration:** 2/2, `test_extended_metadata[collection_paired_test]` and `test_collection_explicit_and_implicit`.
- **After the review's empty-name fix:** the `collection_type_source` framework tests (2/2) and its 4 API tests were run again.
- All 18 changed files are XSD-valid.

## Recommendation

**Split by site rather than one rule.**
- **File names:** take the regex for ilastik, HiGlass and `collection_type_source{,_map_over}`. It is the documented convention for names (IUC checklist and macro, and dev's own `safe_element_identifier`). It clears more of the review: the `collection_type_source` path-traversal medium that quoting left. It also stops `/` and a leading `-` or `.` from making broken or hidden paths.
  - The cost is renamed files and tracks for unusual identifiers on a release branch, plus silent collisions in `collection_type_source`. A unique suffix would fix those, but that is a test tool.
- **Echoed text:** keep `shlex.quote` for the 14 tools that echo identifiers. It keeps the exact value, which is what those framework tools test, and it changes nothing a user sees. The regex there only clears the 8 low `option-injection`s.
  - If those lows matter, the analyser-clean fix that keeps fidelity is the glued literal prefix dev already uses (`'identifier '...`), not cleaning. That changes those tools' expected output, though.
- **Dev forward-port:** a later forward-port to 26.2/dev could use `$input.safe_element_identifier` for dataset file names (stricter, bounded). It doesn't cover `.keys()` strings.
- **One rule for everything:** quote everywhere is the lower-risk release-branch choice, and only the accepted `collection_type_source` medium is left. Regex everywhere is the more documented convention, but it gives up identifier fidelity in the test tools.

The review is `subagents/review_regex_identifiers.md`.
