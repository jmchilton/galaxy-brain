---
type: review
tags:
  - galaxy/tools/yaml
  - workflow_state
related: YAML_SCHEMA_PLAN.md
status: draft
created: 2026-04-04
---

# Review: yaml_schema_harden branch

Focused review of the narrow-YAML-parameter-schema implementation on branch
`yaml_schema_harden` against `YAML_SCHEMA_PLAN.md`.

## Summary verdict

**Ship with minor fixes.** The implementation tracks the plan closely, the
31-test unit suite passes, the published `ToolSourceSchema.json` snapshot test
is green, no other call sites structurally consume `UserToolSource.inputs`
beyond raw dict re-parsing, and the runtimeify guard is correctly gated on
YAML origin. Issues found are mostly style and test-coverage gaps, plus two
correctness nits worth addressing before landing.

## Correctness issues

### 1. `AdminToolSource` does not inherit the strict `extra="forbid"` envelope

`ToolSourceBaseModel` (`lib/galaxy/tool_util_models/_base.py:9`) sets no
`extra="forbid"`. `ToolSourceBase` and `UserToolSource` are subclasses of it.
`extra="forbid"` is only applied on the *individual parameter* models inside
`yaml_parameters.py`, so every unknown key on the **tool envelope** itself
(e.g. `"truevalue": ...` at the top level, or any misspelled top-level key)
is silently accepted. The plan explicitly scopes the change to `inputs`, so
this is acceptable as-is, but it means a user who types `argument:` at the
top level of a YAML tool still gets no error. Worth a follow-up ticket or an
open question.

### 2. Boolean-discriminated conditionals disagree with the XML path

`YamlConditionalWhen.discriminator: Union[bool, str]` allows a raw
`True/False`. `YamlConditional.to_internal()` uses
`cond_test_parameter_default_value(internal_test)` which, for a
`BooleanParameterModel`, returns the boolean `value` (bool, not `"true"`).
The comparison `when.discriminator == default_value` will therefore work as
long as the YAML author wrote `discriminator: true` (bool). However, the XML
path (`YamlToolSource.parse_when_input_sources`,
`lib/galaxy/tool_util/parser/yaml.py:553`) explicitly casts bool keys to
`"true"` / `"false"` strings before they reach `ConditionalParameterModel`.
So for a boolean-test conditional the production (option (a)) path produces
`is_default_when` computed on strings, and the `to_internal()` mapping
computes it on bools. If anyone ever replaces the current path with option
(b), they'll get subtly different default-when flags.

Recommendation: have `YamlConditional.to_internal()` coerce bool
discriminators to `"true"/"false"` strings before the equality check, so the
two paths are byte-equivalent. At minimum add a test covering a
boolean-test conditional through `to_internal()` and assert the default-when
flag matches what the XML path produces.

### 3. Conditional `whens` minimum count not enforced

Plan doesn't require it, but `YamlConditionalParameter.whens` has no
`min_length=1` annotation. An empty `whens: []` passes validation, which is
semantically meaningless. Internal `ConditionalParameterModel` would happily
receive an empty list too. Minor; worth adding `Field(min_length=1)` for
consistency with `YamlSelectParameter.options`.

### 4. `format`/`extensions` collision is silent

`_normalize_extensions_before`
(`lib/galaxy/tool_util_models/yaml_parameters.py:172`) only copies `format`
into `extensions` if `"extensions" not in values`. If the user supplies both,
`format` is silently dropped. This matches the XML-side precedence in
`YamlInputSource.parse_extensions` (line 530 of
`lib/galaxy/tool_util/parser/yaml.py` — extensions wins), so the runtime
behavior is consistent, but the YAML layer should arguably reject the
simultaneous presence under `extra="forbid"` spirit. Low priority.

## Integration concerns

### Reuse of existing abstractions (good)

- `LabelValue`, `ConditionalWhen`, `cond_test_parameter_default_value`, and
  all `*ParameterValidatorModel` classes are imported from their existing
  homes — no duplication.
- The narrow validator unions
  (`YamlTextValidators`/`YamlNumberValidators`/`YamlSelectValidators`,
  `lib/galaxy/tool_util_models/yaml_parameters.py:61-67`) correctly drop
  `ExpressionParameterValidatorModel` and subset the numeric/select sides.
- `to_internal()` reuses internal model constructors directly, no factory
  duplication.

### Duplication of common-kwargs assembly

`_common_internal_kwargs` (`yaml_parameters.py:79`) is a small private
helper. Fine as-is; it's a handful of lines and local. No need to push it
into `parameters.py`.

### No in-method imports in production code (good), but…

`convert.py` and `evaluation.py` keep their imports at the top — conforms to
the global style rule. However **`test_yaml_parameters.py` has three
embedded imports** (lines 294, 303-304, 312-315) inside test function
bodies. Per the user's stated style preference, these should be hoisted to
the module top. Functionally fine; purely stylistic.

### Slight import-order drift in `tool_util_models/__init__.py`

`from .yaml_parameters import YamlGalaxyToolParameter` appears between
`.parameters` and `.tool_outputs` (line 34), breaking alphabetical order in
the relative-import block. Cosmetic.

