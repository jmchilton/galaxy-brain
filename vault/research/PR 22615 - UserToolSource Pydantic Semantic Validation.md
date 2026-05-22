---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/tools/yaml
  - galaxy/agents
  - galaxy/api
github_pr: 22615
github_repo: galaxyproject/galaxy
component: User-Defined Tools - Source Validation
status: draft
created: 2026-05-22
revised: 2026-05-22
revision: 1
ai_generated: true
sources:
  - https://github.com/galaxyproject/galaxy/pull/22615
summary: "Pushes id pattern, blank-field, citation DOI/BibTeX, input-ref, and output-claim checks onto UserToolSource pydantic validators benefiting agent and API"
related_prs:
  - 22611
  - 19434
  - 21434
  - 21828
  - 22507
related_notes:
  - "[[Component - User-Defined Tool Source Validation]]"
  - "[[Component - User-Defined Tools]]"
  - "[[PR 19434 - User Defined Tools]]"
  - "[[PR 21434 - AI Agent Framework and ChatGXY]]"
  - "[[Component - Agents Backend]]"
  - "[[Dependency - Pydantic Dynamic Models]]"
---

# PR 22615 - UserToolSource Pydantic Semantic Validation

> Verified against `origin/dev` at SHA `3c1a7eda52`. Merged 2026-05-21
> (`e0a81dea83`) by mvdbeek.

## 1. Summary

