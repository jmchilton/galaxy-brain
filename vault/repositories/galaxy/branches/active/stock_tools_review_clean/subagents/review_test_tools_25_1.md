# Review: framework test-tool commits on release_25.1

**Acted on:** finding 1, by writing down the forward-merge resolution for the three adapted identifier tools in `implementation_debrief.md` and `index.md`. No code changed; the head stays `1a6d0585a37`. **Not acted on:**
- **2, the three `collection_type_source*` tools that 25.1 lacks:** they exist on the 26.1 alt, which carries their hunks. After a forward merge of the 25.1 branch, release_26.1 still needs them. Recorded as a follow-up for John.
- **3 and 5, the lows and mediums left:** accepted, as on dev. The three adapted identifier tools have no prefix on 25.1, so they stay low like the other no-prefix identifier tools. The `collection_type_source*` mediums are data-level.
- **4, `str($f1.name)` printing `None` for an unnamed collection:** no test uses an unnamed collection, and the dev version makes the same choice.
- **6, the dev branch's first commit message:** passed to the coordinator. The 25.1 and 26.1 messages already use the reworded form.

Run via a Claude general-purpose subagent (Opus 5.5) at the default effort.

## Details

**Top line: no blocking problems. The eight 25.1 commits do what they say, and the 25.1 adaptations are correct.** I rendered base and HEAD with Galaxy's `fill_template` using real 25.1 wrappers (`InputValueWrapper`, `DatasetFilenameWrapper`, `DatasetCollectionWrapper` over in-memory model objects) and ran both under bash and dash. For every value the tools' own `<tests>` and the 25.1 API, workflow and integration tests use, they give the same stdout, stderr, output files and file contents. The only differences are for shell-metacharacter values. The 25.1 wrappers behave as the dev review assumed. Lint is unchanged. The analyser reports no new findings: every added finding restates a pre-existing low or medium. The one real cost is a forward-merge conflict in the three adapted identifier tools, at the 26.1 → 26.2 step and again into dev. The conflict can't be avoided while quoting those tools on 25.1, but the resolution is mechanical. It should be written down so the quoting isn't lost when someone takes the 26.2 side.

## Findings

1. **Should-fix (process/docs)**: `identifier_single.xml`, `identifier_collection.xml`, `identifier_all_collection_types.xml`. Forward-merge conflict.
   - **What:** `git merge-tree --write-tree` merges HEAD cleanly into `origin/release_26.0` and `origin/release_26.1`, because both have the same three files as 25.1. It conflicts in exactly these three files against `origin/release_26.2` and `origin/dev`, which both carry the `'identifier '`/`'element_identifier '` prefix plus the `safe_identifier` line (a2f5ae521a8, 94153e4336b, 27cd79c10a1 are in 26.2 and dev).
     - There is one small hunk per file, and the conflict is inherent. 26.2 rewrote the same `echo` line, so any 25.1 change that quotes that line overlaps it.
     - 25.1 can't adopt the prefix form either. `safe_element_identifier` doesn't exist as a wrapper property on 25.1 (only as a local in `name_and_ext`), and the 25.1 `<tests>` and API tests assert the bare identifier lines.
     - The other route is to drop these three tools from the 25.1 branch. That avoids the conflict but leaves them high on 25.1, 26.0 and 26.1, and I don't think it's worth it.
     - Failure modes:
       - Taking the 25.1 side breaks the tools' own 26.2/dev `<tests>` (`identifier .i1:`, `safe_identifier i1_`), so CI catches it.
       - Taking the 26.2 side silently drops the quoting. In two of the files it also leaves a dangling `#import shlex`, because that line merges outside the hunk. Only the analyser would notice.
   - **Suggested fix:** no code change. Record the resolution in the PR description and the branch record: when merging into 26.2 (and dev), take the dev branch's versions (`git checkout 22feb23fb4b -- test/functional/tools/identifier_{single,collection,all_collection_types}.xml`). Those are exactly 26.2/dev plus quoting; I checked that 26.2 == dev for these files and that the dev branch's base == current dev. If the merge is resolved to that text, a later merge of the dev branch into dev will be clean for these files.
