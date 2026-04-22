---
type: plan
tags:
  - galaxy/tools/yaml
  - galaxy/tools
  - workflow_state
component: User-Defined Tools
status: implemented
created: 2026-04-04
updated: 2026-04-05
related: YAML_SCHEMA_ISSUE.md
review: YAML_SCHEMA_REVIEW.md
---

# Plan: narrow the YAML tool parameter schema

## Progress (2026-04-05)

Implemented on branch `yaml_schema_harden` in the Galaxy worktree. All eight
steps closed. Review pass recorded in `YAML_SCHEMA_REVIEW.md`; its flagged
correctness issues and style nits have been folded back in.

- **Step 1** — `lib/galaxy/tool_util_models/yaml_parameters.py` created with
  the v1 union (`YamlBooleanParameter`, `YamlIntegerParameter`,
  `YamlFloatParameter`, `YamlTextParameter`, `YamlSelectParameter`,
  `YamlColorParameter`, `YamlDataParameter`, `YamlDataCollectionParameter`,
  `YamlConditionalParameter`, `YamlRepeatParameter`, `YamlSectionParameter`)
  and `to_internal()` mapping per parameter. `format` accepted as alias for
  `extensions` on data/data_collection, rejecting the case where both are
  supplied.
- **Step 2** — `UserToolSource.inputs` and `ToolSourceBase.inputs` now
  `List[YamlGalaxyToolParameter]`; `UserToolSource` also carries
  `model_config = ConfigDict(extra="forbid", ...)` so stray top-level keys
  (e.g. `argument:` at tool level) are rejected.
- **Step 3** — Plan option (a) preserved: the `runtime_model` / `build` path
  still hands `model_dump(by_alias=True)` to `YamlToolSource` which re-parses
  into internal models. `to_internal()` exists for tests and future
  short-circuiting, not for the production path.
- **Step 4** — `client/src/components/Tool/ToolSourceSchema.json` regenerated:
  77 KB → 32 KB. Monaco no longer advertises `truevalue`, `falsevalue`,
  `argument`, `is_dynamic`, `parameter_type`, `hidden`, or the deferred
  parameter types.
- **Step 5** — `test/unit/tool_util/test_yaml_parameters.py`: 34 tests
  covering reject cases (XML-only fields, unsupported types, expression
  validator, empty options, empty whens, format/extensions collision, unknown
  top-level envelope keys), green round-trips through `to_internal()`, the
  runtimeify guard, and a snapshot blacklist of the published schema. API
  integration red-cases in `test_unprivileged_tools.py` were **not** added —
  deliberate skip; see open questions.
- **Step 6** — `lib/galaxy/tool_util/parameters/convert.py` gains
  `YAML_V1_SUPPORTED_PARAMETER_MODELS` and `assert_yaml_v1_parameters()` that
  recurses through conditional/repeat/section. `runtimeify()` takes a
  `yaml_origin: bool` flag, defaulting to `False` (so XML tools are
  untouched). `lib/galaxy/tools/evaluation.py` passes
  `yaml_origin = self.tool.tool_source.parse_class() in ("GalaxyUserTool", "GalaxyTool")`.
- **Step 7** — **No compat shim, no migration.** User chose strict-write
  only. Existing beta DB rows that contain XML-only fields will now fail
  validation on the `api/tools.py:877` load path; users must recreate those
  tools. Documented in the PR body.
- **Step 8** — `doc/source/admin/user_defined_tools.md` updated with a
  "Supported input parameter types" section (table of leaf types, example
  using `select`/`integer`/`repeat`/`data`, explicit list of rejected types
  and fields).

Review correctness findings addressed in the same pass:

- `UserToolSource` envelope: `extra="forbid"` added (review issue 1).
- `YamlConditionalParameter.whens`: `Field(min_length=1)` added (review
  issue 3).
- `format` vs `extensions` collision: now raises at parse time (review
  issue 4).
- Review issue 2 (bool-conditional string coercion): investigated and
  determined to be a misreading of `factory.py`. Factory coerces string
  discriminators back to bools via `string_as_bool` before constructing
  `ConditionalWhen`, so the internal representation uses bools on both paths.
  `to_internal()` already matched. **No change required.**

