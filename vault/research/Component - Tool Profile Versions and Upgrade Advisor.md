---
type: research
subtype: component
tags:
  - research/component
  - galaxy/tools
  - galaxy/lib
component: "Tool Profile Versions and Upgrade Advisor"
galaxy_areas:
  - tools
  - lib
status: draft
created: 2026-10-30
revised: 2026-10-30
revision: 1
ai_generated: true
sources:
  - "vault/agents/gx_research/archive/tool_profile_versions_and_upgrade_advisor.md"
summary: "Catalog of tool profile gates with advisor and linter coverage, and how the galaxy-tool-upgrade-advisor works and where it is broken"
related_notes:
  - "[[Component - Tool Linters]]"
  - "[[Component - Collection Tool Execution Semantics]]"
  - "[[Component - Tool Citations and External Metadata Fetch]]"
  - "[[Component - Tool Testing Infrastructure]]"
related_prs:
  - 24524
  - 22432
  - 22799
  - 22894
  - 23414
  - 23404
  - 23593
---

# Tool Profile Versions and Upgrade Advisor

Verified against Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be`. Line numbers are at that SHA. The section headed **Proposed (unmerged)** describes draft PR #24524, and nothing outside it does.

**In scope:**

- how a tool's `profile` attribute is parsed and stored;
- every profile gate under `lib/galaxy/tools/` and `lib/galaxy/tool_util/`, with its XSD changelog entry, any upgrade advice and any linter;
- the upgrade advisor in `lib/galaxy/tool_util/upgrade/` and its bugs.

**Out of scope:** per-version release notes for users, the lint framework itself (see [[Component - Tool Linters]]), and planemo's wrapper around the advisor.

## Where the profile comes from

- `XmlToolSource.parse_profile()` returns the root `profile` attribute, or `"16.01"` when it is missing (`tool_util/parser/xml.py:736`). The comment above it lists the 16.04 behaviors that the default keeps. `self.legacy_defaults = Version(profile) == Version("16.01")` (`xml.py:182`) gates the parser-level 16.04 changes: the interpreter (`:320`), implicit extra-file collection (`:623`) and the stdio default (`:677`).
- YAML tool sources default to `"24.2"` (`parser/yaml.py:405`). CWL tools return `"17.09"` (`parser/cwl.py:198`).
- `Tool.parse` stores `self.profile = parse_profile_version(tool_source)`, a **float** (`tools/__init__.py:1475`, `parser/util.py:66-67`). Most runtime gates compare with `Version(str(self.tool.profile))`. Three compare the float directly: `profile < 24.0` (`tools/__init__.py:410`), `self.profile < 19.05` (`:3388`) and `self.profile < 24.0` (`:3515`). `ExpressionTool` raises its profile to 19.05 (`:3388-3390`).
- Load gate: Galaxy refuses a tool whose profile is newer than its own `VERSION_MAJOR` (`tools/__init__.py:1486-1489`). The check runs in Galaxy only, not in the Tool Shed.
- Linters accept profiles matching `PROFILE_PATTERN = ^[12]\d\.\d{1,2}$` (`linters/general.py:26`, used by `ToolProfileInvalid`/`ToolProfileLegacy`/`ToolProfileValid` at `:151-178`).

Galaxy has no registry of gates. Each one is an inline comparison, which is why the next table had to be built by grepping.

## Profile gate catalog

Legend: **XSD** = has an entry in the `galaxy.xsd` "Tool profile" changelog (`xsd/galaxy.xsd:13-90`). **Advice** = code in `upgrade_codes.json` that `dev` actually emits. **Linter** = a linter that reports the issue, profile-gated or not.

| Profile | Behavior (old → new) | Gate (file:line) | XSD | Advice on `dev` | Linter |
|---|---|---|---|---|---|
| 16.04 | No implicit extra-file collection | `parser/xml.py:623` (`legacy_defaults`) | yes | `16_04_consider_implicit_extra_file_collection` (always emitted, niche) | — |
| 16.04 | `format="input"` gives a random input ext → literal `input` | `tools/actions/__init__.py:543, 555` | yes | `16_04_fix_output_format` | `OutputsFormatInput` (`linters/output.py:158`, warn ≤16.01, error above) |
| 16.04 | `interpreter` disabled | `parser/xml.py:320` | yes | `16_04_fix_interpreter` / `16_04_ready_interpreter` | `CommandInterpreterDeprecated` (`linters/command.py:57`, warn at any profile) |
| 16.04 | `$param_file` no longer written | `tools/evaluation.py:953` | yes | — | — |
| 16.04 | Missing tool version no longer defaults to `1.0.0` | `parser/util.py:76` | yes | — | `ToolVersionMissing` (`general.py:41`, any profile) |
| 16.04 | Stdio default: stderr → exit code | `parser/xml.py:677` | yes | `16_04_exit_code` | `StdIOAbsenceLegacy` / `StdIOAbsence` (`linters/stdio.py:15, 37`, info only) |
| 17.09 | `provided_metadata_style` default `legacy` → `default` | `parser/xml.py:458` | yes | `17_09_consider_provided_metadata_style` (**never fires**, see bugs) | — |
| 18.01 | Per-job home directory | `parser/xml.py:303` | yes | `18_01_consider_home_directory` (niche) | — |
| 18.09 | Galaxy Python environment dropped for `manage_data` | `tools/__init__.py:406` | yes | `18_09_consider_python_environment` | — |
| 18.09 | Optional select with no legal values no longer returns `None` | `tools/parameters/basic.py:1249` | yes ("illegal default values") | — | — |
| 18.09 | "References to other inputs need to be fully qualified" | **no gate found** | yes (stale) | `18_01_consider_structured_like` cites 18.01 for this (wrong, #23884) | — |
| 19.05 | Default `python_template_version` 2.7 → 3.5 | `tools/__init__.py:1494` | yes | — | — |
| ≤19.09 | `$job_directory/configs:rw` container mount | `tool_util/deps/container_classes.py:397` | **no** | — | — |
| 20.05 | JSON configfile select/data_column → null and lists | `tools/parameters/wrapped_json.py:167` | yes | `20_05_consider_inputs_as_json_changes` | — |
| 20.09 | `set -e` (strict shell) | `parser/xml.py:692` | yes | `20_09_consider_set_e` | — |
| 20.09 | Test collection element order asserted | `parser/xml.py:918` | yes | `20_09_consider_output_collection_order` | — |
| 21.09 | `from_work_dir` no longer stripped (quoted) | `parser/xml.py:610` | yes | `21_09_fix_from_work_dir_whitespace` is defined but **never emitted** (`add("")` bug) | — |
| 21.09 | Galaxy Python environment dropped for `data_source` | `tools/__init__.py:408` | yes | `21_09_consider_python_environment` | — |
| 23.0 | Inferred-optional text templates as `None`, not `""` | `tools/parameters/basic.py:549` | yes | `23_0_consider_optional_text` (**fires on the wrong elements**) | — |
| 23.1 | Equal or inverted boolean `truevalue`/`falsevalue` fail to parse | `parser/util.py:96-106` | **no** | — | `InputsBoolDistinctValues` / `InputsBoolProblematic` (`linters/inputs.py:985, 1011`, warn <23.1, error from) |
| 24.0 | Galaxy Python environment dropped for `data_source_async` | `tools/__init__.py:410` (float) | yes | `24_0_consider_python_environment` | — |
| 24.0 | Undeclared data-source request params dropped | `tools/__init__.py:3515` (float) | yes | `24_0_request_cleaning` | — |
| 24.2 | Test cases validated on load, legacy test-param access off | `tool_util/verify/parse.py:68, 278`; `parameters/case.py:148, 171-192, 363` | no (only `data_ref` listed) | `24_2_fix_test_case_validation` | `TestsCaseValidation` (`linters/tests.py:178`, warn <24.2, error from) |
| 24.2 | `data_column` needs `data_ref` | `tools/parameters/basic.py:1639-1641` (an `assert`) | yes | — | — |
| 25.1 | Credentials instead of user preferences | **no gate found** | yes | — | — |
| 26.0 | Bare `structured_like` no longer searched recursively when mapping over | `tools/execute.py:585` | **no** (attribute docs only, `xsd:6576`) | — | `OutputsStructuredLikeReference` (`output.py:265`, legacy match accepted with a warning <26.0, error from) |
| 26.1 | Invalid citation fails tool load (before: logged and skipped) | `parser/xml.py:756` | **no** | — | `CitationsInvalid` (`linters/citations.py:68`, `CITATION_FATAL_PROFILE` at `:17`) |
| 26.1 | `value=""` on a multiple-select test param no longer means `[]` | `parameters/case.py:167` | **no** (param docs, `xsd:1905-1912`) | — | `TestsMultipleSelectEmptyValue` (`linters/tests.py:223`, warn <26.1, error from) |
| 26.2 | `galaxy.json` read only on explicit opt-in (non-interactive tools) | `tool_util/abstract_tool.py:302` | yes | — | — |
| 26.2 | Optional boolean with no `checked` → `None` | `parser/util.py:86`, `parameters/convert.py:534` | yes | — | — |
| 26.2 | `has_n_columns` etc. without `sep` split on the datatype delimiter | `tool_util/verify/__init__.py:77` | yes | — | — |

Notes on the table:

- Advice covers profiles up to 24.2 and none after. No 26.x gate has advice on `dev`, and the advisor refuses any tool or target above 24.2 (see below).
- A gate tends to get a linter when the old behavior hid an author mistake (`format="input"`, booleans, test params, citations, `structured_like`). Gates that change defaults (environments, `set -e`, `galaxy.json`, optional booleans, separators) have only advice, or nothing.
- `ValidDatatypes` (`linters/datatypes.py:98`) skips `format="input"` for profiles **≤16.04**, but the runtime gate is `< 16.04`. No one is affected, because `OutputsFormatInput` still errors at 16.04.
- The 24.2 `data_ref` requirement is a bare `assert` at parameter construction. Under `python -O` it disappears and the tool loads.
- A tool's own profile isn't always the one used. `validate_test_cases_for_tool_source(use_latest_profile=True)` hardcodes `"26.1"` (`parameters/case.py:690-692`). Both `TestsCaseValidation` and the 24.2 advice call it that way, so they report 26.1 rules whatever profile the tool declares.
- The set-metadata job runs with `profile=float(VERSION_MAJOR)` (`jobs/runners/__init__.py:694`), not the tool's profile.
- Recently removed: commit `196ddecbf7a` gated a missing-`version_command` lint at 26.2, and `939dcf393ab` replaced it with an info message at every profile. So `VersionCommandMissing` isn't a profile gate.

The XSD drift (missing 23.1/26.0/26.1 sections, the stale 18.09 bullet, the 25.1 entry with no gate, mixed heading levels) is recorded in `vault/agents/gx_research/research_issues/xsd-profile-changelog-drift.md`.

## Upgrade advisor

Package `galaxy.tool_util.upgrade`. Console script `galaxy-tool-upgrade-advisor = galaxy.tool_util.upgrade.script:main` (`packages/tool_util/pyproject.toml:79`). Nothing else in Galaxy imports it apart from its unit tests. Planemo is the main external consumer.

### Data model

- `upgrade_codes.json` maps code name → `{level, message, url?, niche?}`. It is loaded at import into `upgrade_codes_by_name`, with `name` injected (`__init__.py:45-50`). Code names follow `<MM>_<mm>_<level-ish>_<topic>`. The "level-ish" token is informal: `16_04_exit_code` and `24_0_request_cleaning` don't follow it.
- `TYPE_LEVEL = Literal["must_fix", "consider", "ready", "info"]` (`:34`). No code on `dev` uses `info`, and only `16_04_ready_interpreter` uses `ready`.
- `Advice` wraps a code plus an optional per-instance `message` (`:53-81`). `AdviceCollection.add(code, message=None)` looks the code up with `[]` (`:90-91`), so an unknown code raises `KeyError`.

### Migrations

`ProfileMigration` subclasses (`:97-261`) each declare `from_version`/`to_version` strings and a classmethod `advise(advice_collection, xml_file)`. Each one parses the file again through `_xml_tool_source`, which raises for non-XML tools (`:302-306`). They're listed in order in `profile_migrations` (`:264-275`):

| Class | to_version | Emits |
|---|---|---|
| `ProfileMigration16_04` | 16.04 | interpreter fix/ready, implicit extra files (always), `format="input"`, exit code when no `<stdio>` and no `detect_errors` |
| `ProfileMigration17_09` | 17.09 | `17_09_consider_provided_metadata_style`: never fires (bug) |
| `ProfileMigration18_01` | 18.01 | home directory when `use_shared_home` is unset; `structured_like` whenever any collection output has the attribute |
| `ProfileMigration18_09` | 18.09 | `manage_data` Python environment |
| `ProfileMigration20_05` | 20.05 | any `configfiles/inputs` |
| `ProfileMigration20_09` | 20.09 | collection element order (once per test collection with `element_tests`); `set -e` when `strict` is unset |
| `ProfileMigration21_09` | 21.09 | `from_work_dir` whitespace (crashes); `data_source` Python environment |
| `ProfileMigration23_0` | 23.0 | optional text (wrong elements) |
| `ProfileMigration24_0` | 24.0 | `data_source_async` Python environment; request cleaning for both data source types |
| `ProfileMigration24_2` | 24.2 | one `24_2_fix_test_case_validation` per failing test, with the pydantic error as message |

No migrations exist for 19.05, 19.09 or 23.1. Gaps in the list don't break anything, because each migration is chosen by `to_version` alone and `from_version` is never read.

### `advise_on_upgrade(xml_file, to_version=None)` (`:280-299`)

1. `to_version` defaults to `latest_supported_version = "24.2"` (`:277`).
2. A tool profile above 24.2 raises `Exception(TOOL_TOO_NEW)`, and so does a target above 24.2 (`TARGET_TOO_NEW`). Both are plain `Exception` with message constants (`:29-32`).
3. **Skip rule:** `continue` when `migration.to_version < initial_version`. **Break rule:** `break` when `migration.to_version > to_version`. Both compare **strings**.
4. Nothing checks that `to_version >= initial_version`. With a target below the tool's profile the loop skips forward and then breaks, returning an empty list.

### CLI (`script.py`)

Takes `xml_file`, `-p/--profile-version` (default `latest_supported_version`), `-j/--json` and `-n/--niche`. Niche advice (`16_04_consider_implicit_extra_file_collection`, `17_09_consider_provided_metadata_style`, `18_01_consider_home_directory`) is hidden unless `-n` is given. Text output prints a level emoji, the wrapped code message, the per-instance message and the URL.

### Bugs on `dev`

Each bug is verified against the code. They are recorded in `research_issues/upgrade-advisor-version-skip-and-helper-bugs.md`, `upgrade-advisor-17-09-backtick-attribute.md` and `upgrade-advisor-json-output-typeerror.md`.

- **`_find_all` ignores its xpath** (`:313-314`): it always runs `findall(".//data[@from_work_dir]")`. `ProfileMigration21_09` happens to ask for that same xpath. `ProfileMigration23_0` asks for `.//input[@type='text']` but gets `from_work_dir` outputs, so the 23.0 advice fires once for each `from_work_dir` output and never for a text param. Note that `input` is also the wrong tag name, since tool XML uses `param`.
- **`add("")`** in `ProfileMigration21_09` (`:217`) raises `KeyError` on any `from_work_dir` with surrounding whitespace. The `21_09_fix_from_work_dir_whitespace` code exists and is never used.
- **Off-by-one skip:** `<` instead of `<=`, so a tool at exactly a migration's profile still gets that migration's advice.
- **String version comparison:** this is correct only while profiles stay canonical. `PROFILE_PATTERN` also accepts `21.1` or `24.10`, which order differently as strings than as `packaging.Version`.
- **17.09 attribute name has backticks** (`` "`provided_metadata_style`" ``, `:140`), so the advice never fires. Its condition is also inverted.
- **24.2 advice validates at 26.1** through `use_latest_profile=True`.
- **`--json` raises TypeError**, because `dumps()` is given a generator (`script.py:80`).
- **Duplicate advice:** looping migrations add the same code once per match, with no message.
- **18.01 `structured_like` advice is wrong** in version and in substance (#23884). Bare names keep working until 26.0, and the check fires for any `structured_like`, qualified or not.

### Tests

`test/unit/tool_util/upgrade/test_upgrade_advice.py` (173 lines) runs `advise_on_upgrade` on functional test tools (`functional_test_tool_path`). Its header lists `21_09_fix_from_work_dir_whitespace` and `23_0_consider_optional_text` as untested, and those are the two codes the helper bugs break. Nothing tests the 17.09 code or the CLI.

### Adding a migration (current recipe)

1. Add the codes to `upgrade_codes.json`, with a `url` pointing at the PR that added the gate.
2. Add a `ProfileMigrationNN_N` subclass and insert it in order in `profile_migrations`.
3. Raise `latest_supported_version`, or the new migration can't be reached.
4. Add positive and negative tests that run real tool XML.
5. Decide whether the gate also needs a linter and an XSD changelog entry. Nothing enforces either.

## Proposed (unmerged)

**#24524** (`upgrade_advice_structured_like`, head `cc649c94509`, open, fixes #23884). Branch record: `vault/repositories/galaxy/branches/active/upgrade_advice_structured_like/`.

- Adds `ProfileMigration26_0` with `26_0_fix_unqualified_structured_like`. It reports only bare or partly qualified references to dataset inputs nested in a conditional or section and outside repeats, and suggests the qualified name. It uses the linter's input-reference walker, which moves to `linters/_util.py` as `InputReferences`. That move conflicts with #23891's planned home in `parser/` (see [[Component - Tool Linters]]).
- Adds `ProfileMigration26_1`: `26_1_fix_invalid_citation`, which runs `parse_citation_elem` per citation, and `26_1_fix_empty_multiple_test_value`, which reports only test cases that fail at 26.1 but pass at 26.0.
- Adds `ProfileMigration26_2`: `26_2_consider_optional_boolean_unset`, `26_2_consider_tool_provided_metadata` (niche; uses the shared `writes_galaxy_json()` and `tool_requests_provided_metadata()` helpers) and `26_2_consider_tabular_assertion_separator`.
- Raises `latest_supported_version` to 26.2 and drops `18_01_consider_structured_like`.
- Fixes `_find_all`, `add("")`, the `<=` skip, and 24.2 validation at its own profile (a new `profile=` kwarg on `validate_test_cases_for_tool_source`).
- **Not fixed by #24524:** the 17.09 backtick check, `--json`, string comparison, duplicate advice, and the 23.0 xpath using `input` instead of `param`. Once `_find_all` honors its xpath, `.//input[@type='text']` matches nothing, so 23.0 advice still never fires.

After #24524, the 26.x rows of the catalog would all have advice. 23.1 and 24.2 `data_ref` would still have none.

## Related

- [[Component - Tool Linters]]: the lint framework and the profile-gated linters named above. It defers the advisor to this note.
- [[Component - Collection Tool Execution Semantics]]: the runtime side of the 26.0 `structured_like` gate.
- [[Component - Tool Citations and External Metadata Fetch]]: the 26.1 citation load gate.
- [[Component - Tool Testing Infrastructure]]: test-case parsing and validation behind the 24.2 and 26.1 gates, and the 26.2 assertion separator.
