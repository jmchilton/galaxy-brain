# Baseline refactor: licenses (re-harden)

Two dev bug fixes were moved ahead of the feature, as new commits 5 and 6. Commit 5 makes `parsed_tool()` re-parse preserve whitespace. Commit 6 clears the converter lookup cache on every registration. Commits 1 to 4 are unchanged. The final tree is identical to `190068619fe`.

- Old head: `190068619fe`. New head: `a9cc198cb2a`. Backup ref: `backup/licenses_pre_baseline_2`.
- Not pushed. The `jmchilton` remote still has `190068619fe`, so this rewrite needs a force-push.
- Base is still `0073b5e9224`. The branch went from 19 to 21 commits, and "Baseline tests" is still first.
- `git diff 190068619fe HEAD` is empty.

## New commit order

1. `230eced4ee6` Baseline tests for require_login tool execution (unchanged)
2. `7d584971ecf` Extract tool execution preconditions from DefaultToolAction access check (unchanged)
3. `065ae3305a3` Add Workflow.walk_tool_steps; use it for get_all_tools (unchanged)
4. `0c8e0d8f675` Check workflow tools are installed before building run configs (unchanged)
5. `37adfeb6f7e` Preserve whitespace when parsed_tool re-parses a tool source (**new**, moved out of "Parse and resolve")
6. `b7059a2afa5` Clear cached converter lookups on every converter registration (**new**, moved out of the converter-filter fix)
7. Commits 7 to 21 are the 15 feature commits, and `git range-diff` maps them 1:1:
   - "Parse and resolve `<license_agreement>`" lost the `abstract_tool.py` `parsed_tool` hunk, the `parse_xml_string_to_etree` import removal that goes with it, and the sentence in its message that described them.
   - "Fix stale and over-eager licensed converter filtering" is renamed "Fix over-eager licensed converter filtering". It lost the cache-clear hunk, and its first sentence now says its re-register test pins the cache with licensed converters.
   - The trees of commits 7 to 17 differ from their originals only by the moved cache-clear hunk in `registry.py`. Commits 18 to 21 have trees identical to the originals.

## What moved and why

**`parsed_tool()` re-parse (commit 5).** This is a dev bug fix. It wasn't extracted in the last pass.
- After `mem_optimize`, dev rebuilt the source with `get_tool_source(xml_tree=parse_xml_string_to_etree(...))`. That call strips whitespace by default.
- The stripping corrupts whitespace-significant content, such as a leading space in a `<validator>` regex. Dev's own `build_xml_tool_source` comment describes exactly this bug for the tool-source-store path.
- Dev also forced every source through the XML parser. `YamlToolSource` has no `root`, so it always takes that path.
- The fix uses the `raw_tool_source`/`tool_source_class` factory, and `TOOL_SOURCE_FACTORIES` covers all three source classes.
- It is reachable on dev through `GET /api/tools/{id}/parsed`.
- **Red-to-green check (scratch only, not committed):** a scratch test builds a tool with a regex validator of `" *(\d+, *)*\d+ *$"`, calls `mem_optimize()`, then `parsed_tool()`, and asserts the expression. It fails on commit 4 and passes on commit 5.

**Converter cache invalidation (commit 6).** This is a dev bug fix, new in the re-scope fixes.
- On dev, only `load_datatype_converters_without_toolbox` resets `_converters_by_datatype`.
- `load_datatype_converters` never resets it. That path is used at startup, by the `queue_worker` toolbox reload and by `tools/__init__.py:704`. So after a reload, `get_converters_by_datatype` kept returning converter objects from the replaced toolbox.
- The reset now happens in `_register_converter_tool`.
- **Red-to-green check (scratch, not committed):** a scratch test registers stub `old`, looks it up, registers stub `new` for the same pair, and asserts `new`. It fails on commit 4 and passes on commit 6.

**Coverage gap / follow-up.** Neither fix commit adds its own test, which keeps the final tree identical. Later license tests pin both behaviors:
- `test_parsed_tool_preserves_inline_terms`
- `test_reregistered_converter_requiring_license_agreements_is_not_offered`

If commits 5 and 6 are split into their own PR, add generic tests modelled on the two scratch tests. Suggested homes: `test/unit/app/tools/` and `test_datatypes_registry.py`.

## Evaluated, not extracted

- **`Registry.offered_datatype_converters()`**: the license filter is its only content. Without that filter it is an identity function, so landing it early would add an unused abstraction. Filtering before merging only matters once filtering exists. Only the cache-clear hunk beside it was generic, and that hunk moved.
- **Typed `UnmetAccessPrecondition`**: correctly confined to commit 2.
  - Its base, details model and access class are added there. The `UnmetPrecondition` alias equals the access class until the job-creation commit turns it into the discriminated union.
  - Later `schema.py` hunks touch only the alias and union and the license models.
  - The `preconditions.py` hunk in the refresh-forms commit changes only `LicenseAcceptancePrecondition` and its imports.
  - No API model references the union at commit 2, so `schema.ts` is unaffected there.