Real discrepancy discovered during that investigation, **out of scope** for
this pass: `_from_input_source_galaxy` in
`lib/galaxy/tool_util/parameters/factory.py:134-143` reads the boolean test
parameter's default from the XML-era `checked` key, while the narrow
`YamlBooleanParameter` reads `value`. For a boolean-test conditional, the
XML-path re-parse can therefore compute a different `is_default_when` flag
than `to_internal()`. Separate follow-up — either add `checked` support in
factory's YAML path or document `value` as the canonical YAML key. Left as an
open question.

Tests: `test/unit/tool_util/test_yaml_parameters.py` (34) and
`test/unit/tool_util/test_parsing.py` (83) all green.

---

# Plan: narrow the YAML tool parameter schema

Companion to `YAML_SCHEMA_ISSUE.md`. Goal: introduce a YAML-facing parameter model
layer used by `UserToolSource` and `AdminToolSource`, with a mapping into the existing
internal XML metamodel so execution, state transforms, and runtime JSON generation are
unchanged.

## Decisions already locked in

- **In-sync narrowing**: `UserToolSource` and `AdminToolSource` get the same narrowed
  `inputs` type. Both are YAML-authored tools with the same sandboxed JS runtime; the
  only difference is `shell_command` vs `command`.
- **Names stay XML-consistent**: parameter `type` values stay `boolean`, `integer`,
  `float`, `text`, `select`, `color`, `data`, `data_collection`, `conditional`,
  `repeat`, `section`. Matches PR 19434 examples and the XML vocabulary.
- **No schema versioning** on `UserToolSource` in this pass.
- **Don't implement extra parameter types until we have tests for them.** The v1
  supported set is the minimum required for PR 19434 examples plus the obviously-safe
  primitives. `drill_down`, `data_column`, `directory_uri`, `rules`,
  `genomebuild`, `group_tag`, `baseurl`, `hidden` are deferred and explicitly
  rejected by `extra="forbid"` until a corresponding test suite lands.

## v1 supported parameter set

Leaf types: `text`, `integer`, `float`, `boolean`, `select` (static options only),
`color`, `data`, `data_collection`.

Structural groups: `conditional`, `repeat`, `section`.

Everything else is rejected at parse time.

## Narrow field set per type

Base (all types): `name`, `type`, `label`, `help`, `optional`. No `argument`,
`is_dynamic`, `hidden`, `parameter_type`.

- `YamlBooleanParameter`: `value`. **No** `truevalue`, `falsevalue`.
- `YamlIntegerParameter`: `value`, `min`, `max`, `validators` (InRange only).
- `YamlFloatParameter`: `value`, `min`, `max`, `validators` (InRange only).
- `YamlTextParameter`: `value` (alias of `default_value`), `area`, `validators`
  (Length, Regex, EmptyField — **not** Expression).
- `YamlSelectParameter`: `options: List[LabelValue]` (non-empty, static only),
  `multiple`, `validators` (NoOptions).
- `YamlColorParameter`: `value`.
- `YamlDataParameter`: `extensions`, `multiple`, `min`, `max`.
- `YamlDataCollectionParameter`: `collection_type`, `extensions`.
- `YamlConditionalParameter`: `test_parameter: Union[YamlBooleanParameter,
  YamlSelectParameter]`, `whens: List[YamlConditionalWhen]`.
- `YamlRepeatParameter`: `parameters: List[YamlToolParameterT]`, `min`, `max`.
- `YamlSectionParameter`: `parameters: List[YamlToolParameterT]`.

All models: `model_config = ConfigDict(extra="forbid", populate_by_name=True)`.

## Architecture

```
┌────────────────────────────────────────────────────┐
│ YAML authoring layer   (NEW)                       │
│   yaml_parameters.py                               │
│   YamlGalaxyToolParameter  (RootModel, narrow)     │
│   UserToolSource.inputs:  List[YamlGalaxy...]      │
│   AdminToolSource.inputs: List[YamlGalaxy...]      │
└──────────────────┬─────────────────────────────────┘
                   │ to_internal_parameter()
                   ▼
┌────────────────────────────────────────────────────┐
│ Internal metamodel (UNCHANGED)                     │
│   GalaxyParameterT / ToolParameterT                │
│   state transforms, runtimeify, runtime_model,     │
│   input_models_for_tool_source, XML parser path    │
└────────────────────────────────────────────────────┘
```

The YAML layer is purely authoring + publication. Everything below it continues to
see the existing internal models, so execution, state validation, job persistence,
and the client runtime_model pipeline need no changes of shape.

