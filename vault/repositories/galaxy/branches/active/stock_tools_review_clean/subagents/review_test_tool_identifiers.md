# Review: regex for element identifiers in the framework test tools

A normal review of the revision John asked for on 2026-11-28: the IUC allow-list regex for element identifiers and collection keys in `test/functional/tools/`, with `shlex.quote` kept everywhere else. It covered 25.1 (`1a6d0585a37..f3757cb21e2`) and the 26.1 alt (`cc4079ce8bc..8dbd6e7953e`). It found nothing blocking and no security issue.

**Acted on:**
- **1, the forward-merge resolution at 26.2 and dev:** recorded in `implementation_debrief.md` and `index.md`. The command is the same as before: take `22feb23fb4b`'s three identifier tools whole. That now keeps `shlex.quote` in those files at 26.2+, as a deliberate exception to the regex rule. It also means taking the whole file, because `#import re` merges in outside the conflict.
- **2 and 3, the commit messages:** reworded before pushing. Commit 1 now says why it moves off `shlex.quote` (a leading `-` reached `echo` as an option) and that the labels drop the macro's empty-name fallback. Commit 4 now says "the tool's output directory" and that keys which clean alike share one file. The new heads are `22ff539f97a` (25.1) and the 26.1 alt's reworded head; the trees are unchanged.
- **6, the collision behaviour:** recorded in `implementation_debrief.md`.
- **7, the 26.1 alt's pre-existing `extract_genomic_dna.py` conflict at 26.2 and dev:** noted in `alts/release_26_1.md`.

**Not acted on:**
- **4, the other test tools that use `element_identifier` or `.keys()`** (`collection_creates_list*`, `implicit_*_conversion`, `fail_identifier`, `count_list`): they were never in the parent's 25-tool scope, and the analyser reports nothing on them. The reviewer's note that the analyser doesn't trace output-collection keys back to input identifiers is for branch 1, and is passed to the coordinator.
- **5 and 8:** information only. The 26.1-only tools render as before for every test value, and a 26.1 follow-up after a 25.1 merge would reuse commit 4.

Run via a Claude general-purpose subagent (Opus 5.5) at the default effort.

<details>
<summary>Full review</summary>

**Not blocking.** I found nothing that stops either branch. The one should-fix is that the regex can't simply be carried forward into 26.2/dev for the three adapted identifier tools. The forward-merge resolution has to change: take the shlex dev form there. Everything else is nits and info. Nothing security-sensitive came up.

## Findings

1. **should-fix: the 26.2/dev resolution for `identifier_{single,collection,all_collection_types}.xml`.** 25.1 head `f3757cb21e2` still conflicts in exactly these three files at release_26.2 and dev, one hunk each, as before. 26.0 and 26.1 still merge cleanly. The resolution can't be "regex plus dev's prefix".
   - dev's and 26.2's `test_tools.py::test_identifier_outside_map` asserts `["identifier ../Plain HDA", "safe_identifier _Plain_HDA"]`. The regex would print `identifier _._Plain HDA`, so the test fails.
   - It would also undo the point of these dev tools, which is to print the raw identifier next to `safe_element_identifier`.
   - On dev the glued `'identifier '` prefix already makes `shlex.quote` analyser-clean, so the regex gains nothing there.
   - **Resolution:** take `22feb23fb4b`'s versions of all three files whole, e.g. `git checkout 22feb23fb4b -- test/functional/tools/identifier_{single,collection,all_collection_types}.xml`. identifier_single then reads:
     ```
     #import shlex
     echo 'identifier '${shlex.quote(str($input1.element_identifier))} > 'output1';
     echo 'safe_identifier $input1.safe_element_identifier' >> 'output1'
     ```
     The other two follow the same pattern, with the `element_identifier ` / `safe_element_identifier ` labels in all_collection_types.
   - **Take the whole file, not just the hunk.** In identifier_collection and identifier_all_collection_types, the `#import re` line sits outside the conflict and auto-merges in. Picking only dev's side of the hunk would leave `#import re` above `shlex.quote`, and the template would fail when it renders.
   - **Record this as a deliberate exception** to John's "regex for identifiers" rule at 26.2+, in the debrief's forward-merge note and later in the PR description.
