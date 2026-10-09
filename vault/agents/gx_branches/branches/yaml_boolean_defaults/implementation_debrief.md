# yaml_boolean_defaults — implementation debrief

First implementation slice of galaxyproject/galaxy#23888, targeting `release_26.1` at `a9a10abb470`. Production fix: `2e1b9a9ea76`; fixture-based test replacement: `590285f6659`; older-Python compatibility correction: `b05f421a253`. Reviewed and pushed to the `jmchilton/galaxy` fork. No PR opened.

## Final implementation

- `InputSource.parse_boolean_default(default, *, allow_none=True)` gives Boolean consumers a source-specific default parser. `YamlInputSource` honors an explicitly present `value`, including `False` and `None`, and otherwise retains legacy `checked` loading. The parameter-model factory and `boolean_is_checked` use this method while preserving their existing XML conversion policies.
- Replaced every unit test added by this branch, including the model/parser matrix and runtime test additions. The final diff against the base contains no changes under `test/unit`. The original inline API regression was replaced by the fixture suite.
- `DescribeUserTool` loads real YAML/JSON authoring definitions without client-side Pydantic normalization, builds forms through the API, lazily creates a persisted tool, and executes it through the existing `RequiredTool`/`DescribeToolExecution` assertion chain. Raw build/create/runtime-model methods preserve HTTP responses for validation checks. Existing model-based callers retain their serialization policy.
- `RequiredTool`, `DescribeToolExecution`, and request submission support tool UUIDs alongside existing ID execution. The indirect `user_tool` fixture grants and restores execution permissions.
- `lib/galaxy_test/api/test_user_tool_contract.py` specifies behavior in ordinary API assertions. Boolean defaults, explicit overrides, nullable inputs, and conditional branch selection execute real jobs through legacy, `21.01`, and request input formats. Tests cover both toolbox-loaded YAML tools and API-created tools from YAML/JSON definitions. Legacy `checked` loading and `value` precedence are tested on disk; all three user-tool authoring endpoints reject `checked`.
- Working YAML fixtures live in `test/functional/tools/parameters`; the deliberately legacy `checked` fixture is registered from `parameters/legacy`. Unsupported canonical repeat/section YAML definitions live beside their JSON equivalents in `lib/galaxy_test/base/data/user_tools`, keeping the existing framework-fixture validation corpus valid.

## Validation

- Red proof: temporarily restoring both pre-fix Boolean consumers caused all 18 new Boolean/conditional API cases to fail (`False is True`). Both production files were restored byte-for-byte in a `finally` block.
- New contract suite: 36 passed, 10 strict xfailed. Existing unprivileged-tool API suite: 17 passed. Existing ID execution checks: 5 passed, including all three input formats for default selection. Total: 58 distinct API cases passed, 10 strict expected failures.
- The combined run passed the new contract suite and all 17 existing user-tool tests, then hit five fixture-setup HTTP 401 errors in ID tests after the class-based suite invalidated the session fixture's API key. Those five tests passed in their own server session. Final fixture relocations and Boolean-identity assertion tightening were verified separately: checked cases 4 passed; null cases 6 passed/3 strict xfailed; structural cases 4 strict xfailed.
- Existing tool/parameter regression run: 610 passed, 1 skipped, 2 existing non-strict xpasses. Its sole failure was the framework scanner discovering the newly added unsupported repeat definition. After relocating API-only group sources, the unchanged framework scanner and authoring-schema fixture corpus passed all 27 cases. No baseline assertions or skips were changed.
- Black, isort, Ruff, and `git diff --check` passed. Commit hooks passed Black, Ruff, flake8, Prettier, and hygiene checks. Vault validation: 122 files, zero errors, 15 existing advisory warnings.
- API testing used the `jmchilton:galaxy-backend-tests` skill, the existing main-repository Python 3.13 virtualenv, and cached QuickJS through PYTHONPATH. The shared environment was not modified.
- Main logs: `/private/tmp/23888-api-fixture-red.log`, `/private/tmp/23888-api-final.log`, `/private/tmp/23888-api-existing-id.log`, `/private/tmp/23888-existing-unit-regression.log`, `/private/tmp/yaml-user-existing-fixture-validation.log`, `/private/tmp/yaml-user-relocated-checked.log`, `/private/tmp/yaml-user-null-identity-final.log`, `/private/tmp/yaml-user-contract-relocated-structural.log`.