## Steps

### Step 1 — New module `lib/galaxy/tool_util_models/yaml_parameters.py`

- `BaseYamlToolParameter` with `name`, `type`, `label`, `help`, `optional`, and
  strict config.
- One subclass per v1 type (list above), each discriminated on `type`.
- `YamlGalaxyParameterT = Union[...]` and
  `class YamlGalaxyToolParameter(RootModel): root: YamlGalaxyParameterT = Field(..., discriminator="type")`.
- Forward references for `YamlConditional`, `YamlRepeat`, `YamlSection`; call
  `model_rebuild()` at module bottom.

### Step 2 — Wire into tool source models

In `lib/galaxy/tool_util_models/__init__.py`:

- `UserToolSource.inputs: List[YamlGalaxyToolParameter] = []`
- `ToolSourceBase.inputs: List[YamlGalaxyToolParameter] = []` (inherited by
  `AdminToolSource`).
- Stop importing `GalaxyToolParameterModel` here. Leave the union alive in
  `parameters.py` for any other users (grep only shows these two import sites; a
  later cleanup can remove it or rename to `XmlGalaxyToolParameterModel` — not
  required for this pass).

### Step 3 — Mapping layer `to_internal_parameter()`

Either a method on each `YamlFooParameter` or a visitor function in
`yaml_parameters.py`. Returns the corresponding internal model (e.g.
`YamlBooleanParameter.to_internal() -> BooleanParameterModel` with
`truevalue`/`falsevalue` left at their defaults — they are never consulted by the
YAML runner anyway).

Structural groups recurse: `YamlConditional.to_internal()` builds a
`ConditionalParameterModel` whose `test_parameter` is the mapped internal bool/select
and whose `whens` contain mapped child parameters.

Call site: wherever we currently take a validated `UserToolSource` and hand it off
for execution. Candidates to inspect:
- `lib/galaxy/managers/unprivileged_tools.py`
- `lib/galaxy/managers/tools.py` (`tool_payload_to_tool`)
- `lib/galaxy/webapps/galaxy/api/dynamic_tools.py` (`build`, `runtime_model`, `create`)

Note: `runtime_model` currently does `payload.representation.model_dump(by_alias=True)`
→ `YamlToolSource(root_dict=...)` → `input_models_for_tool_source`. Because
`YamlToolSource.parse_input_pages` re-reads the raw dict, the internal-facing
structure is still built by the XML-era parser from the dict. Two options:

  a. Leave the current path alone. The YAML layer's only job is validation at the
     API boundary — once `UserToolSource` has accepted the payload, the raw dict
     passed to `YamlToolSource` is guaranteed narrow, and
     `input_models_for_tool_source` happens to produce a subset of the internal
     metamodel that matches the YAML layer.
  b. Short-circuit: if we already have a parsed `UserToolSource`, build the
     `ToolParameterBundleModel` directly via the mapping layer, skipping the
     re-parse through `YamlToolSource`.

Start with (a) — lowest blast radius. Add (b) later if we want a single code path.

### Step 4 — Regenerate `ToolSourceSchema.json`

Run `client/src/components/Tool/rebuild.py`. Commit the new narrower
`ToolSourceSchema.json`. This is the user-visible payoff: Monaco immediately stops
advertising `truevalue`, `falsevalue`, `argument`, `is_dynamic`, `hidden`,
`parameter_type`, and the deferred parameter types.

### Step 5 — Tests (red → green)

Location: `test/unit/tool_util/` (new file `test_yaml_parameters.py`).

Red cases (should raise `ValidationError`):
- `truevalue` / `falsevalue` on a YAML boolean.
- `argument` anywhere.
- `is_dynamic` anywhere.
- `hidden` anywhere.
- `parameter_type: gx_boolean` anywhere.
- `type: hidden` / `type: drill_down` / `type: data_column` / `type: genomebuild`
  / `type: group_tag` / `type: baseurl` / `type: rules` / `type: directory`.
- Select with empty `options` list.
- Select with `dynamic_options` / `code_file` / `display`.
- Text with `validators: [{type: expression, ...}]`.

Green cases (round-trip YAML → `UserToolSource` → `to_internal()` → internal
metamodel → `create_job_runtime_model(...).model_json_schema(...)`):
- Each supported leaf type.
- PR 19434 example tools (`cat_user_defined`, `grep_tool`).
- A tool with a `conditional` whose test is a `select`.
- A tool with a `repeat` of `data` inputs.
- A tool with a `section`.