2. **nit: commit 4's body is wrong for one 26.1 tool.** "a key names one file in output/" is wrong for `collection_type_source_section_repeat`, which writes to `section_output/` and `repeat_output/`. Suggested wording: "names one file in the tool's output directory". It should also add one sentence that keys which clean to the same name now share one file.
3. **nit: commit 1 doesn't say why it moves off shlex.quote.** Suggested addition: "shlex.quote leaves a leading '-', which echo takes as an option (`-n` printed nothing)." Strictly, the labels also drop the macro's empty-to-`_` fallback; "and without its empty-name fallback" would make it exact. Nothing in any of the four messages conflicts with John's narrower decision. None of them mentions collection names, `tools/`, ilastik or HiGlass. Commit 2 has no body, which is fine because it mirrors the parent's separate identifier_single commit for branch 4.
4. **info: the scope is correct on both bases.**
   - `shlex` remains in exactly these test tools, all of them non-identifier sites: `cheetah_casting`, `collection_paired_test` and `collection_record_test_two_files` (`$f1.name`), `directory_uri`, `parameters/gx_directory_uri{,_validation}` and `unicode_stream`.
   - The regex is in 14 files on 25.1 and 17 on 26.1, which are exactly the diffstat files. Nothing under `tools/` changed.
   - Other test tools still use `element_identifier` or `.keys()`: `collection_creates_list{,_2,_fail,_of_pairs}`, `implicit_{collection,nested_list}_conversion`, `fail_identifier` and `count_list`. They were not in the parent's 25-tool scope, and branch 1's analyser reports nothing on them.
   - Side note for branch 1: `collection_creates_list*` echo keys of a `structured_like` output collection inside double quotes. Pointed at `$input1.keys()`, the same command gets 2 highs, but the analyser doesn't trace output-collection keys back to the input. That looks like an analyser coverage gap, outside this branch's scope.
5. **info: the three 26.1-only tools render correctly.** Rendered with `fill_template`, base against head. `#set $name` inside `#for` works, and in `section_repeat` it is reset in each loop. None of the tools has a param named `name`. `pattern="__name__"` is `(?P<name>.*)`, so a discovered element takes the cleaned file name. `samp1`, `samp2`, `forward`, `reverse`, `1`, `2`, `1.tabular`, `simple_line.txt`, `échantillon` and `数据` give identical argv, digit keys included. The only workflow user is `collection_type_source_conditional_mapped`, whose identifiers `outer1`/`inner1` are unchanged. Branch 1's analyser reports nothing on the changed 26.1 tools. The identifier tools also render identically for test values on 25.1, spaces included.
6. **info: collision and rename behaviour.** For keys A and B (in key order) that clean to the same name N (`a:b`/`a_b`, `my sample`/`my_sample`, `-n`/`_n`), the discovered collection loses an element in every case:

   | Tool | Command | Result |
   |---|---|---|
   | `collection_type_source` | `cat header > N; cat A >> N`, then the same for B | N is the header plus B. A is lost |
   | `_map_over` | `>>` only | N is A followed by B (merged) |
   | `_conditional`, `_digit_name` | `>` | N is B (last wins) |
   | `_section_repeat` | `>` in both loops | The section list: last wins. The repeat input is `paired`, so it can't collide |

   Paired inputs can't collide. Renames: `../x` becomes `_._x`, `.hidden` becomes `_hidden`, an empty key becomes `_`, `it's` becomes `it_s`, and `$(id)` becomes `__id_`. On the base, `../x` wrote outside `output/` and `a/b` failed.
7. **info: 26.1 alt into 26.2/dev.** `8dbd6e7953e` conflicts in the same three identifier tools, and in `tools/extract/extract_genomic_dna.py`. That second conflict predates this revision (`cc4079ce8bc` conflicts the same way) and isn't recorded in `alts/release_26_1.md`. The new `collection_type_source_*` edits merge cleanly.
8. **info:** the high still left on 26.1 after a 25.1 merge remains in the three 26.1-only `collection_type_source_*` tools. The 26.1 alt now carries their regex fix, so a follow-up on release_26.1 would use the same commit-4 text.

**How it was checked:** diffs, messages and `git range-diff` on both bases; `git merge-tree --write-tree` of old and new heads against release_26.0, 26.1, 26.2 and dev; dev's and 26.2's identifier tools and their API tests; branch 1's analyser at `53559de55d0` on the changed 26.1 tools and the untouched key-iterating tools; a `fill_template` render script. No Galaxy tests were run and nothing was modified.

</details>