## Review

Independent abstraction and final contract reviews used `_shared/REVIEW_FOCUS.md`. Centralized raw endpoint calls and tightened expected failures to dedicated exceptions raised only for the exact observed mismatch after successful form/job checks. The null-request exception distinguishes Boolean `False` from numeric zero. Final review found no remaining substantive issues.

Two advisory suggestions were not implemented: automatic deactivation of tools at fixture teardown (the existing suite uses temporary databases and leaves tools active; execution-role restoration is preserved), and identifying the exact cause of structural HTTP 500 responses (the endpoint returns only a generic error body). Structural xfails accept HTTP 500 only, so API validation failures remain visible, but another internal error on those tiny group fixtures would still be classified as the known parser gap.

## Older Python compatibility correction

The new parser signatures initially used `bool | None`, which evaluates at import time and breaks the standalone package on Python below 3.10. `packages/tool_util/setup.cfg` supports Python >=3.8. Both signatures now use the existing imported `Optional[bool]`; behavior is unchanged. Independent review checked the full production diff and found no other newly introduced incompatible annotations in that package.

Verified both parser modules import using actual Python 3.9.6 in an isolated temporary environment. The reported assertion suite, copied verbatim to avoid Galaxy application conftest dependencies, passed all 114 tests against this worktree's source. Existing YAML/parameter parsing checks passed all 107 tests on the main Python 3.13 environment. Black, Ruff, diff checks, and commit hooks passed. No tests were added or changed. Logs: `/private/tmp/23888-python39-asserts.log` and `/private/tmp/23888-python-compat-tests.log`.

## Remaining #23888 contracts

The 10 strict xfails document canonical repeat/section parsing (4), omitted text/multi-select optionality on disk (2), an omitted optional Boolean default on disk (1), and request execution replacing an omitted explicit-null Boolean default with `False` for disk/YAML/JSON tools (3). The latter comes from Boolean default filling using `parameter.value or False`; it was not changed during the test redesign.

Reusing the two stock text/select tools directly as API authoring sources also exposed embedded-test serialization problems: a modeled text assertion gains null-valued fields that break assertion parsing, and canonical `optional=False` makes an outputs-only multi-select test invalid. Their JSON authoring fixtures retain the runtime definitions and omit embedded tests; the stock YAML fixtures remain intact.

This remains the Boolean-default slice of the umbrella issue. Admin scalar-output support/unknown-field strictness, class-aware normalization, historical stored rows, workflow default policy, and docs/schema updates remain follow-ups. The former white-box admin-output and serialization-policy matrices were removed with the requested unit-test replacement; this user-tool API suite does not claim coverage of those admin-only contracts.

## CI fix

Fork CI run 37145210723 errored every `test_user_tool_contract.py` case in setup with HTTP 401 on `POST /api/histories`. Cause: `galaxy_interactor`, `dataset_populator`, and `dataset_collection_populator` in `lib/galaxy_test/api/conftest.py` were session-scoped. Creating an `ApiTestInteractor` mints a fresh API key for the test user, and `UserManager.by_api_key` accepts only the newest key. Every `ApiTestCase.setUp` mints one, so the session interactor's key expired as soon as a class-based module ran after the first pytest-function test. `test_tool_execute.py` survived because its tests ran contiguously. This branch added a second function-style module that sorts after class-based modules (`test_tools*`, `test_tours`, `test_unprivileged_tools`), so its tests always used an expired key. Single-module local runs never exposed it; the earlier combined-run 401s were the same bug.