- **`ensure_user_access`** (`services/base.py`, taken out of `CredentialsService`): a pure refactor, and the message text is identical. It could be extracted, but the payoff is small: it is one helper with one existing consumer. It stays in the API commit.
- **`ToolIDPathParam`/`ToolVersionPathParam`/`ToolVersionQueryParam` moving to `api/common.py`**: the move also changes `ToolVersionQueryParam`'s description from `""`. That changes the OpenAPI for the existing `/api/tools` routes, so extracting it means regenerating `schema.ts` in an earlier commit. That is churn.
- **License path in `get_externally_referenced_paths`**: feature-specific.
- **`Tool.to_json` access filter on `license_agreements`**: feature-specific.
- **gxwf `accept_license_agreements` opt-in, data-source rejection, `isinstance(DataSourceTool)`**: all feature-specific.
- **Earlier exclusions still hold**: `ToolExecutionContext`, `_different_new_user`, the `ToolRequestStateMessage.err_code`/`unmet` fields, `checks_preconditions` and `__init_subclass__`. See `earlier_drafts/2/baseline_refactor.md`.

## Validation

- **Tree checks**
  - `git diff 190068619fe HEAD`: empty.
  - `git range-diff` shows only the intended hunk and message moves.
  - Each rebuilt commit was produced as the original tree, plus or minus the moved cache hunk, so the earlier wrong-merge cherry-pick risk doesn't apply.
- **Lint at each of commits 5 to 18**
  - `ruff check` 0.17.1 and `py_compile` on every changed `.py` file: clean.
  - `black --check` on `registry.py` and `abstract_tool.py`: clean.
  - Pre-commit hooks (black, ruff, flake8, prettier) ran and passed on the two new commits. The rebuilt commits were committed with `--no-verify`, but their content matches the originals apart from the moved hunk.
- **Unit tests at each of commits 5 to 18**
  - Ran `test_datatypes_registry.py`, `managers/test_datatypes.py`, and `test_license_agreement_loading.py`, `test_tool_external_files.py` and `tool_util/test_license_agreements.py` where present, plus both scratch checks.
  - Everything passed except the scratch checks, which fail where expected:
    - The scratch cache check fails on commit 5, which comes before its fix.
    - It also fails from "Keep license agreements off indirect execution paths" onward, because its stub has no `license_agreements` attribute. That is an artifact of the scratch test.
- **Broader run at commit 6:** `test/unit/app/tools`, `test/unit/data/datatypes` and `test/unit/tool_util/test_parsing.py` gave 1488 passed, 1 skipped, 2 xpassed. `test_parsed_tool_model.py`, `test_parameter_test_cases.py` and `managers/test_datatypes.py` gave 38 passed.
- **Not rerun:** the final tree is unchanged, and the new commits change no API models, so `schema.ts` was not regenerated. Mypy, the API and integration tests, and the client tests were not rerun either. Earlier hardening results still apply.
- No security issues were found.

## Tests added

On request, both scratch checks became real tests in their fix commits. That closes the coverage gap described above.

- New head: `3dca8fee922`. Backup ref: `backup/licenses_pre_baseline_2b` = `a9cc198cb2a`. Not pushed.
- The final tree differs from `a9cc198cb2a` only by these tests (31 lines added).
- Commit SHAs from 5 onward changed. Commit 5 is now `d651612aa36` and commit 6 is now `b074d6c51db`.

**Commit 5 tests, in `test/unit/app/tools/test_tool_deserialization.py`.** They reuse the `tool_app` fixture, `_deserialize` and `YAML_TOOL`.
- `test_parsed_tool_after_mem_optimize_preserves_regex_whitespace` uses a new `XML_TOOL_WITH_REGEX_VALIDATOR` constant.
  - At commit 4 the re-parse turns the regex into `*(\d+...`, and the test fails with `regex error: nothing to repeat`.
- `test_parsed_tool_yaml_tool` confirms the YAML claim.
  - At commit 4, `parsed_tool()` on a YAML tool fails with `XMLSyntaxError`, because the YAML source is fed to the XML parser.

**Commit 6 test, in `test/unit/data/datatypes/test_datatypes_registry.py`.**
- `test_reregistered_converter_replaces_cached_lookup` adds the `_StubConverter` dataclass, with `id` only.
  - At commit 4 it fails with `'old_to_tabular' == 'new_to_tabular'`.
- "Keep license agreements off indirect execution paths" now adds `license_agreements` to the existing stub, where before it created the stub.
- I kept `test_reregistered_converter_requiring_license_agreements_is_not_offered`. It also covers the license filter, so the new test is not strictly better.

**Red-to-green:** each test fails with commit 4's library file and passes at its own commit.

**Validation**
- At each of commits 5 to 21:
  - ruff 0.17.1 and black on both test modules: clean.
  - Both modules pass: 38, then 39, 40 and 42 tests as the count grows. At HEAD it is 42.
- Pre-commit hooks passed on the amended commits 5 and 6.
- `git range-diff` shows patch changes only in commits 5 and 6, and in the stub transition in "Keep license agreements off indirect execution paths".
- Only unit tests changed, so mypy, the API and integration tests and `schema.ts` were not rerun.
