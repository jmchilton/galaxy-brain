---
type: research
subtype: component
tags:
  - research/component
  - galaxy/tools
  - galaxy/lib
component: "Tool Linters"
galaxy_areas:
  - tools
  - lib
status: draft
created: 2026-10-30
revised: 2026-10-30
revision: 2
ai_generated: true
sources:
  - "vault/agents/gx_research/archive/tool_linters_and_reference_resolution.md"
summary: "Galaxy's tool lint framework, Linter discovery and its pitfalls, profile-gated linters, and the output-reference resolver shared with runtime"
related_notes:
  - "[[Component - Collection Tool Execution Semantics]]"
  - "[[Component - User-Defined Tool Source Validation]]"
  - "[[Component - Tool Citations and External Metadata Fetch]]"
  - "[[Component - Tool Data Tables]]"
  - "[[Component - Tool Testing Infrastructure]]"
  - "[[Component - Tool Profile Versions and Upgrade Advisor]]"
related_prs:
  - 23919
  - 23890
  - 23229
  - 24524
---

# Tool Linters

Verified against Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be`. Line numbers are at that SHA. Material from unmerged branches is in the section headed **Proposed (unmerged)**, and nothing outside it describes them.

**In scope:** the framework in `lib/galaxy/tool_util/lint.py`, the 153 `Linter` subclasses in `lib/galaxy/tool_util/linters/`, how the framework finds them, profile-gated linters, `LintContext`, and the output-reference resolver in `linters/output.py`: what it checks and which runtime lookup each rule copies. The note also covers where the resolver may move.

**Out of scope:** what each linter checks, beyond the reference linters. The tool profile upgrade advisor (`lib/galaxy/tool_util/upgrade/`) and the full catalog of profile gates are in [[Component - Tool Profile Versions and Upgrade Advisor]]. This note mentions the advisor only where it would reuse the resolver. Planemo's `lint` command lives outside Galaxy.

## Map

| Piece | Where |
|---|---|
| `LintLevel`, `Linter`, `LintMessage` and the XML message variants, `LintContext` | `lib/galaxy/tool_util/lint.py:79-329` |
| Entry points (`lint_tool_source`, `get_lint_context_for_tool_source`, `lint_xml`, `lint_user_tool_source`) | `lint.py:338-450` |
| Discovery (`lint_tool_source_with_modules`) | `lint.py:418-444` |
| Tool linter modules | `lib/galaxy/tool_util/linters/{citations,command,containers,cwl,datatypes,general,help,inputs,output,required_files,stdio,tests,xml_order,xsd}.py`; helpers in `_util.py` |
| Repository data-table linters (`Linter[RepositoryDataTables]`) | `lib/galaxy/tool_util/data/bundles/lint.py`, CLI `galaxy-tool-data-lint` (`data/bundles/script.py`) |
| Reference resolver and its two linters | `linters/output.py:265-503` |
| Tests | `test/unit/tool_util/test_tool_linters.py` (3841 lines), `test_container_shape_lint.py` |

## Framework

### `Linter`

`Linter(ABC, Generic[LintTargetType])` (`lint.py:88-120`) has one abstract classmethod, `lint(cls, tool_source, lint_ctx)`. `name()` returns the class name. The type parameter defaults to `ToolSource` (`lint.py:76`), so tool linters subclass bare `Linter`. The repository data-table linters subclass `Linter[RepositoryDataTables]` (`data/bundles/lint.py:30-212`). The docstring says each linter "should add at most one message", but many add one message per offending node.

Since 24.0 each linter class emits one kind of message. Before that, each module had a `lint_<module>` function. Linter names are public because authors and planemo skip linters by name. `test_list_linters` (`test_tool_linters.py:3464`) asserts the full set of names and that none repeats. `test_linter_module_list` (`:3652`) requires the pre-24.0 module names to remain, each with at least its old class count, because a skip type can also name a module (see below).

`Linter.list_linters()` (`lint.py:112-120`) imports every `linters` submodule and `data.bundles.lint` and returns the names of `Linter.__subclasses__()`. It lists only direct subclasses. `list_listers` is a deprecated alias (`:122-128`).

### `LintContext`

`LintContext(level, lint_message_class=LintMessage, skip_types=None, object_name=None)` (`lint.py:200-329`):

- **Levels.** `LintLevel` is an `IntEnum`: `SILENT=5, ERROR=4, WARN=3, INFO=2, VALID=1, ALL=0` (`:79-85`). A string such as `"all"` is converted with `LintLevel[level.upper()]`. The four message levels are stored as the strings `"error"`, `"warning"`, `"info"` and `"check"` (`:279-293`).
- **Skipping.** `lint(name, lint_func, lint_target, module_name=None)` (`:232-277`) first removes a `lint_` prefix from `name`. It returns without running when `name` or `module_name` is in `skip_types`. Skipping the module name `output` therefore skips every class in `output.py`. This is the reason module names can't change.
- **Printing.** Below `SILENT`, `lint` moves the existing messages aside, runs the linter, prints that linter's messages at or above the level, and puts the old messages back in front of the new ones. The comment calls this "a relict from the past".
- **Parse failures.** A `ParseException` raised inside a linter becomes one `ToolParse` error. `_report_failure` drops repeats (`:256-261, 306-312`), so a tool source that won't parse isn't reported once per linter. Other exceptions propagate.
- **Message classes.** `XMLLintMessageLine` and `XMLLintMessageXPath` (`:166-194`) take a `node=` keyword and record its source line or XPath. Linters always pass `node=`. The base `LintMessage` accepts it through `**kwargs` and ignores it.
- **`failed(fail_level)`** (`:320-329`) handles only `WARN` (warnings or errors) and `ERROR` or above (errors). For `INFO`, `VALID` or `ALL`, `lint_fail` is never assigned, and the method raises `UnboundLocalError`. Galaxy's only CLI caller limits `--fail-level` to `warn` and `error` (`data/bundles/script.py`).
- **Not tool-specific.** A TODO (`:197-199`) says `LintContext` should move to `galaxy.util.lint`, because planemo reuses it for repositories. The data-table bundle linters already use it for repositories.

### Entry points

| Function | Use |
|---|---|
| `lint_tool_source(tool_source, level, fail_level, extra_modules, skip_types, name)` (`:359-372`) | Prints messages and returns `not failed(fail_level)`. |
| `get_lint_context_for_tool_source(...)` (`:375-385`) | Silent. Returns the context. |
| `lint_xml(tool_xml, ...)` / `lint_xml_with` (`:388-407, 447-450`) | Wraps an XML tree with `get_tool_source(xml_tree=...)`. |
| `lint_tool_source_with(lint_context, tool_source, extra_modules)` (`:410-415`) | Imports `galaxy.tool_util.linters` submodules, adds `extra_modules`, and calls `lint_tool_source_with_modules`. |
| `lint_user_tool_source(user_tool_source)` (`:338-356`) | Dumps a `UserToolSource` pydantic model to a dict, wraps it in `YamlToolSource`, lints silently, skips `NETWORK_LINTERS = ("BioToolsValid", "EDAMTermsValid")` (`:335`), and returns `"<linter>: <message>"` bullets for warnings and errors. |

`lint_user_tool_source` is the only entry point a running Galaxy server calls. `ToolsService` create and edit (`managers/tools.py:207`) and the custom-tool agent (`agents/custom_tool.py:477, 738`) call it, so any crash in discovery breaks user-defined tool creation. See [[Component - User-Defined Tool Source Validation]] for the rest of that pipeline. Planemo calls the other entry points.

## Discovery

`lint_tool_source_with_modules(lint_context, tool_source, linter_modules)` (`lint.py:418-444`):

1. Computes `tool_type = tool_source.parse_tool_type() or "default"`. It skips a module unless the module's `lint_tool_types` contains `"*"` or `tool_type`. The default is `["default", "manage_data", "interactive"]`. `general`, `containers` and `inputs` use `["*"]`, `cwl` uses `["cwl"]`, and `tests` uses `["default", "data_source", "manage_data"]`.
2. Iterates over **every** member of the module from `inspect.getmembers(module)`, including imports and constants:
   - A callable named `lint_*` is a legacy function linter. If its first parameter is `tool_xml`, it gets the XML tree and is skipped for non-XML tools. Otherwise it gets the `ToolSource`. No module in `linters/` defines one at this SHA. The branch remains for `extra_modules`.
   - `inspect.isclass(value) and issubclass(value, Linter) and not inspect.isabstract(value)` runs `value.lint` with `module_name` set, so module-level skips apply.

`submodules.import_submodules` (`lib/galaxy/util/submodules.py:32-60`) returns the modules in reverse name order. It catches any exception while importing a submodule, logs it, and continues. A linter module that fails to import therefore loses all its linters without failing the lint run.

### Pitfalls in this loop

- **Generic aliases at module level crash discovery on Python 3.10.** On 3.10, `inspect.isclass(dict[str, list[str]])` is `True`, because `types.GenericAlias` passes the `isinstance(x, type)` check. `issubclass(alias, Linter)` then raises `TypeError: issubclass() arg 1 must be a class`, because `Linter` is an ABC. This was checked with CPython 3.10.22 and an ABC/`Generic` class built like `Linter`. On 3.11 and 3.12, `isclass` returns `False`. `typing.Dict[...]`, `X | Y` unions and `Annotated` are not affected. Galaxy supports `>=3.10` (`pyproject.toml:13`). Dev has no guard at `lint.py:442`, and `test_linter_module_list` uses the same check. The first #23884 attempt added `ParamQualifiedPaths = dict[str, list[str]]` to `linters/_util.py`. That made every lint call fail on 3.10, including user-defined tool create in the Unit, API and Integration CI jobs. That fix skipped `types.GenericAlias` in `lint.py`, but it never reached dev. No linter module defines such an alias today. In a linter module, write such aliases with `typing.Dict`, put them under `TYPE_CHECKING`, or keep them in a module outside `linters/`.
- **Imported classes are linted too.** Discovery doesn't check `value.__module__`. A concrete `Linter` subclass imported from another linter module would run twice, and the second run would have the importer's `module_name`. Each module imports only the abstract `Linter`, which `isabstract` skips, and non-`Linter` names such as `Version`, `NamedTuple` and pydantic models.
- **Subclasses of subclasses run but aren't listed.** Discovery uses `issubclass`, while `list_linters` uses direct `__subclasses__()`.
- **Non-XML tools.** Almost every class linter starts with `tool_xml = getattr(tool_source, "xml_tree", None); if not tool_xml: return`. YAML and user-defined tools therefore get only the linters written against the `ToolSource` interface, such as the general, containers, citations and inputs checks that call `parse_*`. The reference linters below are XML-only.

## Profile-gated linters

These linters change what they report depending on `tool_source.parse_profile()`:

| Linter | Gate |
|---|---|
| `OutputsFormatInput` (`output.py:158-179`) | `format="input"`: warning at ≤16.01, error after. |
| `StdIOAbsenceLegacy` / `StdIOAbsence` (`stdio.py:29, 51`) | At ≤16.01, says stderr signals errors. Above 16.01, says the exit code does. |
| `ValidDatatypes` (`datatypes.py:98`) | Accepts `format="input"` at ≤16.04. |
| `ToolProfileInvalid` / `ToolProfileLegacy` / `ToolProfileValid` (`general.py:155-178`) | `PROFILE_PATTERN = ^[12]\d\.\d{1,2}$` (`:26`). |
| `InputsBoolDistinctValues`, `InputsBoolProblematic` (`inputs.py:998-1027`) | Problematic boolean true/false values are allowed below 23.1. |
| `TestsCaseValidation` (`tests.py:181-182`) | Test parameters that fail validation against inputs: warning below 24.2, error after. |
| `TestsMultipleSelectEmptyValue` (`tests.py:229-230`) | Warning below 26.1, error after. |
| `CitationsInvalid` (`citations.py:17, 87`) | `CITATION_FATAL_PROFILE = 26.1`: invalid citations are errors from 26.1, warnings before. |
| `OutputsStructuredLikeReference` (`output.py:435`) | Unqualified `structured_like` aliases are accepted, with a warning, only below 26.0. |

To add a gate, call `Version(tool_source.parse_profile())` inside `lint` and choose `lint_ctx.warn` or `lint_ctx.error`. Most profile gates follow a matching runtime gate, so the lint message appears before the runtime behavior changes. Galaxy has no shared registry of these gates. The upgrade advisor keeps its own list in `upgrade_codes.json`.

## Output-reference resolution (dev)

[PR #23919](https://github.com/galaxyproject/galaxy/pull/23919) (`fix_format_source_docs`, merged) added two XML-only linters that check that an output's input reference resolves the same way runtime would:

- `OutputsStructuredLikeReference` (`output.py:265-276`) checks `outputs/collection[@structured_like]`.
- `OutputsFormatSourceReference` (`output.py:279-293`) checks `format_source` on `outputs/data`, `outputs/collection` and `outputs/collection/data`.

Neither linter checks `metadata_source`, `type_source` or `change_format`. A tool-load check covers `type_source` (see below).

### `_InputReferences`

The private `_InputReferences(tool_xml)` (`output.py:315-369`) walks `./inputs` once and records an `_InputReference(qualified, legacy, param_type, in_repeat)` (`:300-312`) for every `<param>`, including conditional test params:

- **Name.** `name`, or else `argument` with leading dashes removed and `-` replaced by `_` (`_param_name`, `:372-378`).
- **Conditional or section.** Visits its children with `qualified + [name]`. The new `legacy` is the parent's `qualified`, so the legacy key drops only the innermost conditional or section name. `<when>` changes neither path.
- **Repeat.** Records the repeat name in `repeat_names` and visits its children with `qualified + [f"{name}_0"]` as both paths, with `in_repeat=True`. Repeat segments are never dropped from the legacy key.
- **`normalize(reference)`** (`:355-362`) rewrites each segment `<base>_<digits>` to `<base>_0` when `<base>` is a known repeat name. `files_3|file` is checked as `files_0|file`.
- **`qualified(ref)`** matches exact qualified keys. **`candidates(ref)`** returns every qualified key whose last segment matches, for "Did you mean" hints.

### Qualified and legacy keys come from runtime

`visit_input_values` (`tools/parameters/__init__.py:174-304`) gives each callback two names:

- `prefixed_name` is the full path: `cond|inner|x`, or `rep_2|x` for a repeat (`:248`).
- `prefix + input.name` is the legacy name. For a conditional or section, `parent_prefix=name_prefix` (`:261-272, 298-300`), so the prefix is the enclosing path without the innermost group. For a repeat it is the new prefix with the index (`:256`).

`DefaultToolAction` stores both names in a `LegacyUnprefixedDict` (`tools/parameters/wrapped.py:44-70`). That class is a `UserDict` with a `_legacy_mapping` of old key to new key, and `__getitem__` and `__contains__` fall back to the mapping when the real key is missing:

- `input_datasets` (`tools/actions/__init__.py:190`) maps `input_datasets[prefixed_name]` with `set_legacy_alias(new_key=prefixed_name, old_key=prefix + input.name)` (`:258, 295`). It also adds the internal keys `name1..N` for `multiple` inputs and conversion names (`:259-272`).
- `inp_dataset_collections` (`:397-406`) uses the same pattern through `append_to_key`. `input_collection_parameters` (`:404-405`) is a plain dict, keyed by `prefixed_name` only.

### `structured_like` has two runtime paths

The rule in `_check_structured_like_reference` (`output.py:421-452`), as its comment states, is that a reference must resolve on both paths:

1. **Unmapped.** `ToolOutputCollectionStructure.collection_prototype(inputs, ...)` (`tool_util/parser/output_objects.py:468-477`) does `inputs[self.structured_like]`. Here `inputs` is `inp_dataset_collections.map_values(...)` (`actions/__init__.py:595, 718`), and `map_values` keeps the legacy mapping. Qualified keys and legacy aliases both work. Repeats work through the indexed key.
2. **Mapped over.** `tool_output_to_structure` (`model/dataset_collections/structure.py:197-220`) calls `ExecutionTracker.sliced_input_collection_structure(input_name)` (`tools/execute.py:584-625`). That method searches the nested `example_params` dict:
   - A `|` path is followed segment by segment.
   - A bare name is searched recursively at any depth, but only when `tool.profile < 26.0`. This recursion is the issue #6157 fallback, so from 26.0 a bare name must be top-level.
   - Repeats are lists in `example_params`, not dicts, so a reference inside a repeat never resolves.

The linter therefore:

- normalizes the reference and accepts an exact qualified match;
- below profile 26.0, for a reference without `|`, accepts a match on the legacy key and warns with the qualified name. The legacy match is the strict choice: a bare name that the mapped path finds at any depth may not be a legacy alias on the unmapped path, and `outer|input1` is accepted by neither path;
- reports an error when nothing matches (with a "Did you mean" hint when there is exactly one candidate), when every match is inside a repeat, and when no match is a `data` or `data_collection` input.

### `format_source`

At runtime, `resolve_format_source(format_source, input_datasets, input_dataset_collections, default_format, ...)` (`job_execution/output_format.py:29-87`) checks `format_source in input_datasets` first, so legacy aliases work. It then handles `name[<json index>]`, using the same `^[^\[\]]*\[[^\[\]]*\]$` shape as the linter's `ELEMENT_SELECTOR` (`output.py:297`), to select an element from a collection input. Any failure keeps the default format.

Discovered collection elements use a different lookup. `output_collect.py:219-231` builds `input_collections` from `job.input_dataset_collections` association names, which are qualified only.

`_check_format_source_reference` (`output.py:381-418`) copies these rules:

- It strips any selector, normalizes the path, and matches it against qualified keys, then legacy keys.
- A legacy match on a `<collection>` that has `<discover_datasets>` is an **error** that names the qualified key, because discovered elements can't resolve a legacy alias. Any other legacy match is a warning (`_warn_unqualified`, `:460-483`), which lists every match if the alias is ambiguous.
- No match is an error (`_error_unmatched`, `:486-503`). A selector on an input that isn't a collection is an error.

The linter doesn't model the internal keys (`input2`, `coll2`, conversion names) that runtime accepts. Issue #23891 is about that gap.

### `type_source` is checked at tool load

`Tool.parse_outputs` (`tools/__init__.py:1850-1860`) raises `ToolLoadError("... must be qualified as ...")` when `qualify_legacy_data_input_reference(self.inputs, type_source)` (`tools/parameters/__init__.py:353-367`) finds a legacy match. This runs at every profile. It has its own path walker, `_data_input_paths` (`:327-346`), which runs over the parsed `Tool.inputs` instead of the XML. Its docstring says it copies `visit_input_values`, but its legacy path drops **every** conditional and section name, while `visit_input_values` drops only the innermost one. A `type_source` such as `outer|x` for an input at `outer|inner|x` passes the load check. At job time it fails `input_collection_parameters.get(...)` (`actions/__init__.py:1230-1234`), because that dict is keyed by qualified name only.

Galaxy therefore has three separate reference walkers on dev: the linter's `_InputReferences`, `_data_input_paths`, and runtime `visit_input_values`.

## Proposed (unmerged)

These branches change the baseline above. None was on dev at `65e6daff`.

- **`issue_23891_output_reference_resolver`** (jmchilton fork, head `b28aa18d1b5`, 2026-10-27; no PR opened; fixes #23891). Built on dev at `a9a68082414`.
  - Moves the resolver to `lib/galaxy/tool_util/parser/output_references.py` as a public `InputReferences`. The new class is built from `ToolSource.parse_input_pages()` and `InputSource` instead of the XML tree, so YAML tools get it too, and conditionals that use `value_from` (and have no test param) are skipped.
  - Adds `resolve()`, which returns a `ResolvedReference`. That result holds the matches, a `legacy` flag, `qualified_key` (the reference re-indexed with its own repeat indices by `_reindex`), `runtime_key` and `shadowed`.
  - Adds `split_element_selector`, plus `output_reference_problem()` and `output_reference_ambiguity()`, which hold the rules. `format_source` may name `data`, `hidden_data` or `data_collection`. `metadata_source` may name `data` or `hidden_data`. A selector is allowed only on a collection.
  - `Tool._resolve_output_references` runs right after `parse_outputs` and rewrites each reference to its runtime key, so a legacy alias becomes its qualified key and internal keys stop resolving. A reference that doesn't resolve is dropped with a warning below profile 27.0 and fails tool load from 27.0 (`OUTPUT_REFERENCE_STRICT_PROFILE`).
  - A **shadowed** alias is one whose qualified form is itself another input's legacy alias. Below 27.0 it is kept as written; from 27.0 it is an error.
  - Replaces `qualify_legacy_data_input_reference` and `_data_input_paths` with the shared resolver, which would remove the `type_source` mismatch above.
  - Adds an `OutputsMetadataSourceReference` linter.
  - Leaves `structured_like` and `change_format` unchanged.
- **`issue_23902_qualified_output_references`** (head `435099bdf8c`, 2026-10-06; fixes #23902). Stacked on an **earlier** version of #23891 that used profile 26.2.
  - Adds `profile_allows_legacy_output_references(profile)` (`< 26.2`) and a `legacy_aliases` flag on `output_reference_problem`. From that profile, unqualified `format_source` and `metadata_source` fail tool load, and runtime lookups use `without_legacy_aliases()`, a new helper in `wrapped.py`.
  - Since then, #23891 has moved its strict gate to 27.0 and added `shadowed`. #23902 must be rebased and given a new profile before it can land.
- **#24524** (`upgrade_advice_structured_like`, draft PR, head `cc649c94509`; fixes #23884). This is the advisor redo. It moves the same class to `linters/_util.py` as `InputReferences`/`InputReference` and adds `legacy()` and `is_dataset_input` helpers, so the advisor can use it. That means a third home for the class, and it conflicts with #23891's move to `parser/output_references.py`. Whichever lands second must move its callers to the other's location. The redo adds no generic alias to `_util.py`, so the discovery crash above doesn't come back.

The direction: one resolver built from `ToolSource` in `tool_util/parser/`. The linter, tool load and the upgrade advisor would all use it. `structured_like` would later move to the same strict gate, as #23891's polish notes list for follow-up.

## Tests

`test_tool_linters.py`:

- `run_lint_module` (`:1576-1577`) runs one module plus `xsd` through `lint_tool_source_with_modules`. `run_lint` (`:1580-1584`) also asserts that every message has a line number.
- The reference-linter cases are at `:2601-2840`: `test_outputs_structured_like_*` (unqualified, qualified, missing, profile 26, deep, repeat, not data) and `test_outputs_format_source_*` (unqualified, qualified, collection element, nested legacy, repeat in conditional, repeat, unprefixed repeat, discovered legacy).
- `test_list_linters` and `test_linter_module_list` pin the public names and module names.

`test_container_shape_lint.py` covers `lint_user_tool_source`.

## Related

- [[Component - Collection Tool Execution Semantics]]: mapped-over output structure and where `structured_like` is resolved.
- [[Component - User-Defined Tool Source Validation]]: `lint_user_tool_source` in the user-tool create and edit pipeline.
- [[Component - Tool Citations and External Metadata Fetch]]: `CitationsInvalid` and the network linters skipped for user tools.
- [[Component - Tool Data Tables]]: the repository data-table `Linter[RepositoryDataTables]` set reuses this framework.
- [[Component - Tool Testing Infrastructure]]: the `tests.py` linters check the same test definitions.