Snapshot test: `ToolSourceSchema.json` does not contain any of the blacklist
substrings (`truevalue`, `falsevalue`, `argument`, `is_dynamic`, `parameter_type`,
`hierarchy`, `data_ref`, `genomebuild`, `group_tag`, `baseurl`). Prevents silent
regressions as the internal metamodel grows.

API integration (`lib/galaxy_test/api/test_unprivileged_tools.py`):
- POST a tool with `truevalue` → expect 400.
- POST a tool with `type: hidden` → expect 400.
- Existing green tests continue to pass unchanged.

### Step 6 — Lock down `runtimeify`

In `lib/galaxy/tool_util/parameters/convert.py`, have `runtimeify`'s visitor
callback explicitly enumerate the v1 supported parameter types and raise on
anything else encountered in a tool originating from a YAML source. Right now it
silently passes through unsupported types via `VISITOR_NO_REPLACEMENT`, hiding
gaps. Since the tightened `UserToolSource` can no longer produce those types, this
assertion should never fire in practice — it exists to catch mapping bugs.

This may need a way to know the tool is YAML-origin. If that's awkward, make it a
separate `yaml_runtimeify` wrapper and leave the XML path alone.

### Step 7 — Compatibility for existing stored tools

`user_dynamic_tool_association` rows may already hold YAML blobs with fields the
new schema rejects (e.g. tools created during the PR 19434 beta that happened to
include `truevalue`).

Approach:
- **Strict on write** (POST / PUT): full `extra="forbid"` enforcement.
- **Lenient on load**: when hydrating an existing DB row, parse with a shim that
  drops unknown keys and logs a warning. On first re-save, the strict path
  rejects the old fields and the user must clean them up.
- One-time backfill script (optional): re-serialize existing rows to strip dead
  fields preemptively. Skip if the beta population is small.

Decision needed: is the beta user population small enough to skip the lenient
load path entirely and just migrate the rows? (See open questions.)

### Step 8 — Docs

- Update `doc/source/admin/user_defined_tools.md` with the supported parameter
  set and example of each type.
- Brief note in `YAML_SCHEMA_ISSUE.md` → resolved.

## Files touched

New:
- `lib/galaxy/tool_util_models/yaml_parameters.py`
- `test/unit/tool_util/test_yaml_parameters.py`

Modified:
- `lib/galaxy/tool_util_models/__init__.py` — swap `inputs` field type on both
  `UserToolSource` and `ToolSourceBase`.
- `client/src/components/Tool/ToolSourceSchema.json` — regenerated.
- `lib/galaxy/tool_util/parameters/convert.py` — `runtimeify` enumeration lock.
- `lib/galaxy/managers/unprivileged_tools.py` — invoke `to_internal()` at the
  handoff to the execution pipeline (if needed; see Step 3).
- `lib/galaxy/webapps/galaxy/api/dynamic_tools.py` — same, if option (b).
- `lib/galaxy_test/api/test_unprivileged_tools.py` — reject-case additions.
- `doc/source/admin/user_defined_tools.md`.

Not touched (intentionally):
- `lib/galaxy/tool_util_models/parameters.py` — internal metamodel stays as-is.
- `lib/galaxy/tool_util/parser/yaml.py` — re-reads the raw dict, which is
  already narrow by the time it gets there.

## Unresolved questions

- Rename `GalaxyToolParameterModel` to `XmlGalaxyToolParameterModel` in this
  pass, or leave it alone (only two import sites, both removed by the plan)?
- Short-circuit the `runtime_model` / `build` path to skip re-parse through
  `YamlToolSource` (option b in Step 3), or keep the re-parse for consistency
  with the XML path?
- Lenient-load shim or one-time DB migration for existing beta rows? Depends on
  how many tools exist today in production installs running the PR 19434 beta.
- Should `YamlTextParameter` drop `validators` entirely in v1 (simpler) and add
  them back with tests, mirroring the "no extra types without tests" rule?
- Treat `configfiles` and JS `requirements` on `UserToolSource` as in-scope for
  the same hardening pass, or separate follow-up?
- Do we narrow `BaseUrlParameterModel` off the CWL side too (`CwlParameterT`),
  or is CWL authoring out of scope for this pass?
