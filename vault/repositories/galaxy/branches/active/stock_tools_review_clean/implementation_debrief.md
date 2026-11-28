# Implementation debrief

```
created .../stock_tools_review_clean/differential-review/snapshots/20261128T000743Z-revision-1a6d0585a37d.json
  revision @ 1a6d0585a37d vs origin/release_25.1 (merge-base fa9176afc8f9)
  since 20261127T173504Z-revision-5e553bfe3035:
    commits: 26 same, 0 rebased, 0 changed, 8 new, 0 dropped
    hunks:   38 carried, 0 changed, 23 new, 0 dropped
    new     62a34ead110e Quote element identifiers in identifier test tools
    new     9c9af956ccce Quote element identifiers in identifier_single test tool
    new     fa1b82b8cdc8 Quote collection element keys in collection test tools
    new     96e0b73790e2 Quote collection names in paired and record collection test tools
    new     5ca35c7c240f Quote directory_uri values in directory_uri test tools
    new     a6ea5fa7dce5 Quote unsanitized text in unicode_stream test tool
    new     1990f5955da4 Quote stripped text in cheetah_casting test tool
    new     1a6d0585a37d Drop unused app config branch from config_vars test tool
```

**STATUS: READY**, with the decisions below. John asked for the framework test-tool cleanup to join this branch rather than stand as its own (2026-11-27). The previous debrief is `earlier_drafts/4/implementation_debrief.md`; its stock-tool content still applies unchanged.

- **Head:** `1a6d0585a37` on `jmchilton/stock_tools_review_clean`, 34 commits on `origin/release_25.1` (`fa9176afc8f`). The 26 stock-tool commits are untouched. The 8 test-tool commits sit on top as their own group, a plain fast-forward over `5e553bfe303`.
- **26.1 alt:** `stock_tools_review_clean_alt_release_26_1` is at `cc4079ce8bc`, which adds the same 8 commits over `6cfe8e271c1`, also a fast-forward. The three `collection_type_source*` hunks that 25.1 drops are present there.
- **Source:** the commits came from the local branch `functional_test_tools_review_clean` (`070dab20526..22feb23fb4b` on dev). Its records are folded in here; see "Framework test tools" below.

## The test-tool commits

| 25.1 | 26.1 alt | Subject | Tools on 25.1 |
|---|---|---|---|
| `62a34ead110` | `d12fdb0d000` | Quote element identifiers in identifier test tools | `identifier_{collection,all_collection_types,in_conditional,multiple,multiple_in_conditional,multiple_in_repeat,single_in_repeat}` |
| `9c9af956ccc` | `8bead642223` | Quote element identifiers in identifier_single test tool | `identifier_single` |
| `fa1b82b8cdc` | `e968f664f70` | Quote collection element keys in collection test tools | `collection_type_source{,_map_over}`, `collection_list_2x_or_3x_nested`, `collection_list_or_nested_list_input`, `collection_list_paired_or_unpaired`, `collection_paired_or_list_paired_input` (26.1 adds `_conditional`, `_digit_name`, `_section_repeat`) |
| `96e0b73790e` | `c37dc16269a` | Quote collection names in paired and record collection test tools | `collection_paired_test`, `collection_record_test_two_files` |
| `5ca35c7c240` | `11e607036eb` | Quote directory_uri values in directory_uri test tools | `directory_uri`, `parameters/gx_directory_uri`, `parameters/gx_directory_uri_validation` |
| `a6ea5fa7dce` | `1adcb2531bb` | Quote unsanitized text in unicode_stream test tool | `unicode_stream` |
| `1990f5955da` | `0fc9ab350c3` | Quote stripped text in cheetah_casting test tool | `cheetah_casting` |
| `1a6d0585a37` | `cc4079ce8bc` | Drop unused app config branch from config_vars test tool | `config_vars` |

The messages match the source, except the first. Its body now says the quoting keeps the command safe for any identifier, instead of describing how a quote could close the argument.

## Adapting to 25.1 and 26.1