## Test coverage gaps

Against the plan's Step 5 red-list, these are present:
`truevalue`/`falsevalue`/`argument`/`is_dynamic`/`hidden`/`parameter_type`,
all 8 unsupported `type:` values, empty `options`, `dynamic_options`,
expression validator.

### Missing red cases from the plan

1. **`code_file` / `display`** on a select (plan Step 5 bullet "Select with
   `dynamic_options` / `code_file` / `display`"). Only `dynamic_options` is
   tested. Adding them is a two-line parametrize expansion — cheap insurance
   against someone adding them to the narrow model later.
2. **XML-only fields on non-boolean types.** Every red test for
   `truevalue`/`argument`/`is_dynamic`/`hidden`/`parameter_type` is
   parametrized only over a `type: boolean` parameter. A user could smuggle
   `argument` through on a `text` or `data` parameter, and the test suite
   would not notice a regression in those subclasses. `extra="forbid"` is
   inherited from the base so it does work, but explicit coverage on at
   least one non-boolean type would be prudent.
3. **`repeat`/`section` carrying a disallowed top-level field like
   `is_dynamic`**. The unsupported-types traversal is covered for
   `assert_yaml_v1_parameters`, but not for `extra="forbid"` enforcement on
   the YAML layer.

### Green-case gap: `create_job_runtime_model` exercised for only one shape

The plan Step 5 says "round-trip … through
`create_job_runtime_model(...).model_json_schema(...)`" for **each**
supported leaf type and for the structural groups. The current test does
this only once, for `CAT_USER_DEFINED`
(`test_runtime_model_pipeline_from_yaml_internal`). The individual leaf and
group tests stop at `to_internal()` and never hit `create_job_runtime_model`.
This is the test that would catch a mapping bug where `to_internal()`
produces a model the runtime schema builder can't consume (e.g. missing a
required field). Worth folding the runtime-model assertion into the
conditional, repeat, and section green tests — small cost, large payoff.

### Snapshot blacklist is weaker than the plan specifies

Plan Step 5 lists blacklist substrings:
```
truevalue, falsevalue, argument, is_dynamic, parameter_type,
hierarchy, data_ref, genomebuild, group_tag, baseurl
```

`test_yaml_parameters.py:271` uses:
```
truevalue, falsevalue, argument, is_dynamic, parameter_type,
hierarchy, data_ref, gx_hidden, gx_drill_down, gx_genomebuild,
gx_group_tag, gx_baseurl, gx_rules
```

Observations:
- Missing the plain `genomebuild`, `group_tag`, `baseurl` substrings that
  would catch discriminator values or plain field refs.
- The current file uses the `gx_`-prefixed forms. These would match
  `"parameter_type": "gx_genomebuild"` but **not** match a bare
  `"type": "genomebuild"` leak. Consider including both the plain and
  `gx_`-prefixed substrings so the test is a strict superset of the plan.
- `falsevalue` is a substring of `truevalue`? No — but note `argument` will
  also match `arguments` (JS requirement field). The current published
  schema doesn't have any `arguments` field at the relevant level; the test
  passes. Low risk but worth a comment noting why substring search is safe
  here, or switch to schema-graph walking for precision.

### No API-level red tests (Step 5 "API integration")

The plan called for additions to
`lib/galaxy_test/api/test_unprivileged_tools.py` to POST a tool with
`truevalue` and `type: hidden` and expect 400. Grep shows
`test_unprivileged_tools.py` is unchanged in this branch. Since the
validation fires at `UserToolSource.model_validate` inside the FastAPI
request model, a 422 (not 400) will come back automatically — still a
useful end-to-end sanity check to add. Not a blocker, but is a plan
deviation worth calling out.

### Tautological / brittle nothing-to-see-here

No tautological tests found. All assertions check observable state.

## Style / cleanup nits

1. Embedded imports in `test_yaml_parameters.py` (lines 294, 303-304,
   312-315) — hoist to top of module.
2. Import order of `from .yaml_parameters` in
   `lib/galaxy/tool_util_models/__init__.py:34` — put after `.tool_source`
   or resort the block alphabetically.
3. `YamlGalaxyParameterT` trailing comma in single-element `Union` tuples:
   `Union[InRangeParameterValidatorModel,]` (line 66). Works, but the
   trailing comma is unusual inside a `Union`; use `List[InRange…]`
   directly, or drop the comma. Pure taste.
4. `_normalize_format` (lines 195 and 218) repeats the same
   `model_validator(mode="before")(classmethod(lambda …))` idiom twice; a
   shared `@classmethod` defined once and referenced in both classes would
   be slightly cleaner. Four-line win, not worth blocking on.
5. `field_validator("extensions", mode="before")` is defined as
   `_split_extensions` as a method on both `YamlDataParameter` and
   `YamlDataCollectionParameter` — same repetition.
6. `YamlSelectParameter.options: Annotated[List[LabelValue], Field(min_length=1)]`
   is good. Consider applying the same `min_length=1` to
   `YamlConditionalParameter.whens` (see correctness issue 3).
