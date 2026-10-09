# galaxy#19330 - survey of `format_source` / `structured_like` refs in real tool wrappers

Question: what would a stricter output-reference linter (repeat-aware paths, `|` paths
validated, `[...]` selectors understood) flag in real repos?

## Scanned (2026-09-29)

| repo | commit | tool XMLs | tools with refs | refs |
|---|---|---|---|---|
| galaxyproject/tools-iuc | `5a09e4ee5fd1` (origin/main, via `git archive`; local clone left on its branch) | 2296 | 123 | 245 |
| bgruening/galaxytools | `a8748ebc4c16` (fresh shallow clone) | 756 | 61 | 93 |
| galaxyproject/tools-devteam | `ddbe2a1e6ede` (fresh shallow clone) | 166 | 13 | 13 |

3 iuc `deprecated/` tools failed macro loading (missing macro files) and were skipped.

## Method

Script: `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-reviews/1b0af2d9-c7b1-4cc4-af03-86a60c29ecfa/scratchpad/scan_refs.py`
(raw output `iuc.jsonl`, `bg.jsonl`, `dt.jsonl` beside it).

- Every `*.xml` with a `<tool>` root, loaded with `get_tool_source()` from the 19330 worktree (macros + tokens expanded).
- Inputs walked into full paths (`cond|x`, `sec|x`, `r_\d+|x`) and legacy aliases (conditional/section dropped, repeat kept).
- Every `data`/`collection` under `<outputs>`, including `<data>` nested in `<collection>`, with `format_source` or `structured_like`, classified A-H per the task. A selector counts as E when any param at that path is `data_collection`.
- "Current linter" column: I ran the 19330 branch's `OutputsFormatSourceReference` / `OutputsStructuredLikeReference` on each tool. Those linters use `./outputs/data|collection`, so nested outputs are **never linted today** ("not-linted").

Note: the current `_get_qualified_name` skips repeats, so a bare name inside a repeat (class C) passes today silently.

## Counts (refs; distinct tools in parens)

| class | iuc | galaxytools | devteam |
|---|---|---|---|
| A qualified OK | 142 (102) | 77 (53) | 12 (12) |
| B legacy alias only | 58 (22): 52 warn, 6 nested/not-linted | 0 | 1 (1) warn |
| C bare name in repeat | **0** | **0** | **0** |
| D `\|` path, no match | 5 (1) | 0 | 0 |
| E selector on collection | 36 (8) | 8 (1) | 0 |
| F bad selector / unparsable | 0 | 0 | 0 |
| G no match (errors today) | 0 | 8 (8) | 0 |
| H output name | 0 | 0 | 0 |

Only one `structured_like` exists in the three repos (iuc `sickle`, class B). No ambiguous unqualified names: every legacy alias resolves to exactly one path. No Cheetah or `$` values.

## D - `|` path matches nothing

| repo | tool | outputs | value | actual input | judgement |
|---|---|---|---|---|---|
| iuc | tools/barcode_splitter/barcode_splitter.xml | split_output_single, split_output_paired, split_output_paired_other, split_output_multi, index_only (all top-level `<collection>`) | `runinterface\|input` | `runinterface\|seqfiles_N\|input` (in repeat) | Truly unresolvable, but harmless: each collection's `discover_datasets` pattern captures `(?P<ext>)`, so `resolve_format_source` falls back. The current linter passes it because it skips values containing `\|`. |

## G - no match (current linter already errors)

| repo | tool | output | value | actual input | judgement |
|---|---|---|---|---|---|
| galaxytools | tools/rpy_statistics_collection/{cca,kcca,kpca,linear_regression,logistic_regression_vif,partialR_square,pca}.xml | out_file1 | `input` | `input1` | Typo, truly broken (falls back to a random input ext, so still `tabular` in practice). |
| galaxytools | tools/sambamba/Sambamba_merge.xml | output | `input_files` | `input_bam` | Truly broken: stale name after a param rename. |

## E - selector on a data_collection (important)

| repo | tool | outputs | value | base class | current linter |
|---|---|---|---|---|---|
| iuc | tool_collections/galaxy_sequence_utils/fastq_paired_end_interlacer/... | outfile_pairs_from_coll, outfile_singles_from_coll | `reads_coll['forward']` | B (`reads\|reads_coll`) | **error (false)** |
| iuc | tools/flash/flash.xml | merged_reads, unmerged_reads_f, unmerged_reads_r | `reads['forward']` / `['reverse']` | B (`layout\|reads`) | **error (false)** |
| iuc | tools/sickle/sickle.xml | output_paired_coll_single | `input_paired['forward']` | B (`readtype\|input_paired`) | **error (false)** |
| iuc | tools/fastp/fastp.xml | 4 top-level outputs | `single_paired\|paired_input['forward']` | A | ok (skipped: contains `\|`) |
| iuc | tools/kneaddata/kneaddata.xml | 20 nested forward/reverse | `read_type\|paired_collection['forward'/'reverse']` | A | not-linted |
| iuc | tools/bowtie2/bowtie2_wrapper.xml | 4 nested forward/reverse | `library\|input_1['forward'/'reverse']` | A; the same path is `data` in one `when` and `data_collection` in another | not-linted |
| iuc | tools/rasusa/rasusa.xml | nested forward, reverse | `collection['forward'/'reverse']` | B | not-linted |
| iuc | tools/trimmomatic/trimmomatic.xml | 4 nested forward/reverse | `fastq_pair['forward'/'reverse']` | B | not-linted |
| galaxytools | tools/trim_galore/trim_galore.xml | 8 nested forward/reverse | `input_mate_pairs['forward']` | B (`singlePaired\|input_mate_pairs`) | not-linted |

That is 6 false errors today, in 3 iuc tools. Extending the linter to nested outputs without selector support would add 38 more. Selector matching must accept a path when any param at it is a collection (bowtie2 case). The linter must also strip the selector and then apply the B warning, not an error.

Aside (not a lint issue): trim_galore `reverse` and one bowtie2 `reverse` use `['forward']`. This looks like copy-paste, though it is harmless when the formats match.

## F / H / C

None found.

## Recommendation

- **C -> ERROR.** Zero real-world hits in 3 repos (3218 tool XMLs). It is always broken at runtime, and the current linter silently accepts it, so the new check closes a real gap at no cost.
- **D -> ERROR.** One hit (barcode_splitter). It is truly unresolvable, just masked by `discover_datasets` ext. Erroring is correct, and fixing it is a one-line change (drop `format_source`, or point it at `runinterface|seqfiles_0|input`). Worth a small tools-iuc PR alongside.
- **E must land with (or before) the strictness change.** The selector-parsing fix removes 6 false errors that exist today. Then decide whether to lint nested `<collection>/<data>` outputs. If so, include B-with-selector as a warning. Without selector support, 38 nested refs (8 of them in galaxytools) would go red.
- B stays a warning: 59 refs in 23 tools. That is too common to promote.
