# Implementation debrief

```
created .../stock_tools_review_clean/differential-review/snapshots/20261128T030250Z-revision-22ff539f97ab.json
  revision @ 22ff539f97ab vs origin/release_25.1 (merge-base fa9176afc8f9)
  since 20261128T000743Z-revision-1a6d0585a37d:
    commits: 34 same, 0 rebased, 0 changed, 4 new, 0 dropped
    hunks:   47 carried, 14 changed, 0 new, 0 dropped
    new     aa82ffefbac8 Clean element identifiers in identifier test tools with an allow-list re.sub
    new     996999da6c07 Clean the element identifier in identifier_single with an allow-list re.sub
    new     cabd60052e2e Clean collection element keys echoed by collection test tools with an allow-list re.sub
    new     22ff539f97ab Clean the file names collection_type_source tools make from element keys
```

**STATUS: READY**, with the decisions below. John read the regex evaluation alt and chose (2026-11-28): framework test tools clean element identifiers with the IUC regex, and real tools keep `shlex.quote` because it keeps the exact value. The previous debrief is `earlier_drafts/5/implementation_debrief.md`. Its stock-tool and test-tool content still applies, apart from the sites listed here.

- **Head:** `22ff539f97a` on `jmchilton/stock_tools_review_clean`, 38 commits on `origin/release_25.1`. 4 new commits sit on top of `1a6d0585a37`, pushed as a plain fast-forward.
- **26.1 alt:** `stock_tools_review_clean_alt_release_26_1` is at `d7fce338706`, the same 4 commits on `cc4079ce8bc`, also a fast-forward. Its fourth commit also covers the three 26.1-only `collection_type_source_{conditional,digit_name,section_repeat}` tools.
- **Regex alt:** `stock_tools_review_clean_alt_regex_identifiers` (`0bd72f5a542`) is unchanged. It stays the record of the regex-everywhere evaluation.

## What changed

The 4 commits are cherry-picks of the alt's commits for identifier sites. Commits 1 and 4 were reworded after the review.

| 25.1 | 26.1 alt | Subject | Tools |
|---|---|---|---|
| `aa82ffefbac` | `1608a13303f` | Clean element identifiers in identifier test tools with an allow-list re.sub | `identifier_{collection,all_collection_types,in_conditional,multiple,multiple_in_conditional,multiple_in_repeat,single_in_repeat}` |
| `996999da6c0` | `35490ad3a81` | Clean the element identifier in identifier_single with an allow-list re.sub | `identifier_single` |
| `cabd60052e2` | `e5a54bb4015` | Clean collection element keys echoed by collection test tools with an allow-list re.sub | `collection_list_2x_or_3x_nested`, `collection_list_or_nested_list_input`, `collection_list_paired_or_unpaired`, `collection_paired_or_list_paired_input` |
| `22ff539f97a` | `d7fce338706` | Clean the file names collection_type_source tools make from element keys | `collection_type_source{,_map_over}` (26.1 adds `_conditional`, `_digit_name`, `_section_repeat`) |

- **Echoed identifiers** use `'${re.sub('^[-.]|[^\\w .-]', '_', str(x))}'`, single-quoted, with spaces kept. Where a literal prefix is echoed, prefix and value are one single-quoted word.
- **File names** use `#set $name = re.sub('^[-.]|[^\\w.-]', '_', str($key)) or '_'`, then `'output/$name'`.
- **Not taken from the alt:**
  - `tools/`: ilastik and HiGlass keep `shlex.quote`.
  - The collection names (`$f1.name`) in `collection_paired_test` and `collection_record_test_two_files`. Their tests' `Collection name: collection name` is a name, not an identifier.
- **Still `shlex.quote` in test tools:** `cheetah_casting`, `collection_paired_test`, `collection_record_test_two_files`, `directory_uri`, `parameters/gx_directory_uri{,_validation}` and `unicode_stream`. None of them is an identifier site.

## What users see differently (vs `1a6d0585a37`)

- **Test values are unchanged.** `forward`, `reverse`, `i1`, `samp1`, `1`, `2`, `1.tabular`, `simple_line.txt`, `Plain HDA`, `test_level_1`, `outer1`, `échantillon` and `数据` all render the same argv.
- **Echoed identifiers:** a leading `.`/`-` becomes `_`, and so do `'`, `/`, `;`, `$()`, tab and newline. This fixes the parent's `-n`, which `echo` swallowed. Identifiers that clean alike (`a:b`, `a_b`) can't be told apart in the output.
- **`collection_type_source*` file names**, and so discovered element names: spaces are cleaned too (`my sample` becomes `my_sample`). `../x` becomes `_._x`, `.hidden` becomes `_hidden`, and an empty key becomes `_`. On the parent, `../x` wrote outside `output/` and `a/b` failed.
- **Collisions.** Keys A then B that clean to one name N give a collection with one element fewer, and no error:

  | Tool | Command | Result |
  |---|---|---|
  | `collection_type_source` | `cat header > N; cat A >> N`, then the same for B | N is the header plus B; A is lost |
  | `collection_type_source_map_over` | `>>` only | N is A then B, merged |
  | `_conditional`, `_digit_name` (26.1) | `>` | N is B; last wins |
  | `_section_repeat` (26.1) | `>` in both loops | The section list: last wins. The repeat input is `paired`, so it can't collide |

  Paired inputs can't collide. No test uses keys that clean alike. A unique suffix would avoid this, but these are test tools.

