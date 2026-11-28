Run via Claude Opus at high effort.

**Implementer's top line:** I acted on finding 5 by rewording the `config_vars` commit message to name the removed caller (`22feb23fb4b`; the tree is unchanged). I didn't act on the rest:
- **1, the `collection_type_source*` path-traversal mediums:** these are data-level and refused only at `enforce_data`. Replacing `/` would change what the tool writes for such keys, and the inventory scoped this pass to the highs. They are recorded as accepted.
- **2, the option-injection lows:** the value is echo's first word, the same as at base. A prefix would change the output.
- **3, branch 4's `identifier_single` dependents:** passed to the coordinator, who owns the move to `identifier_single_unsanitized`.
- **4, `str($f1.name)` giving `None` for an unnamed collection:** no test uses one. Noted only.
- **6, the `#out_file1` typo in `cheetah_casting`:** left alone, because fixing it would break `test_run_with_numeric_input_connection`.

## Review

**Top line: no blocking problems. The branch does what it says.** For every value the tools' own `<tests>` and the API, workflow and integration tests use, the rendered commands give the same stdout, output files and file contents at base and HEAD. This was checked by rendering base and HEAD with Galaxy's `fill_template` and running both under bash and dash. The only differences are for values that contain shell metacharacters, which is the point of the change. No XML tool in `test/functional/tools` is still high apart from the known-intended list. Lint output for the 25 changed tools is the same as at base. The related unit tests pass (76). The open items are an acceptance-bar question (five tools are still medium, seven are still low) and a coordination note for `tool_patches_static_findings`.

## Findings

1. **Low (acceptance bar)**: `collection_type_source.xml`, `collection_type_source_conditional.xml`, `collection_type_source_digit_name.xml`, `collection_type_source_map_over.xml`, `collection_type_source_section_repeat.xml`.
   - What: each went from high to **medium** `path-traversal`, not to clean. `output/${shlex.quote(str($key))}` still lets `/` through. Element identifiers are not validated against `/` (`validate_input_element_identifiers` checks only `__object__`, name presence, duplicates and src).
   - Suggested fix: decide the bar. To clear the finding, use `${shlex.quote(str($key).replace('/', '_'))}`. No test identifier contains `/`, so test output wouldn't change. Otherwise record the mediums as accepted in the branch record.
2. **Low (acceptance bar)**: `cheetah_casting.xml`, `identifier_in_conditional.xml`, `identifier_multiple.xml`, `identifier_multiple_in_conditional.xml`, `identifier_multiple_in_repeat.xml`, `identifier_single_in_repeat.xml`, `unicode_stream.xml`.
   - What: each is still **low** `option-injection`, because the quoted value is echo's first word and the original had no literal prefix to attach it to. Adding a prefix would change the echoed text. Base has the same behaviour (`echo '-n'` and `echo -n` both suppress output).
   - Suggested fix: accept and record these. The alternative, `printf '%s\n'`, changes output under dash for identifiers that contain backslashes, so it isn't worth it.
3. **Low (coordination)**: `identifier_single.xml` and branch `tool_patches_static_findings`.
   - What: more than the one refusal test depends on the old `identifier_single` text. These files on that branch read `identifier_single.xml` or its id and expect its finding or its exact command line:
     - `test/integration/test_tool_static_findings_refusal.py`
     - `test/unit/app/tools/test_static_findings_refusal.py`, which expects a shell-injection refusal.
     - `test/unit/tool_util/security/test_patch_review.py`. Its `ECHO = "echo 'identifier $input1.element_identifier' > 'output1';"` is the target of `replace_text_op`, and that replacement no longer matches.
     - `test/integration/test_tool_patches.py`
     - `test/unit/tool_util/test_tool_patches.py`
     - `identifier_single_fixed.xml` is derived from the old tool.
   - Suggested fix: no change here. Make sure branch 4's `identifier_single_unsanitized` move covers all of these files, not only the refusal test.
4. **Nit**: `collection_paired_test.xml`, `collection_record_test_two_files.xml`.
   - What: `str($f1.name)` renders `None` where `$f1.name` rendered an empty string, because Cheetah's default filter maps `None` to `''`. `HistoryDatasetCollectionAssociation.name` is nullable. No test uses an unnamed HDCA (both tool tests name the collection `collection name`).
   - Suggested fix: optional. Leave it, or use `str($f1.name or '')`.