- **Dropped on 25.1:** the hunks for `collection_type_source_conditional.xml`, `collection_type_source_digit_name.xml` and `collection_type_source_section_repeat.xml`. Those tools don't exist on 25.1 or 26.0.
- **Adapted on both 25.1 and 26.1:** `identifier_collection.xml`, `identifier_all_collection_types.xml` and `identifier_single.xml`. dev's versions echo a literal `'identifier '` prefix and a second `safe_identifier` line; those came with upstream test commits `a2f5ae521a8`, `94153e4336b` and `27cd79c10a1`, which are on 26.2 and dev only. The 25.1 and 26.1 versions echo the bare identifier, and their tests assert bare lines. So these use `echo ${shlex.quote(str(...))}`, the same form as the other no-prefix identifier tools in that commit. Backporting the upstream test commits was not an option. They also change `galaxy.xsd` docs and API tests.
- **Unchanged:** the other 19 files are byte-identical on dev, 25.1 and 26.1, so their hunks applied as they were.
- **`config_vars`:** rechecked on 25.1 and 26.1. The only callers are the tool's own test and the three `test_handler_assignment_methods.py` classes, all with the default `__test_key`. `test_mules_as_job_handlers.py` is absent, and `b39e8ad9a2b` is an ancestor of both bases. So the `$__app__` branch is dropped on both.
- **Forward merge (from the review):** release_25.1 merges cleanly into 26.0 and 26.1. Into 26.2 and dev, the three adapted identifier tools conflict on one hunk each; nothing else does.
  - **Resolution:** take dev's prefix form with the quoting, i.e. `git checkout 22feb23fb4b -- test/functional/tools/identifier_{single,collection,all_collection_types}.xml`. Taking the 26.2 side would silently drop the quoting, and taking the 25.1 side breaks those tools' own 26.2/dev tests.
- **Wrappers:** the review checked the 25.1 wrappers with real objects. `.keys()`, `element_identifier`, `InputValueWrapper`, `$texttest.strip()` and directory_uri's unsanitized `to_param_dict_string` behave as on dev.

## Verification

**Analyser** (`~/tool_security/analyser_b1` at `53559de55d0`) over `test/functional/tools`, vulnerability findings:

| | 25.1 before | 25.1 after | 26.1 before | 26.1 after |
|---|---|---|---|---|
| High | 35 | 8 | 43 | 8 |
| Medium | 21 | 21 | 26 | 26 |
| Low | 89 | 88 | 95 | 94 |
| Tools with a high | 26 | 5 | 29 | 5 |

- **No new findings on either branch.** Every finding that appears after the change restates one from before at the same tool, rule and severity; only the expression is now the quoted one. One low goes with `config_vars`.
- **Highs left:** `color_param`, `color_param_string_method`, `gx_color`, `gx_color_optional` and `model_attributes`. These are known-intended or analyser false positives.
- **Lows left:** the no-prefix identifier tools, `cheetah_casting` and `unicode_stream` stay low `option-injection`, as on dev. On 25.1 and 26.1 that includes the three adapted identifier tools, which are clean on dev because of the prefix.
- **Mediums left:** the `collection_type_source*` `path-traversal` mediums. They are data-level and accepted, as on dev.

**Tests on 25.1**, each run in turn under `~/tool_security/.galaxy-tests.lock`:
- **Framework:** 17 of 17, across the 10 changed tools that have `<tests>`.
- **API:** 49 of 49. That covers the 47 nodes in `test_jobs`, `test_tool_execute`, `test_tools`, `test_workflow_extraction` and `test_workflows` that use a changed tool, re-grepped on 25.1. It includes helper-driven tests such as the `identifier_single` job-cache tests and `test_subcollection_mapping`.
- **Workflow framework:** 9 of 9, from the 4 `gxwf.yml` files on 25.1 that use a changed tool (`zip_collection`, `subcollection_rank_sorting`, `subcollection_rank_sorting_paired` and `triply_nested_list_mapping`).
- **Integration:**
  - `test_handler_assignment_methods.py`: 1 passed; the 2 postgres-only classes were skipped.
  - `test_remote_files.py::test_write_to_files`: 1 passed.
  - `test_extended_metadata.py[collection_paired_test]`: 1 passed.
  - `test_workflow_scheduling_options.py::test_collection_explicit_and_implicit`, which uses `collection_paired_test`: 1 passed.