## Verification

**Analyser**, branch 1 at `53559de55d0` (`~/tool_security/analyser_b1`) and at its current head `590a784bd04` (a fresh detached worktree, since removed). The two agree on every count. Vulnerability findings, high/medium/low:

| | parent | revision | regex alt |
|---|---|---|---|
| 25.1 `tools/` | 0/0/78 | 0/0/78 | 0/0/78 |
| 25.1 `test/functional/tools/` | 8/21/87 | 8/19/79 | 8/19/79 |
| 26.1 `tools/` | 0/0/77 | 0/0/77 | |
| 26.1 `test/functional/tools/` | 8/26/93 | 8/20/85 | |

- **`tools/`:** the JSON reports are byte-identical to the parent's on both bases.
- **Test tools:** the only changes are removed findings. The 8 identifier tools lose their low `option-injection`. The `collection_type_source*` tools lose their medium `path-traversal`: 2 on 25.1, and 6 on 26.1, where `_section_repeat` had two. On 25.1 every per-tool result matches the regex alt.
- **Highs left:** the same 5 tools as before, all known-intended or false positives.
- All changed files are XSD-valid: 14 on 25.1 and 17 on 26.1.

**Tests**, each run in turn under `~/tool_security/.galaxy-tests.lock` with `-p no:postgresql`:

| | 25.1 | 26.1 alt |
|---|---|---|
| Framework, every changed tool with `<tests>` | 9/9 (5 tools) | 12/12 (8 tools) |
| Workflow framework | 8/8 (`subcollection_rank_sorting{,_paired}`, `triply_nested_list_mapping`) | 13/13 (adds `collection_semantics_list_paired{,_or_unpaired}`, `collection_type_source_conditional_mapped`) |
| API, every node re-grepped on the base (incl. helper- and fixture-driven) | 45/45 (43 nodes) | 55/55 (51 nodes) |

- **26.1 venv:** the 26.1 runs used a temporary worktree, since removed, with `issue_25004_mapped_job_outputs_26_1`'s `.venv`. Its pins match 26.1's, and the 25.1 venv's don't.
- **Not run:** the integration tests from the last debrief. They exercise `config_vars`, `directory_uri` and `collection_paired_test`, none of which changed. Also not run: the Selenium form tests, which only render the form.

**Review:** `subagents/review_test_tool_identifiers.md` found nothing blocking. Its should-fix, the forward-merge resolution, is below, and both message nits are taken.

## Forward merge

- **Clean:** release_25.1 still merges cleanly into 26.0 and 26.1.
- **Conflicts:** into 26.2 and dev, the three adapted identifier tools still conflict on one hunk each. The 26.1 alt conflicts in the same three files, plus `tools/extract/extract_genomic_dna.py`. That last one predates this revision.
- **Resolution, unchanged:** take dev's versions of the three files whole: `git checkout 22feb23fb4b -- test/functional/tools/identifier_{single,collection,all_collection_types}.xml`.
- **At 26.2 and later this is an exception to the regex rule.** Those files keep `shlex.quote` there, with dev's glued `'identifier '` prefix. dev's tools exist to print the raw identifier next to `safe_element_identifier`, and `test_identifier_outside_map` asserts `identifier ../Plain HDA`, which the regex would turn into `_._Plain HDA`. The prefix already makes them analyser-clean.
- **Take whole files, not hunks.** In `identifier_collection` and `identifier_all_collection_types`, `#import re` merges in outside the conflict. Taking only dev's hunk would leave `#import re` above `shlex.quote`, and the template would fail.

## Decisions for John

1. **Collisions** in `collection_type_source*` for keys that clean alike (above). Accepted for test tools unless you want a unique suffix.
2. **The 26.2/dev exception** for the three identifier tools (above). It would also go in the PR description.
3. **For branch 1, from the review:** `collection_creates_list*` echo the keys of a `structured_like` output collection. The analyser doesn't trace those back to input identifiers, so it reports nothing there. That looks like a coverage gap in the analyser, outside this branch.
4. **Still open from earlier debriefs** (`earlier_drafts/5/implementation_debrief.md`):
   - The 26.1-only `collection_type_source*` follow-up if the 25.1 branch is the one that merges. It would now reuse commit 4's text.
   - `str($f1.name)` printing `None`.
   - The dev branch's message.
   - 25.1's support window.
   - The PR split: the test-tool commits, now 12, form their own group.
   - The rest of the earlier list.