7. `YamlBooleanParameter.value: Optional[bool] = False`: `Optional[bool]`
   with a non-None default is a mild type-lie (the default is never None).
   Match the internal `BooleanParameterModel.value` which uses the same
   form, so at least it's consistent.
8. `to_internal()` methods repeatedly pass `type="boolean"`/`type="text"`
   etc. as explicit kwargs. These are Literal-defaulted on the internal
   models for some (e.g. `TextParameterModel.type: Literal["text"]` has no
   default; `BooleanParameterModel.type: Literal["boolean"]` likewise), so
   the explicit arg is required. OK as-is.

## Call-site sweep (grep for `GalaxyToolParameterModel` /
`UserToolSource` / `AdminToolSource`)

Consumers identified and their status under the new narrow type:

- `lib/galaxy/agents/custom_tool.py:53,88` — passes `UserToolSource` as
  structured-output type to pydantic-ai. The LLM gets the narrower schema,
  which is a feature. `tool.model_dump(by_alias=True, exclude_none=True)`
  on line 101 still works. **OK.**
- `lib/galaxy/webapps/galaxy/api/dynamic_tools.py:99,106-107` — uses
  `payload.representation.model_dump(by_alias=True)` and hands the dict to
  `YamlToolSource`/`tool_payload_to_tool`. The dump drops
  `format`→`extensions` aliasing cleanly, and `YamlInputSource.parse_extensions`
  (`lib/galaxy/tool_util/parser/yaml.py:530`) reads `extensions` first.
  **OK.**
- `lib/galaxy/webapps/galaxy/api/tools.py:877` —
  `UserToolSource(**dynamic_tool.value).model_dump_json(...)`. Old beta DB
  rows containing e.g. `truevalue` will now raise on load — this is the
  **strict-write-no-compat** path the user explicitly chose (Step 7 plan
  option). **Intentional; document it.**
- `lib/galaxy/tool_util_models/dynamic_tool_models.py:11,28` — simple
  reference to `UserToolSource` as a field type. Unaffected.
- `lib/galaxy_test/api/test_unprivileged_tools.py`,
  `lib/galaxy_test/base/populators.py`,
  `test/integration/test_user_defined_tool_job_conf.py`,
  `test/unit/app/test_agents.py` — all construct payload dicts, not
  structural inputs; they use the narrow supported set already. **OK.**
- `lib/galaxy/tools/evaluation.py:1102-1108` — updated to pass
  `yaml_origin=self.tool.tool_source.parse_class() in ("GalaxyUserTool",
  "GalaxyTool")`. **OK**, but note the string-match is duplicated (and
  fragile if a third class name ever appears — e.g. a future CWL-adjacent
  class). A small helper like `tool_source.is_yaml_authored` would
  centralize the check. Low priority.

## Plan adherence

Followed:
- Step 1 narrow parameter module: done, all v1 types present, discriminator
  RootModel, `model_rebuild()` calls in correct order (structural → root
  last).
- Step 2 wire-in on both `UserToolSource` and `ToolSourceBase`: done.
- Step 3 `to_internal()`: done, option (a) preserved as the user requested.
- Step 4 regenerated `ToolSourceSchema.json`: present in diff (77KB → ~32KB
  per the task description).
- Step 5 unit tests: mostly done — see gaps above.
- Step 6 `runtimeify` lock-down: `assert_yaml_v1_parameters` added,
  recursive over conditional whens, repeat.parameters, and
  section.parameters. `yaml_origin` threaded through from
  `UserToolEvaluator._build_environment_variables`-adjacent call. XML tools
  pass `yaml_origin=False` by default. Correct.
- Step 8 docs: `doc/source/admin/user_defined_tools.md` updated with the
  supported parameter set, an example, and explicit rejection list.

Deliberate deviations (both pre-blessed by the user):
- Step 3 option (a) re-parse path retained — confirmed.
- Step 7 no lenient-load compat shim — confirmed. Tools in the DB that
  contain e.g. `truevalue` will now 422 on load via the `tools.py:877`
  path. No migration script included.

Unexpected deviation:
- Step 5 API-integration tests (POST `truevalue` → 400; POST
  `type: hidden` → 400) were **not** added. Either add them or note the
  coverage gap explicitly in the PR description.

## Open questions for the author

- Intentional to not add the Step 5 API-integration 400/422 tests to
  `test_unprivileged_tools.py`? Trivial to add; worth the safety net.
- Intentional that boolean-discriminated conditionals go through
  `to_internal()` without string-coercing the discriminator? See
  correctness issue 2.
- Why `extra="forbid"` on parameter models but not on the `UserToolSource`
  envelope itself? (A top-level stray `argument:` is still silently
  accepted.) Follow-up ticket or in-scope?
- `YamlConditionalParameter.whens` minimum-count enforcement: want
  `Field(min_length=1)` analogous to select options?
- Is `tool_source.parse_class() in ("GalaxyUserTool", "GalaxyTool")`
  worth promoting to a helper (e.g. `tool_source.is_yaml_authored`) to
  avoid a future third-class omission?
- Snapshot blacklist: include bare `genomebuild`/`group_tag`/`baseurl`
  substrings in addition to the `gx_`-prefixed forms?