Fix (`0346b77dd16`): those three fixtures are now function-scoped, matching `ApiTestCase`'s per-test key setup. `api_test_config_object` and `anonymous_galaxy_interactor` remain session-scoped. No tests or assertions changed.

- Red: `test_tool_execute.py::test_multidata_param`, then `test_tours.py::TestToursApi::test_index`, then the contract module's checked cases produced 4 setup errors with the exact CI 401 message.
- Green: the same ordering passed 8 of 8. A combined `test_tool_execute.py`, `test_unprivileged_tools.py`, and `test_user_tool_contract.py` session passed 167 cases with 10 strict xfails. Three expression-tool cases failed locally because the job subprocess lacks quickjs-ng; this is a local environment problem.
- Logs: `/private/tmp/23888-ci-401-red.log`, `/private/tmp/23888-ci-401-green.log`, `/private/tmp/23888-ci-401-green-combined.log`.

## Optionality and default convergence

Decision (John): the three load-path divergences recorded as xfails were bugs. YAML tools follow the canonical tool_util_models contract on every load path (disk YAML, API user tool from YAML, API user tool from JSON). XML behavior is unchanged; XML-era inference stays XML-only. This supersedes the 6 divergence xfails listed under "Remaining #23888 contracts".

Commits: tests `82eee2ec265`, parser fix `1fc8d7f5540`, request-fill fix `01027324b35` (pushed to `jmchilton/yaml_boolean_defaults`).

- **Omitted `optional` → False.** `YamlInputSource.parse_optional` ignores the caller's XML-era per-type default (multiple selects, ftpfile). A new `InputSource.parse_text_optional()` hook keeps the validator inference (`text_input_is_optional`) for XML; YAML returns explicit-or-False. `basic.py` and `factory.py` both call the hook, so the runtime and the parameter model agree.
- **Scope: YAML tool sources only.** `get_input_source` wraps any plain dict as a `YamlInputSource`, including workflow module forms (`workflow/modules.py`, `workflow_parameter_input_definitions.py`) and CWL inputs. A `canonical_defaults` flag, threaded the same way as `trusted`, is set only by `YamlToolSource.parse_input_pages` and propagated to nested pages. Raw dicts keep base `InputSource` behavior. A before/after probe of dict-built text, multi-select and optional Boolean parameters matched the base exactly.
- **Omitted optional Boolean `value` → False.** `YamlInputSource.parse_boolean_default` resolves `value`, then legacy `checked`, then False. Only an explicit `value: null` yields None.
- **Explicit null under request execution.** `fill_static_defaults(..., yaml_origin=)` uses the declared Boolean default for YAML tools. XML keeps `value or False`. The parameter model cannot tell an XML optional Boolean with no `checked` from a YAML null, since both are None. Making the XML model False instead would have made `false` the default branch for optional-Boolean conditional test params (`gx_conditional_boolean_optional`), which changes XML. A new `Tool.yaml_origin` property replaces the inline class check in `evaluation.py` (`runtimeify`).
- Model dump of all 433 tools under `test/functional/tools`, before and after: zero XML diffs. YAML diffs are limited to text `optional` True→False in `configfile`, `gx_user_boolean_conditional` and `simple_constructs`, plus `gx_user_boolean_optional_omitted` value None→False. Multi-select models were already False; only the runtime changed.

Scan (on-disk YAML tool definitions; `lib/galaxy/tools` has none) for inputs whose meaning changes:
- `configfile_user_defined.yml`: `text` (has value)
- `parameters/gx_select_multiple_one_default_user.yml`: multi-select `parameter` (has selected default)
- `parameters/gx_user_boolean_conditional.yml`: `choice/yes`, `choice/no` text (have values)
- `parameters/gx_user_boolean_optional_omitted.yml`: optional Boolean `flag` with no value (the intended target)
- `simple_constructs.yml` (`GalaxyTool`): multi-select `check_select` (has selected default), `p1/p1val` text in both branches (have values)

