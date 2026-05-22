---
type: research
subtype: design-spec
tags:
  - research/design-spec
  - galaxy/tools
  - galaxy/tools/yaml
  - galaxy/security
component: User-Defined Tools - Source Validation
status: draft
created: 2026-05-07
revised: 2026-05-22
revision: 3
ai_generated: true
sources:
  - https://github.com/galaxyproject/galaxy/pull/22507
  - https://github.com/galaxyproject/galaxy/pull/22362
  - https://github.com/galaxyproject/galaxy/pull/22625
summary: "Validation of the YAML tool source — UserToolSource Pydantic schema, narrow YAML input models, ToolSourceSchema.json, MCP authoring surface."
related_prs:
  - 19434
  - 21828
  - 22116
  - 22280
  - 22362
  - 22507
  - 22566
  - 22618
  - 22622
  - 22625
  - 22627
  - 22628
  - 20990
  - 22615
related_notes:
  - "[[Component - User-Defined Tools]]"
  - "[[PR 19434 - User Defined Tools]]"
  - "[[PR 21828 - YAML Tool Hardening and Tool State]]"
  - "[[Component - YAML Tool Runtime]]"
  - "[[Component - Tool State Specification]]"
  - "[[PR 22615 - UserToolSource Pydantic Semantic Validation]]"
---

# Validating the User-Defined Tool Source

> **Scope.** This note is about validating the YAML *tool source* — the
> `class: GalaxyUserTool` document a user (or agent) writes. Runtime state
> validation (`Job.tool_state`, `runtimeify`, post-hoc divergence) is out
> of scope and lives in [[Component - User-Defined Tools]] and
> [[Problem - YAML Tool Post-Hoc State Divergence]].

## 1. Why source validation is the load-bearing problem

Galaxy XML tools have always validated their source — but the validation
was implicit in the parameter classes in `lib/galaxy/tools/parameters/basic.py`
and existed mostly to help the *author*. Trust came from the install gate:
an admin had vetted the tool before it reached the toolbox.

User-Defined Tools (UDTs) flip every assumption underneath that:

- **The author is not vetted.** UDTs are POSTed by users with the
  `Custom Tool Execution` role and stored in the database.