Moves semantic checks for user-defined tool YAML out of the
`CustomToolAgent` post-validate pass (PR #22611, abandoned) and onto
pydantic `field_validator` / `model_validator` hooks on
`_DynamicToolSourceBase`, `UserToolSource`, and `Citation`. The new
gates: tool-id regex, blank `name` / `version` / `container` rejection,
DOI/BibTeX citation shape, undeclared-`inputs.<name>` reference detection
in `shell_command` + `configfiles[*].content`, and an output-claim
requirement (`from_work_dir` or `discover_datasets`) replacing the old
"name appears in command" heuristic. Container *image shape* (quay.io/
biocontainers, docker://, oras://, docker-hub) moves to a new
`ContainerImageShape` linter wrapped by `lint_user_tool_source`, invoked
from both `DynamicToolManager.create_tool` and `CustomToolAgent`. A
helper `format_validation_errors` distills `ValidationError.errors()` to
friendly bullets; the agent walks `UnexpectedModelBehavior.__cause__` to
surface the underlying `ValidationError` as a low-confidence response
that feeds the producer/critic retry loop landed shortly after in
`948dd06479`.

## 2. Context - #22611 superseded

PR [#22611](https://github.com/galaxyproject/galaxy/pull/22611)
("Validate generated UserToolSource semantically before returning it")
is **closed, not merged** - the same author's earlier attempt at the
same problem, scoped to a post-validate pass inside `CustomToolAgent`.
The PR body's "Takes the validation in #22611 and moves it into the
pydantic models" framing is more accurate read as #22615 *replaced* the
#22611 design wholesale: the checks now run during pydantic model
construction, so every consumer of `DynamicUnprivilegedToolCreatePayload`
(the `/api/unprivileged_tools` endpoint, the in-process MCP, the
standalone `galaxy-mcp`, and the `CustomToolAgent`) gets them
automatically.

This continues the trajectory traced in
[[Component - User-Defined Tool Source Validation]]: harden the pydantic
authoring schema so a "looks valid, isn't honored" YAML can't reach the
runtime.

## 3. The pydantic validators

All in `lib/galaxy/tool_util_models/__init__.py` at the verified SHA.

### 3.1 Tool id regex

```python
TOOL_ID_PATTERN = r"^[a-z][a-z0-9_-]*$"   # line 82
```

Wired into the field as `Field(pattern=TOOL_ID_PATTERN)` on
`_DynamicToolSourceBase.id` (line 140). Hyphens are now allowed; the
prior MCP docstring said "lowercase, no spaces" but never enforced it.
The compiled `_TOOL_ID_RE` is defined but the field-level `pattern`
argument is the enforcement point.

`name` also gains `min_length=5` (line 148).

### 3.2 Blank-required-field rejection

```python
@field_validator("name", "version", mode="after")   # lines 198-206
def _reject_blank_strings(cls, v): ...
```

Raises `PydanticCustomError("dynamic_tool.blank_string", ...)` on
whitespace-only strings. `UserToolSource._reject_blank_container`
(lines 280-288) adds the same gate for the `UserToolSource`-required
`container` field.

### 3.3 Undeclared `inputs.<name>` references

```python
_TEMPLATE_BLOCK_RE = re.compile(r"\$\((.*?)\)", re.DOTALL)           # line 92
_INPUTS_REF_RE     = re.compile(r"\binputs\.([A-Za-z_][A-Za-z0-9_]*)") # line 93
```

`_check_input_refs` (`model_validator(mode="after")`, lines 208-223)
parses every `$(...)` block in `self.shell_command` and each
`configfile.content`, then diffs the extracted `inputs.<name>` references
against the declared input names. Error code
`dynamic_tool.undeclared_input_ref`.

**Intentionally shallow.** Only the top-level identifier is checked - a
comment explicitly notes that `inputs.cond.test_parameter` resolves
against the top-level `inputs.cond` and that computed/aliased ECMAScript
(`var x = inputs; x.foo`) is accepted as a false negative.

### 3.4 Output-claim requirement

```python
@model_validator(mode="after")     # lines 225-246
def _check_output_claims(self): ...
```

For each output: datasets must declare `from_work_dir` or
`discover_datasets`; collections must declare
`structure.discover_datasets`. Raises
`PydanticCustomError("dynamic_tool.output_unclaimed", ...)`.

Replaces the old "name appears in command" heuristic that produced both
false positives (a tool that happened to mention an output name in the
command without actually writing it) and false negatives (a tool that
wrote `outputs.tsv` via a literal but didn't name-substitute).

**Scope nuance.** The validator lives on `_DynamicToolSourceBase`, and
`shell_command` is declared as a required `str` on the base (line 167).
So the rule applies to both `UserToolSource` and `YamlToolSource` - the
PR body's "tool with `shell_command`" framing reads as if it were
conditional, but in the model both subclasses always have one.

### 3.5 Citation shape

`lib/galaxy/tool_util_models/tool_source.py`:

```python
DOI_RE    = re.compile(r"^10\.\d{4,9}/.+$")             # line 152
BIBTEX_RE = re.compile(r"^@[a-zA-Z]+\s*\{", re.MULTILINE) # line 154

@model_validator(mode="after")     # lines 161-192
def _check_citation_shape(self): ...
```

Empty content rejected (`dynamic_tool.citation_empty`). `type=doi`
must match `DOI_RE` (`citation_doi_invalid`); `type=bibtex` must match
`BIBTEX_RE` (`citation_bibtex_invalid`); unknown types report
`citation_unrecognized`.

### 3.6 Canonical-order serializer

`UserToolSource._canonical_order` (`model_serializer(mode="wrap")`,
lines 290-310) emits fields in a fixed order defined by
`_CANONICAL_FIELD_ORDER` (lines 258-278): `class_, id, name, version,
description, container, requirements, shell_command, configfiles, inputs,
outputs, citations, license, profile, edam_operations, edam_topics,
xrefs, help, tests`. Unknown keys land at the tail via `ordered.update(data)`.
Honors `info.by_alias` so `class_` round-trips back to `class`. Used by
both direct `model_dump` calls and nested serialization inside
`UnprivilegedToolResponse`.

## 4. Container shape moved to a linter

The PR body's intro lists "container shape" alongside the pydantic
moves, but **commit `4e1f1afadc` within the PR pivoted** the shape check
to a `Linter`. Only blank-container rejection stayed on the pydantic
model.

`lib/galaxy/tool_util/linters/containers.py` (new, 54 lines):

```python
CONTAINER_PREFIXES = ("quay.io/biocontainers/", "docker://", "oras://")   # line 21
DOCKER_IMAGE_RE    = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]*"
                                r"(/[a-zA-Z0-9._-]+)*(:[\w][\w.-]*)?$")    # line 22

class ContainerImageShape(Linter):
    lint_tool_types = ["*"]
    # emits lint_ctx.warn(...) for any container identifier not matching either rule
```

Reaches identifiers via `tool_source.parse_requirements()` (5-tuple),
defensively wrapped in `try/except Exception` (line 26) so non-YAML tool
sources can't crash the linter.

## 5. `lint_user_tool_source` + `NETWORK_LINTERS` skip

`lib/galaxy/tool_util/lint.py:313-335`:

```python
NETWORK_LINTERS = ("BioToolsValid", "EDAMTermsValid")   # line 316

def lint_user_tool_source(user_tool_source):
    root_dict   = user_tool_source.model_dump(by_alias=True, exclude_none=True)
    tool_source = YamlToolSource(root_dict)
    lint_ctx    = get_lint_context_for_tool_source(
        tool_source, skip_types=list(NETWORK_LINTERS),
    )
    return error_messages + warn_messages   # "<linter>: <message>" bullets
```

The `NETWORK_LINTERS` skip is what makes the lint pass acceptable on
the interactive create/edit path - third-party API calls would
otherwise block tool save.

The helper is reused twice:

| Caller | Trigger |
| --- | --- |
| `lib/galaxy/managers/tools.py:190-195` | `DynamicToolManager.create_tool` (API path) - raises `RequestParameterInvalidException` on lint errors |
| `lib/galaxy/agents/custom_tool.py:233` | `_produce_tool` inside the agent producer loop - feeds the retry loop |

## 6. `CustomToolAgent` integration

`lib/galaxy/agents/custom_tool.py`:

```python
def _find_validation_error(exc):     # lines 43-55
    seen = set()
    while exc is not None and id(exc) not in seen:
        seen.add(id(exc))
        if isinstance(exc, ValidationError):
            return exc
        exc = getattr(exc, "__cause__", None) or getattr(exc, "__context__", None)
    return None
```

The PR's original simple `except UnexpectedModelBehavior` handler in
`process()` was restructured by follow-up
[`948dd06479`](https://github.com/galaxyproject/galaxy/commit/948dd06479)
("Add producer/critic reflection loops to CustomToolAgent", Dannon Baker,
2026-05-01). The PR-introduced symbols all survive and now flow through
the new `_produce_tool` seam:

1. `extract_structured_output(...)` returns a candidate `UserToolSource`,
   wrapping any pydantic `ValidationError` as
   `UnexpectedModelBehavior.__cause__`.
2. `_find_validation_error` walks the cause chain to recover the
   original `ValidationError`.
3. `format_validation_errors(exc)` distills it to friendly bullets.
4. `lint_user_tool_source(tool)` adds linter errors (container shape,
   etc.) on top.
5. Either set of errors short-circuits and feeds the producer reflection
   retry, with the bullets prepended to the next-turn prompt.

`log.debug(...)` (not `warning`) is used throughout - the PR is explicit
that validation failure is the expected path while a user is editing.

## 7. `format_validation_errors`

`lib/galaxy/tool_util_models/__init__.py:106-119`. Returns
`List[str]` of `"<dotted.loc>: <msg>"` per error (or just `<msg>` for
model-level errors).

**Cross-check vs PR body.** The body says "for reuse by the agent and
API layers". At HEAD only `lib/galaxy/agents/custom_tool.py:27,243`
calls it. `lib/galaxy/managers/tools.py` instead invokes
`lint_user_tool_source` (which returns already-formatted bullets from
the linter framework) and lets FastAPI's default 422 handler render
pydantic `ValidationError` on the request-parse path. So the *validators*
benefit both API and agent, but the *friendly bullet helper* is
agent-only at HEAD. Worth tracking - either the PR body is slightly
aspirational, or a follow-up is planned to swap the API's
`RequestParameterInvalidException("Tool failed lint checks: ...")` body
for a structured response that reuses the helper.

## 8. Client schema regeneration

- `client/src/components/Tool/ToolSourceSchema.json` - regenerated for
  the new `pattern` + `min_length`.
- `client/packages/api-client/src/schema/schema.ts` - regenerated.
- `client/src/components/Tool/YamlJs.ts` - ~96-line addition, likely
  JSON-Schema / Monaco yaml plumbing for the new constraints. Not deep
  dived.

This continues the schema-externalization story in
[[Component - User-Defined Tool Source Validation]] §8.3 - the bundled
JSON Schema is what Monaco / the tool editor / external MCP clients
target, so a pydantic-side tightening only lands for end users once the
client bundle is regenerated.

## 9. Tests

All present at SHA `3c1a7eda52`. Not run as part of dossier prep.

| Path | Shape |
| --- | --- |
| `test/unit/tool_util/test_container_shape_lint.py` (new, 78 lines) | Tests `ContainerImageShape` against valid/invalid identifiers + `lint_user_tool_source` round-trip on a `UserToolSource`. |
| `test/unit/tool_util/test_user_tool_source_validation.py` (new, 103 lines) | Parametrized - loads YAML cases, overlays on a `VALID_TOOL` baseline, asserts either valid construction or `ValidationError` with matching `code`s. One case (`format_validation_errors_distillation`) pins the exact distilled bullet output. |
| `test/unit/tool_util/user_tool_source_validation_cases.yml` (new, 184 lines) | External corpus of validator cases - designed for re-use by `galaxy-tool-util-ts`, MCP clients, IDE plugins. |
| `test/unit/tool_util/test_tool_linters.py` (+1/-1) | Registry update for `ContainerImageShape`. |
| `test/unit/tool_util_models/test_user_tool_source_response.py` (+1) | Likely the canonical-order serializer. |

The YAML-corpus pattern follows the same external-corpus design
[[Component - Tool State Specification]] introduced and [[PR 22507 - Narrow YAML Schema]]-era work extended.

## 10. Follow-ups after merge

Diff range `e0a81dea83..3c1a7eda52`:

- **`948dd06479`** "Add producer/critic reflection loops to
  `CustomToolAgent`" (Dannon Baker, 2026-05-01). +325/-131 on
  `lib/galaxy/agents/custom_tool.py`, adds
  `lib/galaxy/agents/prompts/custom_tool_critic.md` and
  `test/unit/app/test_agents.py`. Builds on #22615 by feeding the
  formatted validation/lint bullets into a producer reflection retry
  (default on, one re-roll) and adding an opt-in quality critic + refine
  loop. PR-introduced symbols (`_find_validation_error`,
  `format_validation_errors`, `lint_user_tool_source`) all survive.

No other follow-ups touch any of the PR's load-bearing files between
merge and HEAD.

`8336c80ac3` "Prompt: document discover_datasets alongside from_work_dir"
lives outside the file set but is plausibly aligned with §3.4 - updating
the producer prompt to match the new `_check_output_claims` rule.

## 11. Cross-checks against PR body

| Claim | Status |
| --- | --- |
| Tool id pattern `[a-z][a-z0-9_-]*`, hyphens allowed | Confirmed (line 82). |
| `from_work_dir` / `discover_datasets` required for `shell_command` outputs | Confirmed; **scope broader than implied** - applies to both `UserToolSource` and `YamlToolSource` because `shell_command` is required on the base. |
| `format_validation_errors` reused by agent and API | **Partial.** Agent yes; API uses `lint_user_tool_source` + FastAPI's 422 handler, doesn't call the helper. |
| `_DynamicToolSourceBase`, `UserToolSource`, `Citation` validators present | Confirmed. |
| Undeclared `inputs.<name>` reference detection in `shell_command` + `configfiles[*].content` | Confirmed; intentionally top-level-only. |
| #22611 is the source of the validation logic being moved | **Misleading.** #22611 is closed/abandoned, not merged. #22615 supersedes it by relocating the design to the pydantic model. |
| Container shape moved to pydantic | **Wrong - moved to a linter** (`ContainerImageShape`). Only blank-container rejection stayed on the model. |

## 12. Unresolved questions

- Pre-existing `DynamicTool.value` rows whose `id` contains uppercase or
  other characters newly disallowed by `TOOL_ID_PATTERN`. Does
  `lift_user_tool_source` (`__init__.py:387`) ever strip/coerce an `id`?
  Reading the lift helper suggests it only handles `extra_forbidden`
  errors, so a non-matching id would land in `("invalid", ...)`. What
  does the endpoint return for an "invalid" stored tool?
- Are the validation error messages user-facing in the tool editor UI?
  Closing-area commit `e11d8061c3` ("Surface UserToolSource validation
  errors in the tool editor") suggests yes - client-side rendering path
  not traced here.
- `format_validation_errors` is documented as "reused by agent and API"
  but only the agent calls it at HEAD. Drift in the PR body, or a
  planned follow-up?
- The undeclared-input check is intentionally shallow (top-level
  identifier only). Are there real-world tools with nested
  `inputs.section.field` references where a typo in the section name
  would now be a false negative? Validation corpus only covers
  top-level typos.
- `_CANONICAL_FIELD_ORDER` forward-compat: when a future field is added,
  the `ordered.update(data)` tail puts unknown keys at the end. Field
  insertion among existing keys would cause client diff churn. Is this
  intentional?
- `NETWORK_LINTERS` skip: does `planemo` / CLI lint still hit
  `BioToolsValid` / `EDAMTermsValid`? Confirmed skip for
  `lint_user_tool_source` (interactive) only; CLI lint is a separate
  entry point.
