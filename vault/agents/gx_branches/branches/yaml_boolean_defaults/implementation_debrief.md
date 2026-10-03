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