No existing test outside this module depended on the inferred optionality. No shared test data was edited. New fixtures: YAML twins `base/data/user_tools/configfile_user_defined.yml` and `gx_select_multiple_one_default_user.yml`, the stock YAMLs without embedded tests. `RequiredTool.build()` mirrors `DescribeUserTool.build()`.

Tests: each fact is now a single test parametrized over the three load paths (`loaded_tool` fixture), with no path-specific xfails. The `InferredOptionality`, `MissingOptionalBooleanDefault` and `RequestNullBooleanDefault` exceptions are removed.
- Red: 9 failed, 15 passed. The failures were disk optionality ×2, disk omitted Boolean ×3, and request null ×3 (disk/YAML/JSON). The ninth was a 60 s job-wait timeout on an API-YAML legacy case that already gave the correct value. `/private/tmp/23888-convergence-red.log`
- Green: full contract module 46 passed, 4 strict xfailed (the structural `UnsupportedStructuralInput` cases, unchanged). `/private/tmp/23888-convergence-green.log`
- `test_tool_execute.py`: 114 passed. `test_unprivileged_tools.py` plus a boolean/yaml/null/optional/text/conditional subset of `test_tools.py`: 29 passed. The 3 failures were the expression-tool cases that need quickjs-ng in the job subprocess, a local environment issue. `/private/tmp/23888-convergence-tool-execute.log`, `/private/tmp/23888-convergence-tools-unprivileged.log`
- Framework: 28 passed, including XML `gx_boolean_optional*`, `gx_conditional_boolean_optional`, `gx_text*`, YAML `configfile`, `gx_select_multiple_one_default_user` (outputs-only test still valid on disk), `simple_constructs_y` and `gx_boolean_user`. `expression_null_handling_boolean` ×3 failed on quickjs-ng (environment). `/private/tmp/23888-convergence-framework.log`
- Unit (parameter specification/convert/test cases, parsing, YAML params, user tool fixtures/validation/trust, app parameter/select/validation/deserialization/roundtrip): 418 passed before and after. With the scope flag, all of `test/unit/app/tools`, `test/unit/workflows`, `test_cwl.py` and the tool_util set: 905 passed. 52 failed, and the same 52 fail at base `0346b77dd16`: `test_cwl.py` (schema_salad), `test_expression_basics.py` (quickjs) and `test_dynamic_option_cache`. `/private/tmp/23888-convergence-unit-green2.log`, `/private/tmp/23888-convergence-unit-env-baseline.log` `/private/tmp/23888-convergence-unit-baseline.log`, `/private/tmp/23888-convergence-unit-green.log`
- Black, isort, Ruff 0.15.13, commit hooks: pass. Mypy shows no errors in the changed files.

- After the scope flag: contract module plus `test_unprivileged_tools.py` gave 63 passed, 4 strict xfailed (`/private/tmp/23888-convergence-green-final.log`). Two workflow optional-data cases fail only on the quickjs-ng environment issue (`/private/tmp/23888-convergence-wf-optional.log`); In the workflow parameter/optional/default/boolean subset of `test_workflows.py`, 28 passed. The other 2 (subworkflow `when`/optional parent input) time out identically at base `0346b77dd16`, which points to quickjs-ng `when` evaluation. Logs: `/private/tmp/23888-convergence-workflows.log`, `/private/tmp/23888-convergence-wf-base.log`.

Open: `Tool.yaml_origin` keys on `class` (GalaxyTool/GalaxyUserTool), the same predicate `runtimeify` already used. A class-less YAML tool would get canonical parsing but XML request fill; no registered tool is class-less.

Remaining xfails: 4 structural repeat/section cases.