5. **Nit**: `config_vars.xml` and commit `73d34ce6795`.
   - What: the commit message says no test reaches the branch. It could also name the one caller that did: `test/integration/test_mules_as_job_handlers.py`, from `3f0082515af`, which ran with `var=server_name`. That file was deleted in `b39e8ad9a2b` (2021, uwsgi removal). The `var` param is now unused in the command; keeping it is right, because the tool test and `_run_tool_test` pass it.
   - Suggested fix: optionally add one sentence to the commit message.
6. **Info**: `cheetah_casting.xml`.
   - What: a pre-existing typo, `>> '#out_file1'`, which Cheetah emits literally. The text line therefore writes a stray file `#out_file1` and never reaches the output dataset. Correcting it would add a line to the output, and `test_run_with_numeric_input_connection` asserts `len(lines) == 4`.
   - Suggested fix: leave it, as the branch does. The regression check from `706ec29add1` (`$texttest.strip()` on old-profile empty text) is kept.

## Details

### Render comparison

The comparison script is in the review's scratchpad and is not committed. For each changed tool it does the following:

- **Extract and render:** it gets the command from `origin/dev` and from HEAD through `get_tool_source(...).parse_command()`; for `gx_directory_uri*` it copies `macros.xml` next to the base copy. It renders both with `galaxy.util.template.fill_template`, then applies the evaluator's line strip and newline-to-space join from `evaluation.py:870-876`.
- **Stub objects:** stubs mimic the wrappers.
  - Collection and dataset stubs have `keys()`, a `__getitem__` that raises `KeyError` for unknown keys (Cheetah's NameMapper tries mapping lookup first), `element_identifier`, `name`, `safe_element_identifier` and `is_collection`.
  - Text stubs mimic `InputValueWrapper`: `__str__` gives the value, `__getattr__` delegates to the value, and `__int__` and `__float__` are defined.
- **Values:** 26 values, among them every value the tests use (`forward`, `reverse`, `i1`, `.i1:`, `../Plain HDA`, `Plain HDA`, `Normal HDA1`-style names, `1`, `samp1`, `test_level_1`, the Georgian `ვვვვვ`, `This is a line of text.`, `gxftp://`, the empty string), plus edge cases (`-n`, `-e`, `--x`, double spaces, a leading space, `$HOME`, backticks, a backslash, `it's`, `dq"x`, `a*`, `~x`, `!x`, a URI with a space).
- **Execution:** each command runs under bash and dash in a fresh directory with `output/`, `section_output/` and `repeat_output/`. `cat` and `python` are stubbed as argv printers. Each run is done twice, once with builtin `echo` and once with an argv-printing `echo` that shows word boundaries. The script compares stdout, stderr, created file names and file contents.

Results:

- **Single-quoted originals** (`'$x'`; all identifier tools, the collection-name tools, the directory_uri tools, unicode_stream): the only difference is for `it's`. The base command breaks there and HEAD prints it literally. The empty value and the Georgian value give identical output; for the empty value, `echo ''` and `echo 'identifier '''` match base.
- **Double-quoted originals** (`"identifier is $key"`, `output/"$key"`): the differences are only for `$HOME`, backtick and `dq"x`, where base expanded or broke. A backslash gives the same result, because double quotes keep `\t`.
- **Output-file names** for the collection_type_source tools are the same for every value without metacharacters, including `1` and `samp1` (`shlex.quote` leaves them bare). The empty key fails the same way at base and HEAD (`output/` is a directory).
- **cheetah_casting** (unquoted original): with the tool test's empty `texttest`, builtin `echo` output is identical (`echo` and `echo ''` both print a newline); only the argv count differs. With other values the differences are the expected whitespace collapse and metacharacter cases. Neither workflow test that uses the tool (`test_workflows.py` ~8827 and ~10014) sets `texttest`.
- **Cheetah parsing** of `'literal '${shlex.quote(str($x))}` right after a `'...'` literal or `/`, and `#import shlex` in CDATA and non-CDATA commands, all render as intended. All 25 files parse with `get_tool_source`. `xmllint` isn't installed.

### `str()` versus the raw wrapper

- `$key` from `.keys()` is a plain `str` (the keys of `__element_instances`), so `str()` changes nothing.
- `.element_identifier` on `DatasetFilenameWrapper` returns the identifier, or falls back to `self.name`. It still sets `consumes_identifiers`, so the job-cache rename test still behaves as before. On a nested `DatasetCollectionWrapper` it returns `name`, which is the element identifier.
- `$d_uri`, `$parameter` and `$input1` (`sanitize="false"`) are `InputValueWrapper`s. Cheetah's filter calls `str()` on them anyway, so `str($x)` is byte-identical to `$x`. `DirectoryUriToolParameter.to_param_dict_string` doesn't sanitize, which confirms the commit message.
- `$f1.name`: see finding 4.
- `cheetah_casting`: `$texttest.strip()` goes through `InputValueWrapper.__getattr__` to the raw value and returns a `str`, so `shlex.quote($text_val)` without `str()` is correct.

### Whether the tests were weakened

- `identifier_collection` and `identifier_all_collection_types` still compare raw `.i1:` with safe `i1_`. `shlex.quote('.i1:')` is bare, so the output is unchanged.
- `identifier_single` still compares `../Plain HDA` with `_Plain_HDA` (`test_identifier_outside_map`).
- `cheetah_casting` still runs `$texttest.strip()`.
- `config_vars`'s original purpose (`3f0082515af`: read `app.config.server_name` to prove a mule ran the job) died with `test_mules_as_job_handlers.py` in `b39e8ad9a2b`. The only callers left, on dev and on both security branches, are its own `<tests>` and the three `test_handler_assignment_methods.py` cases, which all use `__test_key`.
- Side benefit: `tool_security_runtime`'s debrief lists `config_vars` as one of the remaining default refusals behind its BLOCKED status. This change removes that refusal.

### Use as red cases on the security branches

I grepped the added lines of `origin/dev...tool_security_static_findings`, `...tool_security_runtime` and `...tool_patches_static_findings`, and the full trees for `config_vars`. No changed tool other than `identifier_single` is used as a red or unsafe example. `MANIFEST.in` entries and moved API tests on runtime are not red-case uses. The `identifier_single` dependencies are listed in finding 3.

### Analyser sweep

I ran the `~/tool_security/analyser_b1` analyser at `53559de55d0` on HEAD over `test/functional/tools`. Of 467 entries: 16 high, 21 medium, 52 low, 12 info, 366 none, and 26 non-XML entries (YAML and CWL) that aren't reviewed. The highs are exactly the known-intended list:

- `code_file`
- `color_param`, `color_param_string_method`, `gx_color`, `gx_color_optional`, `gx_color_optional_no_default`
- `command_reads_configfile`
- `environment_variables_inject`
- `model_attributes`
- `gx_conditional_select_dynamic`, `gx_repeat_select_dynamic`, `gx_section_select_dynamic`, `gx_select_dynamic`, `gx_select_dynamic_empty`, `gx_select_dynamic_empty_validated`
- `gx_drill_down_code`

All 25 changed tools were high at base. At HEAD:

| Tools | Severity |
|---|---|
| `collection_list_2x_or_3x_nested`, `collection_list_or_nested_list_input`, `collection_list_paired_or_unpaired`, `collection_paired_or_list_paired_input`, `collection_paired_test`, `collection_record_test_two_files`, `config_vars`, `directory_uri`, `identifier_all_collection_types`, `identifier_collection`, `identifier_single`, `gx_directory_uri`, `gx_directory_uri_validation` | none |
| `cheetah_casting`, `identifier_in_conditional`, `identifier_multiple`, `identifier_multiple_in_conditional`, `identifier_multiple_in_repeat`, `identifier_single_in_repeat`, `unicode_stream` | low (`option-injection`) |
| The five `collection_type_source*` tools | medium (`path-traversal`) |

The other mediums are tools the branch doesn't touch:

- `cheetah_problem_unbound_var`, `collection_creates_pair`
- `command_reads_input_size`
- `discover_long_name`
- `export_remote` (both versions)
- `filter_attribute_value_splitter`, `filter_multiple_splitter`
- `job_properties`
- `legacy_home_probe`
- `paths_as_file`
- `select_optional`, `select_optional_legacy`
- `test_data_source`, `ucsc_tablebrowser`
- `upload`

They're listed for the record only; the requested check was the highs.

### Other checks

- **Lint:** `lint_tool_source_with` at level `all` gives identical output at base and HEAD for all 25 tools.
- **Unit tests:** `test/unit/tool_util/test_parameter_test_cases.py`, `test_parameter_convert.py`, `test_test_definition_parsing.py` and `test_parameter_specification.py` pass (76 passed).
- **Commits:** eight commits, one per tool or per closely related group, with neutral messages. Splitting `identifier_single` into its own commit suits the branch 4 dependency. `9cad798ab91` and `3f13278f6c4` have no body, which is fine at that size.
- **Security:** no security issue in shipped Galaxy code came up.