2. **Info (follow-up scope)**: `collection_type_source_conditional.xml`, `collection_type_source_digit_name.xml`, `collection_type_source_section_repeat.xml`.
   - **What:** these don't exist on 25.1 or 26.0, which is why their hunks were dropped. They do exist on **26.1**, 26.2 and dev, so after this branch merges forward they are still unquoted (high) from 26.1 on. For the other 19 files, the merged trees for 26.1, 26.2 and dev are byte-identical to the dev branch's (`22feb23fb4b`) versions.
   - **Suggested fix:** once this lands, shrink `functional_test_tools_review_clean` to those three tools. They exist from 26.1 on, so it could target `release_26.1` rather than dev. It would no longer need the identifier tools if the forward merge is resolved as in finding 1.
3. **Info (acceptance bar, 25.1-specific)**: `identifier_single.xml`, `identifier_collection.xml`, `identifier_all_collection_types.xml`.
   - **What:** on 25.1 these go high → **low** (`option-injection`), where on dev they went to none. With no literal prefix, the quoted identifier is echo's first word, which is the same situation as the other no-prefix identifier tools. The behaviour matches base: `-n` renders identically at base and HEAD.
   - **Suggested fix:** accept, as with the dev-review lows. Adding a prefix would change the 25.1 tests' expected output.