**Tests on the 26.1 alt** (a temporary worktree, since removed, using a 26.1 venv with matching pins):
- **Framework:** 20 of 20, across the 13 changed tools that have `<tests>`.
- **API:** 68 of 68. That is all 62 nodes re-grepped on 26.1, not a sample, since the run was cheap.
- **Workflow framework:** 14 of 14, from the 7 `gxwf.yml` files on 26.1 that use a changed tool.

**Not run:** the Selenium tool-form tests that open `identifier_multiple`, `collection_paired_test` and `identifier_collection`. They only render the form, which these command-only changes don't touch.

**Review:** `subagents/review_test_tools_25_1.md` found nothing blocking. Its should-fix, recording the forward-merge resolution, is taken above. No code changed.

**Test challenges** were not regenerated. The >3-tests rule is about tests, and these commits change no test files: they change test tools whose output is unchanged for every value the tests use. The review's render comparison checks exactly that, and the existing `test_challenges_debrief.md` is about the stock tools, which are unchanged.

## Framework test tools: initial implementation (folded in)

This is the dev branch's initial debrief, condensed. Its brain research is `subagents/brain_research_functional_test_tools.md`, and its review is `subagents/review_functional_test_tools.md`. The review's top line refers to the dev commits.

- **Scope:** the 25 incidental (category c) framework test tools now pass the static review without high findings, and each tests what it tested before. On dev that took eight commits over `070dab20526`, with head `22feb23fb4b`. It was never pushed.
- **Idiom:** `#import shlex` and `${shlex.quote(str(...))}`, as on the stock tools.
- **Prefixes stay glued:** where a tool echoed a literal prefix, the prefix stays glued to the quoted value: `echo 'identifier '${shlex.quote(...)}`. A split form (`echo identifier ${...}`) added 11 low `option-injection` findings. The glued form adds none and gives the same argv.
- **`cheetah_casting`** keeps `$texttest.strip()`. Commit `706ec29add1` added that call as the check that old-profile empty text renders as `""`, not `None`, so the stripped result is quoted. The existing `'#out_file1'` typo stays. Fixing it would add a line that `test_run_with_numeric_input_connection` doesn't expect.
- **Not changed:**
  - Deliberate security examples.
  - Tools that test a feature the review flags: `command_reads_configfile`, `environment_variables_inject` and the legacy `<code>` tools.
  - Analyser false positives: `model_attributes` and the colour params.
  - CWL and YAML tools.
  - Any tool that a security test on branches 1, 3 or 4 uses as a red case.
- **`identifier_single`:** cleaned up here as well. Branch 4 (`tool_patches_static_findings`) uses it as a red case, and on that branch the red case moves to a new `identifier_single_unsanitized` tool. That move belongs to branch 4. The dev review lists every branch 4 file that depends on the old text: two refusal tests, `test_patch_review.py`'s `ECHO`, the two tool-patch tests and `identifier_single_fixed.xml`.
- **dev results:**
  - Analyser highs went from 64 to 27, and tools with a high from 41 to 16.
  - Framework 21/21, API 67/67, workflow framework 16/16, and the same three integration tests passed.
  - XSD-valid on dev.
  - The review found nothing blocking.

## Decisions for John

1. **Forward-merge conflict** in the three adapted identifier tools at 26.2 and dev. The resolution is above. It would also go in the PR description.
2. **Three tools are still high on 26.1 after the forward merge:** `collection_type_source_conditional`, `_digit_name` and `_section_repeat`. The 26.1 alt has their fixes. If the 25.1 branch is the one that merges, they need a small follow-up on release_26.1.
3. **Dev branch message:** the local `functional_test_tools_review_clean` still has the old wording in `30153332c65`. It doesn't matter unless that branch is published.
4. **Nit, not acted on:** `str($f1.name)` prints `None` for an unnamed collection, where it printed an empty string before. No test uses one.
5. **Still open from the last debrief** (`earlier_drafts/4/implementation_debrief.md`):
   - 25.1's support window ends around 2026-12-12; after that, release_26.0 is the policy target.
   - The `./` and `--` argv changes on 25.1.
   - The review nits: HiGlass, upload1's separator, ML Jupyter's `git`.
   - The Qiskit 25.1 low.
   - The PR split: these 8 commits form their own group, which can be split into a PR on its own.
   - Codex is still blocked by the host sandbox.
   - The two behaviour questions, the housekeeping, and the deferred items.