- **The author may not be human.** PR
  [#22625](https://github.com/galaxyproject/galaxy/pull/22625) wired
  `create_user_tool` into the agent-operations layer and the in-process
  MCP server (#22618 mounted FastMCP at the sub-app root). The standalone
  `galaxy-mcp` server has had the same operations for some time.
- **The schema has external consumers.** Monaco needs a JSON Schema for
  red-squiggle authoring; external MCP clients and LLMs need one to
  validate before POSTing; workflow imports need a stable contract for
  embedded tool definitions.

The failure mode that drives the validation work is *"looks valid, isn't
honored"*: a YAML field that parses without error and is then silently
ignored at runtime. To a human author, that's annoying. To an LLM that
just synthesized the tool from a natural-language description, it is a
confidently-wrong output. The cost of permissive source validation scales
with how mechanical the authoring becomes — and authoring is becoming
mechanical fast.

This paper traces what the YAML tool source schema validates today, where
the strictness comes from, what the agent authoring surface needs from
it, and what is still loose.

## 2. The two source classes

`lib/galaxy/tool_util_models/__init__.py:65-155` defines the source-level
schema. Two strictness profiles share a common base:

```python
class _DynamicToolSourceBase(ToolSourceBaseModel):
    # extra="forbid" rejects unknown top-level keys (e.g. a stray `argument:`
    # at the tool level), matching the strict-narrow stance on `inputs`.
    model_config = ConfigDict(extra="forbid", ...)

    id: Optional[str] = ...      # 3-255 chars, lowercase preferred
    version: Optional[str] = ...
    name: str = ...              # required
    description: Optional[str] = None
    configfiles: Optional[List[YamlTemplateConfigFile]] = None
    requirements: Optional[List[Union[
        JavascriptRequirement,
        ResourceRequirement,
        ContainerRequirement,
    ]]] = []
    shell_command: str = ...     # required
    inputs:  List[YamlGalaxyToolParameter] = []
    outputs: List[IncomingToolOutput]      = []
    citations: Optional[List[Citation]] = None
    license: Optional[str] = None
    edam_operations: Optional[List[str]] = None
    edam_topics:     Optional[List[str]] = None
    xrefs: Optional[List[XrefDict]] = None
    profile: Optional[float] = None
    help: Optional[HelpContent] = None
    tests: Optional[List["YamlToolTest"]] = None

    @model_validator(mode="before")
    def normalize_items(cls, values):  # accept dict-of-dicts inputs/outputs
        ...

class UserToolSource(_DynamicToolSourceBase):
    class_: Literal["GalaxyUserTool"] = Field(alias="class")
    container: str = ...                 # required STRING

class YamlToolSource(_DynamicToolSourceBase):
    class_: Literal["GalaxyTool"] = Field(alias="class")
    container: Optional[str] = None      # admin form, looser

DynamicToolSources = Annotated[
    Union[UserToolSource, YamlToolSource],
    Field(discriminator="class_"),
]
```

Two design choices carry the schema:

1. **`extra="forbid"` on the base.** A misplaced top-level key at the tool
   level is a hard error rather than a silent pass-through. This is the
   single most important invariant in the whole stack.
2. **The `class_` discriminator routes strictness.** `UserToolSource` is
   what unprivileged users may POST; it requires `container` as a string.
   `YamlToolSource` is the admin-dynamic-tool surface; it allows
   `container: None`. Both share the strict base.

The `normalize_items` validator allows both list-of-dicts and dict-of-dicts
forms for `inputs`/`outputs` (a YAML ergonomics nicety), but normalizes
before strict validation runs.

### 2.1 The post-#22615 validator surface

PR [#22615](https://github.com/galaxyproject/galaxy/pull/22615) (see
[[PR 22615 - UserToolSource Pydantic Semantic Validation]]) layers
semantic validators on top of the shape-only schema above. They run
during pydantic model construction, so every `DynamicUnprivilegedToolCreatePayload`
caller (API, MCP, `CustomToolAgent`) is gated identically:

- **`id`** — `Field(pattern=r"^[a-z][a-z0-9_-]*$")` on
  `_DynamicToolSourceBase` (hyphens allowed; uppercase rejected).
- **`name`** — `min_length=5` plus `_reject_blank_strings` (also covers
  `version`).
- **`container`** (UserToolSource-only) — `_reject_blank_container`.
- **`_check_input_refs`** (`model_validator(mode="after")`) — scans
  every `$(...)` block in `shell_command` and each `configfile.content`
  for `inputs.<name>` references and rejects undeclared names. Top-level
  identifier only; nested refs like `inputs.cond.test_parameter` resolve
  to `inputs.cond` and computed/aliased ECMAScript is accepted as a
  false negative.
- **`_check_output_claims`** (`model_validator(mode="after")`) — each
  output must declare `from_work_dir` or `discover_datasets` (datasets)
  or `structure.discover_datasets` (collections). Replaces the old
  "name appears in command" heuristic.
- **`Citation._check_citation_shape`** (in `tool_source.py`) — empty
  content rejected; `type=doi` matched against `^10\.\d{4,9}/.+$`,
  `type=bibtex` matched against `^@[a-zA-Z]+\s*\{`.

A `_canonical_order` `model_serializer` on `UserToolSource` pins the
key order on `model_dump` so editor round-trips don't reshuffle the
document.

Two helpers operationalize the validators outside pydantic itself:
`format_validation_errors` distills `ValidationError.errors()` to
friendly `"<dotted.loc>: <msg>"` bullets (agent-only at HEAD; the API
path uses FastAPI's default 422), and `lint_user_tool_source` invokes
the lint framework with `NETWORK_LINTERS` skipped — used by both the
API manager and the agent to surface container-shape and related linter
findings on top of pydantic.

Container *image shape* (quay.io/biocontainers, docker://, oras://,
docker-hub) lives in a new `ContainerImageShape` linter rather than on
the pydantic model.

## 3. Narrow YAML-facing input models — `yaml_parameters.py`

Inputs are the largest source-side validation surface. Pre-#22507, the
`inputs` field reused the full internal Galaxy XML parameter metamodel,
meaning every XML-only field (`truevalue`, `falsevalue`, `argument`,
`expression` validators, etc.) was technically permitted in YAML — but
silently ignored at runtime.

PR [#22507](https://github.com/galaxyproject/galaxy/pull/22507) ("Narrow
YAML schema") replaces that with a parallel narrow model family in
`lib/galaxy/tool_util_models/yaml_parameters.py`. The header makes the
intent explicit:

> Narrow YAML-facing tool parameter models. `UserToolSource` and
> `YamlToolSource` use these for their `inputs` field instead of the full
> internal Galaxy XML metamodel union. The YAML layer is purely an
> authoring/publication surface: it validates what users may write in YAML
> tools and rejects XML-only fields and unsupported parameter types via
> `extra="forbid"`.

The shape:

```python
class _YamlParamBase(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    name: str
    label: Optional[str] = None
    help:  Optional[str] = None
    optional: bool = False

class YamlBooleanParameter(_YamlParamBase):
    type: Literal["boolean"]
    value: Optional[bool] = False           # NO truevalue/falsevalue
    def to_internal(self) -> BooleanParameterModel: ...

class YamlIntegerParameter(_YamlParamBase):
    type: Literal["integer"]
    value: Optional[int] = None
    min: Optional[int] = None
    max: Optional[int] = None
    validators: List[YamlNumberValidators] = []

# YamlFloatParameter, YamlTextParameter, YamlSelectParameter,
# YamlColorParameter, YamlDataParameter, YamlDataCollectionParameter,
# YamlConditionalParameter, YamlRepeatParameter, YamlSectionParameter
# all follow the same pattern.

YamlGalaxyParameterT = Union[
    YamlBooleanParameter, YamlIntegerParameter, YamlFloatParameter,
    YamlTextParameter,    YamlSelectParameter,  YamlColorParameter,
    YamlDataParameter,    YamlDataCollectionParameter,
    YamlConditionalParameter, YamlRepeatParameter, YamlSectionParameter,
]

class YamlGalaxyToolParameter(RootModel):
    root: Annotated[YamlGalaxyParameterT, Field(discriminator="type")]
```

Three things to note:

### 3.1 Two-level discrimination

Validation is structurally two-level:

```
UserToolSource     ── discriminated by ── class_ ("GalaxyUserTool")
└── inputs[*]      ── discriminated by ── type  ("boolean"|"integer"|...)
    └── (per-type narrow Pydantic, extra="forbid")
```

Pydantic 2's tagged-union discriminator gives precise error messages —
`type: foo` with an unknown tag fails with "no match for tag", not a
generic "extra fields not permitted" cascade. This is why the editor and
MCP error messages are usable in practice.

### 3.2 Narrow validator unions

Each parameter family carries its own narrow validator union — XML-only
validators like `Expression` are not present:

```python
YamlTextValidators   = Union[Length, Regex, EmptyField]
YamlNumberValidators = Union[InRange]
YamlSelectValidators = Union[NoOptions]
```

The narrowness is intentional: validators that cannot be implemented under
the sandboxed JS expression model (e.g. anything calling Python) are
absent. This is the schema saying "if you write it, the runtime will
honor it".

### 3.3 `to_internal()` round-trip

Every narrow model exposes `to_internal()` returning the matching internal
`GalaxyParameterT`:

```python
def to_internal(self) -> BooleanParameterModel:
    return BooleanParameterModel(
        type="boolean", value=self.value, **_common_internal_kwargs(self)
    )
```

The narrow YAML model and the internal Galaxy parameter model are kept
provably bijective on the supported subset. Today the production load
path still goes through `input_models_for_tool_source` from the raw
validated dict, so `to_internal()` is structural proof rather than
load-bearing — but it forecloses divergence if the production path ever
switches to the narrow models directly.

### 3.4 Format-string ergonomics

`YamlDataParameter` and `YamlDataCollectionParameter` accept the XML-style
comma-separated `format: "txt,tabular"` form via a `field_validator`:

```python
def _split_format(v):
    if isinstance(v, str):
        return [ext.strip().lower() for ext in v.split(",") if ext.strip()]
    return v
```

This is the only deliberate XML-syntax compatibility shim in the narrow
schema; it normalizes before strict validation rather than relaxing it.

## 4. The supporting source-level types

The base model pulls in further strict types from `tool_source.py`:

| Type | Strictness | Notes |
| --- | --- | --- |
| `ContainerRequirement`, `JavascriptRequirement`, `ResourceRequirement` | `ToolSourceBaseModel` | discriminated union under `requirements:` |
| `Citation` | strict | tool citation list |
| `HelpContent` | strict | the `help:` block |
| `XrefDict` | TypedDict | `id`/`type` |
| `YamlTemplateConfigFile` | strict | `configfiles:` (#20761 enabled this) |
| `IncomingToolOutput` (in `tool_outputs.py`) | strict | each `outputs[*]` entry |
| `FieldDict` (TypedDict, `closed=True`) | strict | data/collection refs in tests |

`tool_source.py` line 178 marks the data/collection reference TypedDicts
with `@with_config(ConfigDict(extra="forbid"))` — so even the JSON-shaped
`{class: File, location: …}` test inputs reject unknown keys. This
matters for the YAML test format (§5).

## 5. Validation at the edges of the source document

Two source-level surfaces are not the input/output bodies but still
deserve validation:

### 5.1 The `tests:` block

Tests live inside the same source document and have their own model
(`YamlToolTest`). PR #21828 added `value_state_representation = "test_case_json"`
in `lib/galaxy/tool_util/parser/yaml.py:430` — test inputs are validated
as structured JSON (against the parameter model) before being flattened
into the pipe-delimited form the legacy test framework consumes.

The flatten step is one direction only; if the structured validation
passes, the flat form is generated mechanically. The implication for
source validation: a YAML test that passes structured validation is
guaranteed to have a representable flat form, but the reverse is not true.

PR #22566 ("Tighten the workflow test schema") extends the same
strictness to the workflow-test format, working toward unification with
the Planemo workflow-test schema.

### 5.2 The serialization roundtrip

`lib/galaxy/tool_util/parser/yaml.py:363-365` redefined `to_string()` as
`json.dumps(self.root_dict, ...)` *without mutating* `self.root_dict`.
The unit test `test_tool_serialization_roundtrip.py` enforces the
invariant: a YAML tool that parses must serialize back to the same dict.

This is a different kind of validation — it doesn't reject anything, it
asserts that the parser is purely a validator and not a transformer.
That property is what lets the database store `model_dump(by_alias=True)`
and have the editor render the same document the user submitted.

### 5.3 Profile bump

`parse_profile` (parser/yaml.py:348-349) returns `"24.2"` when no profile
is set. Pre-24.2 YAML tool documents either explicitly set `profile:` or
load against the tightened schema. The narrowing of #22507 is gated by
this — older-profile YAML tools may still encounter the post-#22507
schema.

(Open: see §9 question on legacy profile behavior.)

## 6. From POST to row — the source-side request

The source travels through one validated boundary on its way to storage.
`POST /api/unprivileged_tools` accepts:

```python
class DynamicUnprivilegedToolCreatePayload(DynamicToolCreatePayload):
    src: Literal["representation"] = "representation"
    representation: UserToolSource    # the strict authoring schema
```

`lib/galaxy/managers/tools.py:189-210` implements `create_unprivileged_tool`:

```python
def create_unprivileged_tool(self, user, tool_payload):
    if not getattr(self.app.config, "enable_beta_tool_formats", False):
        raise ConfigDoesNotAllowException(...)
    self.ensure_can_use_unprivileged_tool(user)         # role check
    dynamic_tool = self.create(
        tool_format=tool_payload.representation.class_,
        tool_id=tool_payload.representation.id,
        tool_version=tool_payload.representation.version,
        active=tool_payload.active,
        hidden=tool_payload.hidden,
        value=tool_payload.representation.model_dump(by_alias=True),
        public=False,
        flush=True,
    )
    session.add(UserDynamicToolAssociation(
        user_id=user.id, dynamic_tool_id=dynamic_tool.id,
    ))
```

Three observations about source validation at the manager:

1. **The Pydantic model is the schema gate.** By the time the manager
   sees `tool_payload`, FastAPI / the API layer has already coerced and
   validated through `UserToolSource`. The manager does not re-parse;
   it stores the validated dump.
2. **Authorization is a non-schema gate.** `enable_beta_tool_formats`
   and the `Custom Tool Execution` role are checked here, in addition
   to the schema. These are concerns the schema can't express.
3. **`model_dump(by_alias=True)` round-trips.** The stored value uses
   `class:` (not `class_:`) so the round-trip back to `UserToolSource`
   is direct.

## 7. Source validation in the test corpus

Two test surfaces specifically target source validation:

### 7.1 `test_user_tool_source_fixtures.py`

`test/unit/tool_util/test_user_tool_source_fixtures.py` validates *every*
YAML tool fixture in `test/functional/tools/` against the narrow
authoring schema. The header explains the gap it closes:

> The existing `test_validate_framework_test_tools` in
> `test_parameter_test_cases.py` only exercises the XML-era
> `YamlToolSource` dict parser path; it does not touch the narrow
> pydantic authoring schema in `yaml_parameters.py`. This file closes
> that gap so a stray XML-only field (e.g. `truevalue`) or a deferred
> parameter type added to any fixture fails a cheap unit test instead
> of only an API integration.

It uses `TypeAdapter(DynamicToolSources)` directly, so the discriminated
union is exercised. A small set of legacy fixtures is excluded (they use
constructs like `checked`, `display`, `blocks`, `when`, dict-style
collection outputs that the narrow schema deliberately rejects).

### 7.2 `parameter_specification.yml`

`test/unit/tool_util/parameter_specification.yml` is the exhaustive
valid/invalid corpus for every scalar and collection parameter type. PR
[#22362](https://github.com/galaxyproject/galaxy/pull/22362) wired this
corpus through *both* the Pydantic models and the generated JSON Schema:

> The Pydantic models are stronger assertions on the state but inherently
> less cross-platform and less portable — there is a lot of value in
> allowing both options and testing both options.

For source validation specifically, this means: every parameter shape an
LLM could plausibly generate has a tested accept/reject case in both the
Pydantic model and the JSON Schema. A schema regeneration that drifts
from Pydantic is caught by CI.

### 7.3 Fixture set

`test/functional/tools/parameters/` carries 14 collection-type tool
definitions and 4 scalar/YAML user-tool definitions
(`gx_boolean_user`, `gx_data_user`, `gx_data_multiple_user`,
`gx_select_multiple_one_default_user`). These are the canonical "agent
should be able to write something like this" examples.

### 7.4 `user_tool_source_validation_cases.yml`

PR #22615 added `test/unit/tool_util/user_tool_source_validation_cases.yml`
(184 lines) as a third external corpus. Each case is an overlay on a
`VALID_TOOL` baseline; `test_user_tool_source_validation.py` applies it
and asserts either valid construction or a `ValidationError` whose
`code` set matches `expected_errors`. One case
(`format_validation_errors_distillation`) pins the exact distilled
bullet output as documentation of the helper's format.

The same "external corpus + python harness" design as
`parameter_specification.yml` — the corpus is portable to
`galaxy-tool-util-ts`, MCP clients, or IDE plugins that need to
re-implement validation without depending on Galaxy's pydantic models.

## 8. The agent authoring surface

The validation work on the YAML source matters most when the source is
machine-generated. The MCP entry point at
`lib/galaxy/webapps/galaxy/api/mcp.py:451-506` accepts the same
`representation: dict[str, Any]`, hands it to
`OperationsManager.create_user_tool` (`agents/operations.py:900`), which
constructs a `DynamicUnprivilegedToolCreatePayload(src="representation",
representation=representation)` and calls into the manager. The Pydantic
gate runs at payload construction.

### 8.1 The docstring as part of the validation surface

The MCP docstring carries the validation knowledge a tagged-union error
message can't:

```python
@mcp.tool()
def create_user_tool(representation, api_key, ctx) -> ...:
    """Create a user-defined tool in Galaxy from a YAML tool definition.
    ...
    Required fields:
      - class: "GalaxyUserTool" (exactly this string)
      - id: tool identifier (lowercase, no spaces, 3-255 chars)
      - version: version string (e.g. "0.1.0")
      - name: display name
      - container: container image as a STRING (e.g. "python:3.12-slim"),
        NOT a dict -- this is a common mistake
      - shell_command: ..., with $(inputs.name.path) for data inputs
      - inputs: list of input dicts, each with "name" and "type"
        (type can be: "data", "integer", "float", "text", "boolean")
      - outputs: list of output dicts, each with "name", "type": "data",
        "format" (e.g. "tabular", "vcf", "bed"), and "from_work_dir"
    ...
    """
```

The "container must be a STRING, NOT a dict" hint is the docstring
encoding what the schema rejects but cannot easily *suggest*. Pydantic's
"input should be a valid string" error is correct but doesn't tell the
agent that `container: {image: …}` is the failure pattern it just
generated.

PR [#22627](https://github.com/galaxyproject/galaxy/pull/22627) (open) is
beefing up MCP tool docstrings with workflow guidance — the same idea,
applied broader. Worth thinking about whether the docstring hints should
derive from Pydantic field examples and descriptions automatically, so
they can't drift from the schema. Today they live in a parallel string.

### 8.2 Two MCP servers, one schema contract

PR #22625 PR body:

> The standalone galaxy-mcp server has grown four user-defined-tool (UDT)
> tools — create, list, delete, run — that the in-process MCP server
> exposed at /api/mcp didn't have. This adds them, so an agent talking to
> the built-in MCP can manage UDTs through the same surface as the
> external server.

Both servers route through `DynamicToolManager.create_unprivileged_tool`,
so the schema validation contract is enforced at the manager, not the MCP
layer. An agent that learns the schema against either server can target
both.

PR [#20990](https://github.com/galaxyproject/galaxy/pull/20990) ("Pydantic
ai user defined tools" — CLOSED) was the earliest visible prototype,
demonstrated at European Galaxy Days. The validation maturity of the YAML
source schema is what made the production form (#21942 → #22625) viable
— pre-#22507 an LLM could generate `truevalue: yes` on a boolean param,
load the tool fine, and then watch it silently misbehave.

### 8.3 Schema externalization

The narrow schema is exported as JSON Schema in
`client/src/components/Tool/ToolSourceSchema.json` for Monaco. After
#22507 the file grew substantially, which the author flagged. Tracking,
not yet a problem.

The same JSON Schema is what an external agent vendor would need to
target, but it lives inside the client bundle today rather than at a
documented public path. (Open: see §9.)

## 9. What's still loose

### 9.1 Schema-expressible gaps

- **Output collection schema** is partial. PR #21828 PR body claimed YAML
  tools produce output collections, but `_parse_test` in
  `parser/yaml.py:423` still hard-codes `output_collections = []` with a
  `TODO`. The `IncomingToolOutput` model accepts collection-shaped
  outputs, but the test-validation path doesn't yet honor them.
- **Configfiles** (#20761) have a strict model (`YamlTemplateConfigFile`)
  but the surface is narrower than the XML equivalent — secondary
  features (e.g. dynamic file source-driven config files) need an audit
  against `FileSourceConfigFile`.
- **Credentials parameters** validate via TypeAdapter (#21828 follow-ups
  `d3c37a26e1`, `0151cb50d8`, `bc32fa1c71`), but the source-level
  schema's constraint that credentials may only be referenced from
  approved JS contexts is not in the model — it's runtime-only.
- **`format_source: <input_name>`** resolution. The referenced input
  name is still accepted unchecked by the narrow models — only
  `shell_command` and `configfiles[*].content` got the parse-time
  reference scan in #22615. A cross-field validator on
  `_DynamicToolSourceBase` could close this sibling gap.
- **Nested `$(inputs.<a>.<b>)` references.** PR #22615's
  `_check_input_refs` lands the top-level case (an undeclared
  `inputs.foo` in `shell_command` or `configfiles[*].content` now fails
  at parse time), but the design explicitly only walks the top-level
  identifier — a typo in the *section* name of `inputs.cond.test_param`
  is caught (the section doesn't exist), but a typo in the *child* name
  of a declared section is not. Computed/aliased ECMAScript
  (`var x = inputs; x.foo`) is also an accepted false negative.

### 9.2 Schema-synchronization gaps

- **`ToolSourceSchema.json` regeneration.** Is it CI-gated? If a Pydantic
  model drifts from the bundled JSON, does anything fail loudly? Worth
  verifying.
- **Public JSON Schema URL.** External agent vendors who want to validate
  before POSTing have to extract the schema from the client bundle.
  Documenting a stable public path would close the loop for agent
  authoring.
- **MCP docstring drift.** The "common mistake" hints in
  `create_user_tool` encode validation knowledge that lives nowhere else.
  #22627 expands this. Long-term, hint generation from Pydantic
  `examples=` / `description=` would prevent drift.
- **`PydanticJsonSchemaWarning` silencing.** `33f829fb33` was a one-off
  on the recursive collection element union. Recurrence should fail CI
  loudly rather than be silenced again.

### 9.3 Authorization gaps that intersect the source

The schema gates the *shape* of the source, not its rights. Two open
questions live at this boundary:

- **Embedded-in-workflow copies.** When a workflow embedding a UDT is
  imported, does the imported copy revalidate against the current
  `UserToolSource` schema, or does it pass through with whatever shape
  was stored at export time? If the source schema tightens (as in
  #22507), older embedded tools may fail to load.
- **Per-user `get_unprivileged_tool_by_uuid`.** PR #22625 noted the
  asymmetry — `deactivate_unprivileged_tool` flips the per-user
  association, but the resolver doesn't filter by it. The source is
  valid; the access control is not where the schema can reach.

## 10. Recommendations

In priority order:

1. **Document a public JSON Schema URL.** The schema is generated from
   Pydantic and tested via #22362. Publishing it externally closes the
   agent-authoring loop and fixes the "extract it from the client
   bundle" workaround.
2. **CI-gate `ToolSourceSchema.json` regeneration.** A Pydantic-side
   change that doesn't propagate to the client bundle should fail CI.
3. **Cross-field validators on `_DynamicToolSourceBase`.** Partially
   landed in PR #22615: `_check_input_refs` catches undeclared
   top-level `$(inputs.foo)` in `shell_command` and
   `configfiles[*].content`, and `_check_output_claims` enforces
   `from_work_dir` / `discover_datasets` on outputs. Still pending:
   `format_source: <input_name>` reference validation, and nested-
   identifier walking (typos *inside* declared conditionals/sections).
4. **Finish output-collection validation.** Replace the hard-coded
   `output_collections = []` with structured validation against
   `IncomingToolOutput`.
5. **Generate MCP docstring hints from Pydantic.** Pull the "container
   must be a STRING" class of hints from field examples / descriptions
   so the docstring and the schema can't drift.
6. **Audit re-validation on workflow-import.** Decide explicitly whether
   embedded UDT copies revalidate against the current schema.

## 11. Unresolved questions

- Is the JSON Schema published anywhere agent vendors can find it, or
  must they extract `client/src/components/Tool/ToolSourceSchema.json`?
- Does CI fail when the bundled `ToolSourceSchema.json` drifts from
  Pydantic? If not, what catches the drift?
- Pre-24.2-profile YAML tools — do they validate against the narrowed
  schema, or does an older code path apply? #22507 narrowed the schema;
  legacy profiles are a known edge.
- Is the `to_internal()` round-trip in `yaml_parameters.py` exercised in
  tests beyond the fixture corpus? It's structural proof now, but the
  proof is only useful if it's run.
- Does workflow-import revalidate the embedded UDT against the current
  `UserToolSource` schema, or pass through?
- Is there a per-user or per-session rate limit on `create_user_tool`?
  #20990 prototype flagged "requests need to be rate limited" — has that
  followed through?
- For `format_source: <input_name>` and `$(inputs.foo)` references,
  parse-time vs. runtime: what's the policy, and is it consistent
  between XML and YAML?
- The discriminated-union error messages from Pydantic for nested
  conditionals (`YamlConditionalParameter` → `whens[*].parameters[*]`)
  — are they actually usable for an agent debugging its own output?
  Worth a small UX-of-errors audit.
- `extra="forbid"` rejects unknown top-level keys. Are there extension
  points (e.g. `metadata:`, `x-galaxy-...`) that *should* be permissive
  for forward-compatibility? Today the answer is no.