4. **Nit (carried from dev)**: `collection_paired_test.xml`, `collection_record_test_two_files.xml`.
   - **What:** confirmed with the real 25.1 `DatasetCollectionWrapper`: for an HDCA with `name=None`, base prints `Collection name: ` and HEAD prints `Collection name: None`. It only affects stdout. No 25.1 test uses an unnamed HDCA or asserts this stdout (`Collection name:` appears only in the two tools' own tests, which name the collection `collection name`).
   - **Suggested fix:** optional, `str($f1.name or '')`. Fine to leave.
5. **Info**: `collection_type_source.xml`, `collection_type_source_map_over.xml`.
   - **What:** high → medium `path-traversal` (`/` in keys), the same as dev and already recorded as accepted there.
   - **Suggested fix:** none, beyond carrying the acceptance into this branch record.
6. **Nit (commit messages)**: commit `62a34ead110`.
   - **What:** all eight 25.1 messages are neutral and accurate for 25.1. `b39e8ad9a2b` and `706ec29add1` are both ancestors of the base, `test_mules_as_job_handlers.py` is absent, and no message mentions something only on dev. `62a34ead110`'s body was reworded from the dev version (`30153332c65`) to drop the "break out of the echo argument" phrasing, which is better. The dev branch still has the older wording.
   - **Suggested fix:** if the dev branch is published, align its message with the 25.1 one. Nothing to change here.

## Details

### 1. Render comparison (25.1, real wrappers)

The script is `scratchpad/review/compare.py`. For each of the 22 changed files it does the following:

- **Extract and render:** it extracts the command at `5e553bfe303` and at HEAD through `get_tool_source(...).parse_command()`. For `parameters/gx_directory_uri*` it copies `macros.xml` alongside. It renders both with `galaxy.util.template.fill_template(python_template_version="3")`, then applies `_build_command_line`'s line strip and newline-to-space join (`evaluation.py:774-795` on 25.1).
- **Contexts:** contexts are built from real 25.1 objects, not stubs:
  - `InputValueWrapper` over real `ToolParameter.build(...)` params: text, text with `sanitize="false"`, directory_uri, boolean, integer and float. `cheetah_casting` uses profile `None`, so the old-profile `wrapper_default` gives `""`.
  - `DatasetFilenameWrapper` with and without an identifier, where the identifier is missing it falls back to the sanitized `name`.
  - `DatasetCollectionWrapper` over real `HistoryDatasetCollectionAssociation`/`DatasetCollection`/`DatasetCollectionElement` objects: list, list:paired, list:list:list, paired, record, and unnamed.
  - Conditionals and repeats as dicts and lists of dicts, as the evaluator builds them.
- **Values:** 50 values in all.
  - Every value the 25.1 tests use: `forward`, `reverse`, `i1`–`i3`, `.i1:`, `test0`, `test_level_1/2`, `foo`, `bar`, `A`, `B`, `1`, `2`, `fail`, `success`, `samp1/2`, `sample_a/b`, `sample1-1`, `sample2-1`, `Plain HDA`, `../Plain HDA`, `Normal HDA1/2`, `collection name`, `parent`, `child`, `This is a line of text.`, the Georgian `ვვვვვ`, `gxftp://` and the empty string.
  - Edge cases: `-n`, `-e`, `--x`, double spaces, a leading space, `$HOME`, backticks, a backslash, `it's`, `dq"x`, `a*`, `~x`, `!x`, a URI with a space, `x;y` and `a|b`.
- **Execution:** each command runs under bash and dash in a fresh directory, with `python` stubbed as an argv printer and real `cat` over real input files. Each run is done twice, once with builtin `echo` and once with an argv-printing `echo` function. The script compares the return code, stdout, stderr, created files and their contents.

Results:

| Tools | Values that differ |
|---|---|
| 8 identifier tools, 2 collection-name tools, 3 directory_uri tools, unicode_stream | only `it's` (base breaks, HEAD prints literally) |
| 4 `collection_list*`/`collection_paired_or_list_paired_input` tools, 2 `collection_type_source*` tools (double-quoted originals) | only `$HOME`, `` `id` ``, `dq"x` |
| config_vars (`__test_key`) | none |
| cheetah_casting | builtin-echo output is identical for the tool test's unset `texttest` (`None` → `''` → `echo ''` vs `echo `) and for the empty string; for other values only the expected whitespace-collapse and metacharacter cases differ. The argv-only differences are the word count. |

- The `collection_type_source*` output file names are identical for every test value (`samp1`, `1` and so on stay bare).
- The `workflow` tests that use cheetah_casting (`test_workflows.py` ~6192 and ~6929) don't set `texttest`.
- Each of the three adapted identifier tools' 25.1 `<tests>` (`i1`) and the API tests (`Plain HDA`, `forward\nreverse`, `foo\nbar`, `Normal HDA1`, `sample_a`) render identically.

### 2. 25.1 wrapper behaviour

`wrappers.py`, `evaluation.py` and `template.py` differ from dev only in typing, data-manager bundle rewrites and the `future` import fallback. None of that touches these paths. The probe is `scratchpad/review/realwrap.py`.

- **`.keys()`:** returns `__element_instances.keys()`, which are plain `str`.
- **`DatasetFilenameWrapper.element_identifier`:** returns the identifier and sets `consumes_identifiers`. With no identifier it falls back to `self.name` through `__getattr__`, which sets `consumes_names` and returns the `SafeStringWrapper` (sanitized) name; `str()` gives the same text Cheetah's filter does. The probe confirmed both flags, so the job-cache tests in `test_jobs.py`/`test_tools.py` that depend on them see the same accesses.
- **Nested `DatasetCollectionWrapper.element_identifier`:** returns `name`, which is the DCE identifier and a `str`.
- **`InputValueWrapper.__str__`:** returns `to_param_dict_string`. `DirectoryUriToolParameter.to_param_dict_string` (basic.py:2839) does no sanitizing, so the commit message is accurate. `str($x)` is byte-identical to `$x`.
- **`$texttest.strip()`:** `__getattr__` delegates to the raw value and returns a `str`, so `shlex.quote($text_val)` without `str()` is correct.
- **`HDCA.name = None`:** `str()` gives `'None'` (finding 4).
- **`#import shlex`:** works under 25.1 `fill_template`. 25.1 stock tools (`interactivetool_higlass`, `interactivetool_ilastik`) already use it.

No 25.1 difference from what the dev review assumed.

### 3. Tests that depend on exact output (read, not run)

- **`config_vars`:** `test_handler_assignment_methods.py` (×3) calls `_run_tool_test("config_vars")`, which runs the tool's own test with `var=__test_key`. No other caller exists on 25.1 (I grepped lib/test/client), and `test_mules_as_job_handlers.py` is gone.
- **Identifier tools:** I read `test_tool_execute.py` (`test_identifier_*`), `test_tools.py` (`test_identifier_in_map`, `_outside_map`, `_map_over_input_in_conditional`, `_multiple_reduce_in_conditional`, the use_cached_job pair), `test_jobs.py` (search/cached-job identifier tests, `test_job_build_for_rerun_list_list`) and the `test_workflows.py` identifier uses. All assert bare identifiers or names and still match.
- **Workflow framework tests:** `triply_nested_list_mapping`, `subcollection_rank_sorting(_paired)` assert `identifier is test_level_1/2` and `collection_type<...>`. They still match.
- **`directory_uri`:** `test_remote_files.py` uses `gxftp://`, which is bare under `shlex.quote`. The same holds for `test_remote_files_histories.py`.
- **Unit tests:** `test_parameter_test_cases.py`, `test_parameter_convert.py`, `test_test_definition_parsing.py` and `test_parameter_specification.py` pass (32 passed, with `-p no:postgresql`).

### 4. Forward merge (`git merge-tree --write-tree`, no checkout)

| Target | Result |
|---|---|
| `origin/release_26.0` | clean |
| `origin/release_26.1` | clean; all 22 changed files at base are identical to 26.1's, so 26.1 gets exactly the 25.1 versions |
| `origin/release_26.2` | conflicts only in the three adapted identifier tools |
| `origin/dev` | conflicts only in the three adapted identifier tools |

- The base `5e553bfe303` is 26 commits ahead of `origin/release_25.1` (`fa9176afc8f`), namely the stock-tool commits. Those auto-merge.
- For the other 19 files, the merged 26.1, 26.2 and dev trees are byte-identical to the dev branch tip `22feb23fb4b`.
- The suggested resolution is in finding 1.

### 5. Commit messages

There are eight commits. Their subjects match the dev branch one-to-one, and the bodies are identical apart from the neutral rewording of `62a34ead110`. Author and committer are John Chilton. There are no exploit descriptions and nothing dev-only.

### 6. Analyser (`~/tool_security/analyser_b1` at `53559de55d0`, `--json`)

I ran it over `git archive` exports of `test/functional/tools` at base and HEAD. The script is `scratchpad/review/analyse.py`.

| | Entries | none | low | medium | high | info | error/non-XML |
|---|---|---|---|---|---|---|---|
| Base | 395 | 296 | 34 | 9 | 33 | 11 | 12 |
| HEAD | 395 | 306 | 44 | 11 | 11 | 11 | 12 |

- The only entries that change are the 22 changed files. Every unchanged file's findings are identical.
- Each **added** finding has the same rule and severity as a removed one, with the expression now written `${shlex.quote(...)}`, unquoted:
  - `option-injection` low for cheetah_casting, the 8 identifier tools and unicode_stream.
  - `path-traversal` medium for the 2 `collection_type_source*` tools.
- There are no new rules and no raised severities.
- At HEAD, the changed files land at:
  - **none:** the 4 `collection_list*` tools and `collection_paired_or_list_paired_input`, the 2 collection-name tools, `config_vars`, and the 3 directory_uri tools.
  - **low:** cheetah_casting, the 8 identifier tools and unicode_stream.
  - **medium:** the 2 `collection_type_source*` tools.
- The highs left at HEAD are all tools this branch doesn't touch: `code_file`, `color_param`, `color_param_string_method`, `environment_variables_inject`, `model_attributes`, `gx_color`, `gx_color_optional`, `gx_drill_down_code`, `gx_select_dynamic`, `gx_select_dynamic_empty`, `gx_select_dynamic_empty_validated`. These are the 25.1 subset of the dev review's known-intended list.

### 7. Lint

`lint_tool_source_with` at level `all`, base vs HEAD, gives identical message sets for all 22 files.

### Security

No security issue in shipped Galaxy code came up in this review. The worktree was not modified; `git status` is clean.
