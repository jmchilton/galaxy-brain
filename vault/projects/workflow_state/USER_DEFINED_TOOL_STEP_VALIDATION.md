# User-Defined Tool Step Validation in `workflow_state`

**Date:** 2026-05-22
**Branch:** `wf_tool_state`
**Companion docs:**
- [[CURRENT_STATE]] — package overview at this branch
- [[../research/PR 19434 - User Defined Tools]] — UDT runtime
- [[../research/Component - User-Defined Tool Source Validation]] — source schema
- [[../research/PR 22615 - UserToolSource Pydantic Semantic Validation]] — pydantic gate
- [[../research/Component - YAML Tool Runtime]] — runtimeify

---

## 1. Problem

In a running Galaxy, a user-defined tool (UDT, `class: GalaxyUserTool`) looks indistinguishable from a regular tool to the workflow editor — the step carries a `tool_uuid`, the editor resolves the UUID against the per-user `DynamicTool` table, and the form/connection logic uses the parsed parameter model the same way it would for a ToolShed tool. The dynamic-tool table is the resolver.

Our offline CLI stack has no such resolver. `GetToolInfo` (`lib/galaxy/tool_util/workflow_state/_types.py:32-35`) looks tools up by `(tool_id, tool_version)`, the implementations (`ToolShedGetToolInfo`, `CombinedGetToolInfo`) hit the Tool Shed 2.0 API or a configured Galaxy. UDTs are not in either — they live only in `dynamic_tool.value` on the originating Galaxy, scoped to the creating user.

Galaxy's own workflow exporter does the right thing: when a step has a `dynamic_tool`, it inlines the full tool YAML into `step_dict["tool_representation"]` and clears `tool_id` / `tool_uuid` / `content_id` (`lib/galaxy/managers/workflows.py:1713-1721`). gxformat2 round-trips that field (native `tool_representation` ↔ format2 `run: GalaxyUserToolStub`, `gxformat2/normalized/_conversion.py:581-644`, `gxformat2/schema/native_strict.py:354`). So **the workflow document is self-contained** — the resolver gap is purely on our side.

### 1.1 Current `workflow_state` behavior on a UDT step

UDT steps are **silently skipped** today, producing false-negative passes:

- `validation_native.get_parsed_tool_for_native_step` (`validation_native.py:65-70`): `tool_id = step_tool_id(step); if not tool_id: return None`. With `tool_id=None`, validation returns nothing and the step is treated as un-validatable. No diagnostic.
- `validation_format2.validate_step_format2` (`validation_format2.py:69-73`): same `if not tool_id: return` short-circuit. The `step.run` payload (which is a `GalaxyUserToolStub` for UDTs) is never inspected.
- `connection_graph._resolve_tool_step` (`connection_graph.py:190-208`): wraps `get_tool_info(...)` in `if step.tool_id:` — a `None` tool_id resolves to a `ResolvedStep` with no input/output type info, so any connection consuming a UDT output cannot be type-checked.
- `cache.populate_workflow` would attempt to fetch each step's `tool_id` from ToolShed; a UDT-only workflow would just be a no-op (good outcome by accident).
- `lint_stateful` runs gxformat2's structural lint plus state validation; the state path skips UDT steps as above. No lint of the inline `UserToolSource`.
- `precheck_native_workflow` / `legacy_encoding.py` were not designed to look at `tool_representation` and currently don't.

The result: a workflow that embeds a broken `UserToolSource` (undeclared input refs, blank version, missing output claim, malformed citation, weird container shape, …) passes `gxwf-state-validate --strict-state` clean. Any downstream consumer — VS Code, [[PROBLEM_AND_GOAL|IWC lint-on-merge (D7), the gxformat2 IWC migration (D10)]] — inherits the false negative.

## 2. Goal

Make every workflow_state operation that resolves a tool also resolve UDT (and admin dynamic-tool) steps from their inline `tool_representation`, so a workflow that embeds a UDT is validated, lint-checked, connection-checked, and round-tripped with the same rigor as one that references a ToolShed tool. **A workflow that POSTs cleanly through `/api/unprivileged_tools` should pass `gxwf-state-validate`; a workflow that does not, should fail.**

Concretely:

1. **Resolve** — produce a `ParsedTool` from `step.tool_representation` (or format2 `step.run`) without touching the network.
2. **Validate the source** — run the `UserToolSource` / `YamlToolSource` pydantic gate plus `lint_user_tool_source` against the embedded YAML, surfacing the same friendly bullets PR #22615 introduced.
3. **Validate the state** — feed the locally parsed tool through the existing native / format2 state validators.
4. **Validate connections** — extend the connection graph so UDT outputs carry their declared formats and feed downstream type checks.
5. **Round-trip** — confirm `tool_representation` survives `native → format2 → native` with no diff (gxformat2 already does this; lock with a fixture).
6. **Export schemas** — `galaxy-tool-cache` learns to emit `WorkflowStepToolState` JSON Schemas for inline UDTs, so the JSON-Schema validation backend and VS Code can validate UDT step state without a tool cache.

## 3. Non-goals

- **Editing UDTs from `gxwf`.** This plan is read-only over the embedded representation; authoring UX stays in the Monaco-based UI / MCP surface.
- **Cleaning `tool_representation`.** `state-clean` operates only on `step.tool_state`, never on the embedded tool source. The source is an authoring artifact; revalidation reports drift, the cleaner does not rewrite it.
- **Admin dynamic tools (`class: GalaxyTool`).** They use the same `tool_representation` field but the looser `YamlToolSource` schema; workflows almost never embed them in practice. This plan handles only `class: GalaxyUserTool`. A `class: GalaxyTool` inline step is detected and surfaced as an `inline_source_unsupported` warning (skipped from validation/lint), not silently passed.
- **Resolving UDTs across workflows by UUID.** Each workflow's embedded copy is canonical. We do not attempt to look up `tool_uuid` against an external store.
- **Backfilling pre-export `dynamic_tool` references.** A `.ga` whose UDT step has only `tool_uuid` set but no `tool_representation` is broken-on-export; we surface that as a structural error, not silently materialize the tool.
- **Workflow execution.** `runtimeify` and the `to_cwl` shortcut are runtime concerns; we only validate the *source* and *workflow shape*.
- **Tool-side caching of inline representations.** They live in the workflow doc — re-parse on demand; no second cache.

## 4. Background — the discriminator

The native step is an **inline UDT** iff:

```
step.tool_representation is not None
  AND step.tool_representation["class"] == "GalaxyUserTool"
```

The native step carries an **admin dynamic tool** (out of scope per §3) iff:

```
step.tool_representation is not None
  AND step.tool_representation["class"] == "GalaxyTool"
```

Admin steps are detected only to surface the `inline_source_unsupported` warning; we do not parse them or feed them into the connection graph.

We resolve through `UserToolSource.model_validate(...)` directly — not the `DynamicToolSources` discriminated union (`tool_util_models/__init__.py:325`), since the admin class is skipped:

```python
from galaxy.tool_util_models import UserToolSource
UserToolSource.model_validate(tool_representation)
```

The format2 step is an inline UDT iff `step.run` is a `GalaxyUserToolStub` or a dict with `class: GalaxyUserTool` (`gxformat2/normalized/_format2.py:138-148`, `_conversion.py:1279-1282`).

When both `tool_id` and `tool_representation` are set on a native step (rare — Galaxy's exporter clears `tool_id` for UDTs, but third-party exporters might not), `tool_representation` wins: it's the user's per-instance canonical copy, `tool_id` is just for human display.

### 4.1 The bridge to `ParsedTool`

Galaxy already does this: `lib/galaxy/tools/__init__.py:653-660` constructs a `YamlToolSource(tool_representation)` from a `DynamicTool.value` and parses it. The same call works for us:

```python
from galaxy.tool_util.parser.yaml import YamlToolSource
from galaxy.tool_util.model_factory import parse_tool

tool_source = YamlToolSource(tool_representation)
parsed_tool = parse_tool(tool_source)
```

`parse_tool` is in `lib/galaxy/tool_util/model_factory.py:26` and returns a `ParsedTool`, which is exactly what `GetToolInfo.get_tool_info` returns. So no new abstraction is needed — we just inject a fast path before the remote fetch.

## 5. Design

### 5.1 Layer 1 — utility helpers (`_util.py`)

Add small, focused helpers next to `step_tool_id` / `step_tool_state`:

```python
def step_tool_representation(step: StepLike) -> Optional[dict]: ...
def step_is_inline_tool(step: StepLike) -> bool: ...
def step_inline_tool_class(step: StepLike) -> Optional[Literal["GalaxyUserTool", "GalaxyTool"]]: ...
```

Both native (model + raw dict) and format2 (`NormalizedWorkflowStep.run = GalaxyUserToolStub | dict`) forms are normalized by these. Tests in `test_workflow_state_helpers.py`.

### 5.2 Layer 2 — inline tool resolver

New internal module `workflow_state/_inline_tool.py` (underscore-prefixed; Phase A surface is internal until Phase B settles the call site):

- `_parse_inline_tool(tool_representation: dict) -> ParsedTool`
  - Internally: `YamlToolSource(tool_representation)` → `parse_tool(...)` (`model_factory.py:26`).
  - Pure local — no network, no cache touch.
- `_validate_inline_tool_source(tool_representation: dict, *, offline: bool = False) -> InlineToolSourceResult`
  - Pydantic gate: `UserToolSource.model_validate(...)` directly (admin class out of scope; emit `inline_source_unsupported` warning instead).
  - Linter: extended `lint_user_tool_source` (see §5.2.1) called with `skip_network=offline`. Default: network linters run; `--offline` disables them.
  - Result fields: `ok: bool`, `parsed_tool: ParsedTool | None`, `validation_errors: list[str]` (from `format_validation_errors`), `lint_errors: list[str]`, `lint_warnings: list[str]`.

`InlineToolSourceResult` is a Pydantic report model and is the **only** public symbol from Phase A — it round-trips through JSON / Markdown reports. The two functions stay private until Phase B promotes them with their final call signatures.

#### 5.2.1 Extend `lint_user_tool_source` to preserve severity

Required Galaxy-side change in `lib/galaxy/tool_util/lint.py`. Today (`:319-337`) returns a flat `List[str]` with `error_messages + warn_messages` concatenated:

```python
def lint_user_tool_source(user_tool_source):
    # ...
    return error_messages + warn_messages
```

Change to return both lists (additive — back-compat for existing one-call site in `managers/tools.py` via a shim):

```python
def lint_user_tool_source_structured(
    user_tool_source, *, skip_network: bool = True
) -> tuple[list[str], list[str]]:
    skip = list(NETWORK_LINTERS) if skip_network else []
    # ... build lint_ctx with skip_types=skip
    return error_messages, warn_messages

def lint_user_tool_source(user_tool_source):  # back-compat
    errors, warnings = lint_user_tool_source_structured(user_tool_source)
    return errors + warnings
```

The `skip_network` parameter is new — current callers (`managers/tools.py`, `agents/custom_tool.py`) get the old skip-always behavior; workflow_state passes `skip_network=offline_mode`.

### 5.3 Layer 3 — step-shaped resolution

`GetToolInfo` stays a `typing.Protocol` (structural typing matters — external consumers satisfy it without subclassing). The step-shaped resolution is a **free function**, not a protocol extension:

```python
# workflow_state/_inline_tool.py
def resolve_for_step(
    get_tool_info: GetToolInfo, step: StepLike, *, offline: bool = False
) -> Optional[ParsedTool]:
    if step_is_inline_tool(step):
        if step_inline_tool_class(step) != "GalaxyUserTool":
            return None  # admin class: emit inline_source_unsupported diagnostic at caller
        return _parse_inline_tool(step_tool_representation(step))
    tool_id = step_tool_id(step)
    if not tool_id:
        return None
    return get_tool_info.get_tool_info(tool_id, step_tool_version(step))
```

Per-invocation memoization layered on top in a `_ResolveCache(get_tool_info)` wrapper used by tree-mode entry points. Keyed by step identity (`id(step)`) — content-hash dedupe deferred until profiles say it matters.

### 5.4 Callers to update

Every site that currently consults `GetToolInfo`. All switch to `resolve_for_step(get_tool_info, step, offline=...)`:

| Site | Today | After |
|---|---|---|
| `validation_native.get_parsed_tool_for_native_step` (`validation_native.py:65-70`) | short-circuit on `tool_id=None` | call `resolve_for_step`; inline UDT steps now parsed locally |
| `validation_format2.validate_step_format2` (`validation_format2.py:69-73`) | short-circuit on `not tool_id` | call `resolve_for_step`; `GalaxyUserToolStub` `run` resolves through the same helper |
| `connection_graph._resolve_tool_step` (`connection_graph.py:179-213`, inner check at `:190`) | gated on `step.tool_id` | use `resolve_for_step`; resolved `ParsedTool` drives output type propagation |
| `clean.py` step cleaner | short-circuits on `tool_id=None` (currently broken on UDT — Phase B side-effect fix) | `resolve_for_step` for stale-key classification of `step.tool_state`. Embedded `tool_representation` itself is never touched. |
| `roundtrip.py` | `GetToolInfo` for round-trip diff classification | `resolve_for_step`; inline-tool round-trip classified the same way |
| `to_native_stateful.py` (lines 46, 83, 120, 357) | resolves tools for format2→native encoding callbacks | `resolve_for_step` everywhere `GetToolInfo` is used; ensures inline-UDT format2 workflows produce correct native output |
| `connection_validation.py` (lines 29, 104, 114) | per-connection type validation via `GetToolInfo` | `resolve_for_step`; inline-UDT outputs participate in connection type checking |
| `lint_stateful.py` | `GetToolInfo` for state lint | add a new `InlineSourceLint` phase that runs `_validate_inline_tool_source` on every inline step; structural+state lint paths use `resolve_for_step` |
| `cache.populate_workflow` | walks steps, calls `add_tool(tool_id)` | skip inline steps; emit them in a new `inline_tools[]` inventory section |

`validation_tests.py` is unaffected — workflow-test files don't reference tools directly.

**Subworkflow recursion is automatic.** `validation_native.py:79-86` recurses into `step.subworkflow` and threads `get_tool_info` through; `connection_graph._resolve_subworkflow_step` (`connection_graph.py:216+`) builds an inner graph with the same resolver. Once `resolve_for_step` is the single entry point, a UDT step inside a subworkflow is resolved the same as a top-level one. The §9.8 `UDT-in-subworkflow` fixture locks this.

**Precheck / legacy detection.** `legacy_encoding.py` classifies tool_state encoding; a UDT step's `tool_state` is created post-PR-22615 and is modern-by-construction. `precheck_native_workflow` scans for legacy *encoding* signals only, not for missing `tool_id`, so inline UDTs do not trigger precheck skips today. No change needed — confirm with a test fixture (`test_precheck.py` gains `udt_step_not_flagged_as_legacy`).

### 5.5 Validation surface — what we surface where

We want three distinct error categories in reports, not collapsed into a single bucket. Surfacing them through the same Pydantic report models that already drive `--report-json` / Jinja2 markdown:

1. **Inline-source errors** (`UserToolSource.model_validate` fails on `tool_representation`).
   Bullet form: `<step_id>/<tool_id>: <dotted.loc>: <pydantic_msg>`.
   New `StepDiagnostic` type `inline_source_invalid`. **Severity: error** (workflow is structurally unsound).

2. **Inline-source lint findings** (errors + warnings from `lint_user_tool_source_structured`).
   Bullet form: `<step_id>/<tool_id>: <linter_name>: <message>`.
   Severity preserved via the new structured-lint API (§5.2.1). Diagnostic types `inline_source_lint_error` / `inline_source_lint_warning`.

3. **Inline-source unsupported** (`class: GalaxyTool` admin dynamic tool detected).
   New `StepDiagnostic` type `inline_source_unsupported`. **Severity: warning**. Tool is skipped from validation and connection graph; warning lands on the step.

4. **State validation errors** against the inline tool model.
   Identical to today's `WorkflowStepNativeToolState` / `WorkflowStepLinkedToolState` errors — no new diagnostic shape, just no longer skipped.

Strictness wiring:
- `--strict-state` already gates state errors → still does, now including state errors against inline tools.
- **New axis** `--strict-inline-source` for pydantic errors on the inline source. Default: errors are surfaced as warnings; the flag promotes to exit-code failure (matches the posture of the other `--strict-*` axes).
- **Lint warnings never fail exit codes by default**, including inline-source lint warnings (matches today's `lint_stateful` posture and IWC CI's tolerance for benign container-shape warnings). No `--lint-fail-on-warn` flag in scope.

`--strict` shorthand promotes all four axes (`structure`, `encoding`, `state`, `inline-source`).

### 5.6 Connection graph for inline UDT outputs

Once `_resolve_tool_step` returns a `ParsedTool` for an inline step, the connection graph just works — outputs carry their `format` declarations (from `IncomingToolOutput`), `format_source: <input_name>` resolves the same way, `data_collection` types feed into `connection_types`. **No new connection logic required.**

One subtlety: UDTs declare outputs via `from_work_dir` / `discover_datasets`, not via `<data>` / `<collection>` like XML. The `IncomingToolOutput` model already normalizes both; `parse_tool` produces the same `ToolOutput` shape on both sides.

### 5.7 Revalidation and read-only posture

Revalidation is unconditional: `validate_inline_tool_source` runs on every CLI invocation that touches a workflow with an inline UDT. Rationale:

- Schema rules tighten over time (PR #22615 was one such pass). A workflow exported under an older Galaxy may not have been gated through current rules.
- Workflows can be hand-edited or synthesized outside Galaxy entirely.
- The parse cost is small; the per-invocation memoization (§5.3) keeps repeated walks to a single parse per step.

`lift_user_tool_source` (`tool_util_models/__init__.py:387`) lifts known-drift cases out before validation. We **do not** call it: workflow_state is read-only and reports drift via `inline_source_invalid` diagnostics. The user updates the workflow upstream; we never rewrite their authored YAML.

Admin dynamic tools (`class: GalaxyTool`) are detected and emitted as `inline_source_unsupported` warnings — out of scope per §3.

## 6. gxformat2 enhancements

gxformat2 already does the heavy lifting on round-trip — what's missing is the small ergonomic API for downstream consumers:

### 6.1 Step-level helpers

Add on `NormalizedNativeStep`:

```python
@property
def is_inline_tool_step(self) -> bool:
    return bool(self.tool_representation and self.tool_representation.get("class") in ("GalaxyUserTool", "GalaxyTool"))

@property
def inline_tool_class(self) -> Optional[str]:
    return self.tool_representation and self.tool_representation.get("class")
```

And on `NormalizedWorkflowStep` (format2):

```python
@property
def is_inline_tool_step(self) -> bool:
    if isinstance(self.run, GalaxyUserToolStub):
        return True
    if isinstance(self.run, dict) and self.run.get("class") in ("GalaxyUserTool", "GalaxyTool"):
        return True
    return False

@property
def inline_tool_representation(self) -> Optional[dict]:
    if isinstance(self.run, GalaxyUserToolStub):
        return self.run.model_dump(by_alias=True, exclude_none=True)
    if isinstance(self.run, dict) and self.run.get("class") in ("GalaxyUserTool", "GalaxyTool"):
        return self.run
    return None
```

Keeps `workflow_state` from special-casing dict vs. stub everywhere.

### 6.2 `GalaxyUserToolStub` schema tightening — **deferred decision**

Today `GalaxyUserToolStub(extra="allow")` preserves arbitrary fields. Two options:

- **Tighten to `UserToolSource`** — full pydantic gate inside gxformat2. Cost: gxformat2 picks up a hard dep on `galaxy.tool_util_models`.
- **Keep loose** — gxformat2 stays schema-agnostic; validation lives in `workflow_state`.

**Recommendation: keep loose.** The pydantic schema lives in `galaxy.tool_util_models`; gxformat2 importing it would invert the dependency. `workflow_state` is the right place to enforce the gate because it already depends on both.

### 6.3 Native ↔ format2 round-trip lock

Add `tests/test_inline_tool_roundtrip.py` in gxformat2 with the `synthetic-user-defined-tool` example (already at `gxformat2/examples/format2/synthetic-user-defined-tool.gxwf.yml`) plus a synthetic native fixture. Confirms `tool_representation` survives both directions with no field drift.

### 6.4 Optional: format2 schema docs

`gxformat2/schema/native_strict.py:354` documents `tool_representation`; the format2-side docs for `run:` should mention the `GalaxyUserToolStub` shape explicitly. Doc-only.

## 7. CLI surface

### 7.1 Global `--offline` flag

A single global flag on `gxwf` (and `galaxy-tool-cache`) that disables **all** network access across subcommands.

**Important contrast with current `lint_user_tool_source` behavior.** The existing function (`lint.py:319-337`) **always** skips `NETWORK_LINTERS` because the interactive Galaxy tool editor cannot block save on third-party APIs. Workflow lint is a deeper, less interactive pass — EDAM and biotools checks are worth running. The plan therefore **enables** network linters in workflow lint by default and `--offline` restores the always-skip posture. This is the inverse of what early drafts of this plan implied.

The new `lint_user_tool_source_structured(user_tool_source, *, skip_network=False)` (§5.2.1) is the seam: workflow_state passes `skip_network=offline_mode`. The existing one-arg `lint_user_tool_source` shim continues to skip network linters always (interactive editor preserves current behavior).

`--offline` also:
- Disables ToolShed fetches in `populate-cache` / `populate-workflow` (`cache.py`).
- Disables `--tool-source galaxy` HTTP (`toolshed_tool_info.py`).
- Is honored by any future remote fetch site.

Implementation: an `OfflineMode` context object plumbed through `ToolCacheOptions` (`_cli_common.py:183-195` adds one field). Threaded as a kwarg into `resolve_for_step` and into `_validate_inline_tool_source`. A test (`test_offline_coverage.py`) asserts every gxwf subcommand registers the `--offline` flag.

### 7.2 `gxwf-state-validate` / `gxwf state-validate`

- New flag `--strict-inline-source` (default off; on under `--strict`).
- Default behavior: inline-source pydantic errors reported as warnings; `--strict-inline-source` promotes to exit-code failure.
- `--report-json` and `--report-markdown` gain `inline_source_validation` / `inline_source_lint` / `inline_source_unsupported` sections per step.

### 7.3 `gxwf-lint-stateful` / `gxwf lint-stateful`

- Adds an `inline-source` phase between gxformat2 structural lint and tool-state validation.
- Each inline UDT step → one `LintResult` block with errors + warnings.
- Network linters run by default; `--offline` skips them.
- Warnings (including container-shape, EDAM/biotools) never fail exit codes by default. Errors fail per existing strict-* axes.

### 7.4 `galaxy-tool-cache populate-workflow`

- Walks steps. For each non-inline step → cache fetch as today. For each inline step → emit a structured `inline_tools[]` entry (id, version, class, step path) into the cache index, but **do not** fetch.
- New `galaxy-tool-cache list-inline-tools <workflow>` to dump the inline-tool inventory.
- `--offline` is respected: fetches are skipped, only the inline inventory is emitted.

### 7.5 `galaxy-tool-cache embedded-schema` (new subcommand)

Existing: `galaxy-tool-cache schema <tool_id>` exports `WorkflowStepToolState` JSON Schema for a cached tool.

Add: `galaxy-tool-cache embedded-schema <workflow_path>` → emits a flat directory of per-step JSON Schemas. Filename convention:

```
<tool_id>.<version>.<step_id>.schema.json
```

Step id guarantees uniqueness even when two steps embed the same `(tool_id, version)`. Tool id + version up front keeps the names self-describing for grep/glob workflows.

**Backend consumer side.** `validation_json_schema.py`'s two-level backend currently keys `tool_schema_dir` lookups on `<tool_id>.<version>.schema.json`. After this plan: the backend's per-step Level-2 resolver gains an inline-tool branch — if `step.tool_representation` is set, look for `<tool_id>.<version>.<step_id>.schema.json` and use it; else fall back to the existing `<tool_id>.<version>.schema.json` (cacheable across workflows). One new lookup branch, both naming schemes coexist. Test: `test_json_schema_inline.py::test_per_step_schema_lookup_prefers_inline_file` (§9.7).

### 7.6 `gxwf-roundtrip-validate`

- No new flags. The round-trip naturally exercises inline-tool encode/decode because `_state_merge.inject_connections_into_state` and the format2 validators now have the parsed tool to type-check against.
- Equivalence threshold: **canonical-order equivalence** — both ends serialize through `UserToolSource._canonical_order` and the resulting dicts must be byte-identical. Tolerates the field reordering PR #22615 introduced; locks everything else.
- Add an IWC-style synthetic fixture to `test_iwc_sweep.py` so a UDT-bearing workflow is round-tripped in CI.

## 8. Library entry points

`workflow_state.__init__` gains:

```python
from .inline_tool import (
    InlineToolSourceResult,
    parse_inline_tool,
    validate_inline_tool_source,
    InlineAwareGetToolInfo,
)
```

So in-process consumers can run the gate without going through argparse.

## 9. Test plan

Red-to-green per [[../../../.claude/CLAUDE.md]] preference.

Red-first tests are marked **R** below — they describe the current false-negative behavior and fail before the implementation lands. **G** tests are green-only-after-implementation.

### 9.1 Unit tests

| Test | R/G | What it asserts |
|---|---|---|
| `test_inline_tool_resolver.py::test_parse_minimal_user_tool` | G | `_parse_inline_tool({...})` returns a `ParsedTool` with declared inputs/outputs. |
| `test_inline_tool_resolver.py::test_validate_source_blank_version` | G | `_validate_inline_tool_source` flags blank `version` (PR #22615 rule). |
| `test_inline_tool_resolver.py::test_validate_source_undeclared_input_ref` | G | `$(inputs.missing)` in `shell_command` is reported. |
| `test_inline_tool_resolver.py::test_validate_source_unclaimed_output` | G | output without `from_work_dir` or `discover_datasets` is reported. |
| `test_inline_tool_resolver.py::test_container_shape_lint_warning` | G | container-shape linter warning surfaces via the new structured lint API. |
| `test_inline_tool_resolver.py::test_admin_class_emits_unsupported_warning` | G | `class: GalaxyTool` returns an `inline_source_unsupported` warning, not a validation pass. |
| `test_inline_tool_resolver.py::test_offline_skips_network_linters` | G | `offline=True` skips `NETWORK_LINTERS` (BioToolsValid, EDAMTermsValid). |
| `test_inline_tool_resolver.py::test_lint_structured_returns_severity` | G | New `lint_user_tool_source_structured` returns `(errors, warnings)` tuples. |
| `test_resolve_for_step.py::test_inline_step_skips_fallback` | G | `resolve_for_step` does not invoke `get_tool_info.get_tool_info` for inline steps. |
| `test_resolve_for_step.py::test_non_inline_step_delegates` | G | Regular steps still hit the fallback `GetToolInfo`. |

### 9.2 Native-state validation tests

| Test | R/G | What it asserts |
|---|---|---|
| `test_validation_native_inline.py::test_inline_state_validated` | **R** | A workflow with a UDT step whose `tool_state` violates the schema is reported with a state error pointing at the step. (Currently passes silently.) |
| `test_validation_native_inline.py::test_inline_state_clean` | G | Cleanly-formed inline UDT step passes. |
| `test_validation_native_inline.py::test_broken_source_no_longer_silent` | **R** | Workflow with a UDT step containing `$(inputs.missing)` is reported, not silently accepted. |
| `test_validation_native_inline.py::test_clean_strips_state_not_representation` | G | `state-clean` cleans `step.tool_state`'s stale keys; `step.tool_representation` is byte-identical post-clean. |
| `test_precheck.py::test_udt_step_not_flagged_as_legacy` | G | `precheck_native_workflow` does not skip workflows whose only "missing tool_id" steps are inline UDTs. |

### 9.3 Format2-state validation tests

| Test | R/G | What it asserts |
|---|---|---|
| `test_validation_format2_inline.py::test_user_tool_stub_resolved` | G | A format2 workflow with `run: {class: GalaxyUserTool, ...}` validates against the parsed tool. |
| `test_validation_format2_inline.py::test_user_tool_stub_state_error` | **R** | State mismatch with the inline schema is reported. (Currently passes silently.) |
| `test_to_native_stateful_inline.py::test_format2_udt_to_native_roundtrip` | G | Format2 UDT workflow → native via `to_native_stateful` produces correct `tool_representation`. |

### 9.4 Connection-graph tests

| Test | R/G | What it asserts |
|---|---|---|
| `test_connection_inline.py::test_inline_output_type_propagates` | **R** | Downstream connection consuming an inline UDT output sees the correct format. (Currently sees no type.) |
| `test_connection_inline.py::test_format_source_resolves_to_inline_input` | G | `format_source: <input_name>` on an inline UDT output resolves against the inline input list. |
| `test_connection_inline.py::test_diagnostic_attributed_to_consumer` | G | Wrong-typed connection diagnostic lands on the consuming step, not the producing UDT. |
| `test_connection_inline.py::test_udt_in_subworkflow_resolved` | G | UDT step nested inside a subworkflow is resolved via the same `resolve_for_step` path. |

### 9.5 Round-trip + lint

| Test | What it asserts |
|---|---|
| `test_roundtrip_inline.py::test_native_to_format2_to_native_preserves_representation` | `tool_representation` survives both directions, byte-identical post-canonicalization. |
| `test_lint_inline.py::test_inline_source_lint_phase` | `gxwf lint-stateful` reports inline-source lint findings alongside structural lint. |

### 9.6 CLI integration

| Test | R/G | What it asserts |
|---|---|---|
| `test_gxwf_inline_cli.py::test_state_validate_strict_inline_source` | G | `--strict-inline-source` promotes inline-source errors to failure exit code. |
| `test_gxwf_inline_cli.py::test_cache_populate_skips_inline_tools` | G | `galaxy-tool-cache populate-workflow` does not attempt to fetch inline UDTs from ToolShed. |
| `test_gxwf_inline_cli.py::test_embedded_schema_dump` | G | `galaxy-tool-cache embedded-schema <wf>` produces per-step JSON Schemas with the documented filename convention. |
| `test_offline_coverage.py::test_every_subcommand_accepts_offline` | G | Every registered `gxwf` / `galaxy-tool-cache` subcommand parses `--offline` without error. |
| `test_offline_coverage.py::test_offline_skips_network_lint` | G | With `--offline`, EDAM/biotools linters are not invoked. |
| `test_offline_coverage.py::test_offline_skips_toolshed_fetch` | G | With `--offline`, `populate-cache` does not hit ToolShed. |

### 9.7 JSON Schema validation backend

| Test | R/G | What it asserts |
|---|---|---|
| `test_json_schema_inline.py::test_per_step_schema_for_inline_udt` | G | `validate_native_workflow_json_schema` validates inline-UDT step state against a schema generated from the inline tool. |
| `test_json_schema_inline.py::test_per_step_schema_lookup_prefers_inline_file` | G | With `--tool-schema-dir`, inline steps look up `<tool_id>.<version>.<step_id>.schema.json` first; non-inline steps still use `<tool_id>.<version>.schema.json`. |

### 9.8 Fixtures

- `test/unit/workflows/inline_udt/` — synthetic native + format2 fixtures covering: minimum-valid, undeclared-input-ref, blank-version, malformed-citation, container-shape-warning, missing-output-claim, admin-class-dynamic-tool, UDT-feeds-regular-tool, regular-tool-feeds-UDT, UDT-in-subworkflow.
- Reuse gxformat2's `synthetic-user-defined-tool.gxwf.yml` (already on disk) for the round-trip fixture.

### 9.9 IWC sweep — DROPPED (2026-05-22)

Original plan added a synthetic IWC-shaped fixture to `test_iwc_sweep.py`. Dropped along with Phase F: IWC corpus has zero UDTs today and this work is expected to land in CI before IWC ever embeds one. If real IWC workflows start embedding UDTs, add fixtures from the real corpus at that point.

## 10. Phasing

### Phase A — helpers and source validation (smallest landing unit) ✅ LANDED

1. `_util.py` helpers (`step_tool_representation`, `step_is_inline_tool`, `step_inline_tool_class`).
2. Galaxy-side: extend `lint_user_tool_source` to surface severity (new `lint_user_tool_source_structured`, back-compat shim — §5.2.1). Touches `lib/galaxy/tool_util/lint.py`; existing one-arg callers unaffected.
3. `_inline_tool.py` (underscore-prefixed): `_parse_inline_tool`, `_validate_inline_tool_source`, `InlineToolSourceResult` (only `InlineToolSourceResult` is public).
4. Unit tests 9.1, plus fixtures.

No behavior change in any CLI yet. Pure additions. Lands clean.

### Phase B — resolver injection ✅ LANDED

1. Add `resolve_for_step` free function to `_inline_tool.py`; promote private function names if the call signatures have settled.
2. Per-invocation `_ResolveCache` wrapper (memoize parse per step identity within one CLI invocation — avoid re-parsing the same `tool_representation` across validate/clean/connections phases).
3. Update every `GetToolInfo` caller from §5.4 to use `resolve_for_step`: `validation_native`, `validation_format2`, `connection_graph`, `clean.py`, `roundtrip.py`, **`to_native_stateful.py`**, **`connection_validation.py`**, `lint_stateful.py`, `cache.populate_workflow`.
4. `clean.py`'s short-circuit on `tool_id=None` is fixed as a side effect — its tool-resolution path now succeeds for inline UDTs, so stale-key classification works against the inline schema. The embedded `tool_representation` itself is never modified.
5. Unit tests 9.2-9.4.

After Phase B, state, clean, and connection validation honor inline UDTs but reports nothing extra about source/lint problems — those still flow as today through whichever path fails first. `GetToolInfo` Protocol shape is unchanged (structural typing preserved for external consumers).

### Phase B status (2026-05-22)

**Files modified** (`wf_tool_state` branch, uncommitted):
- `lib/galaxy/tool_util/lint.py` — `lint_user_tool_source_structured` + back-compat shim
- `lib/galaxy/tool_util/workflow_state/__init__.py` — exports `InlineToolSourceResult`, `resolve_for_step`
- `lib/galaxy/tool_util/workflow_state/_util.py` — three new helpers; `StepLike` widened to include `NormalizedWorkflowStep`; `step_tool_id` / `step_tool_version` handle format2 shape
- `lib/galaxy/tool_util/workflow_state/_inline_tool.py` (NEW) — `_parse_inline_tool`, `_validate_inline_tool_source`, `InlineToolSourceResult`, `resolve_for_step`, `_ResolveCache`
- `lib/galaxy/tool_util/workflow_state/validation_native.py` — `get_parsed_tool_for_native_step` delegates to `resolve_for_step`
- `lib/galaxy/tool_util/workflow_state/validation_format2.py` — `validate_step_format2` uses `resolve_for_step`; switched to `ensure_format2(expand=False)` to dodge a gxformat2 expansion bug (see "Known issues" below)
- `lib/galaxy/tool_util/workflow_state/connection_graph.py` — `_resolve_tool_step` drops the `step.tool_id` gate; falls back to `parsed_tool.id` for inline step labelling
- `lib/galaxy/tool_util/workflow_state/clean.py` — native + format2 cleaners admit inline-UDT steps; format2 path discriminates inline-tool `run` dicts from inline-subworkflow `run` dicts
- `lib/galaxy/tool_util/workflow_state/convert.py` — `make_encode_tool_state` routes through `resolve_for_step` (this is the seam `to_native_stateful.py` rides through)
- `lib/galaxy/tool_util/workflow_state/roundtrip.py` — single-step roundtrip gate admits inline UDT steps

**Tests added** (all green):
- `test/unit/tool_util/workflow_state/test_workflow_state_helpers.py` — +4 helper tests
- `test/unit/tool_util/workflow_state/test_inline_tool_resolver.py` (NEW) — 14 tests covering §9.1
- `test/unit/tool_util/workflow_state/test_inline_udt_workflows.py` (NEW) — 12 tests covering §9.2-9.4 plus precheck, subworkflow recursion, expand=False regression, and `ResolvedStep.tool_id` fallback

**Suite health**: 605 passed, 16 skipped in `test/unit/tool_util/workflow_state/` (excluding pre-existing unrelated fixture/binary failures in `test_declarative.py` / `test_gxwf_cli.py`).

**Phase B no-ops** (deferred per §10 phasing):
- `cache.populate_workflow` — gxformat2's `unique_tools` already excludes steps with `tool_id is None`. Inline inventory emission is Phase D.
- `lint_stateful.py` — pass-through to `validate_workflow_cli`; the new `InlineSourceLint` phase is Phase C.
- `to_native_stateful.py` — inherits inline-aware encoding via `convert.make_encode_tool_state`.

**Plan deviations**:
- `_ResolveCache` exists but is unwired (no caller). Per-walk memoization will land in Phase C when `lint_stateful` runs structural lint + state validation + inline-source validation on the same workflow.
- `resolve_for_step(offline=...)` kwarg is currently a no-op (parsing has no network surface). Phase C threads it through `lint_stateful` for the network linter gate.
- `connection_graph._resolve_tool_step` now sets `ResolvedStep.tool_id` to `parsed_tool.id` when the raw step's `tool_id` is None (the inline UDT case). Out of plan, but report labelling otherwise had nothing to display. Locked by `test_connection_graph_inline_step_tool_id_labelled_from_inline_id`.

**Known issues**:
- **gxformat2 `_expand_format2` strips `GalaxyUserToolStub`**: `ExpandedWorkflowStep.run` is typed `ExpandedFormat2 | None` (`_conversion.py:114`), so `_expand_format2` ignores `GalaxyUserToolStub` branches and rewraps `run=None`. Worked around in `validation_format2.py` by calling `ensure_format2(expand=False)`; locked by `test_format2_inline_subworkflow_still_validates_under_expand_false`. **Proper fix belongs in Phase E**: widen `ExpandedWorkflowStep.run` to `ExpandedFormat2 | GalaxyUserToolStub | None` and add the pass-through branch in `_expand_format2`. Then revert the `expand=False` workaround in Phase E step 3.
- **§9.8 `inline_udt/` fixture directory not yet created**. Phase B tests synthesize fixtures inline as Python dicts. Phase C / D will need the on-disk YAML fixtures when JSON Schema export + CLI integration tests come online.

**Deferred Phase B test items** (out of scope for B, owned by C/E):
- §9.4 `test_format_source_resolves_to_inline_input` — needs §5.6 connection-graph format-source wiring, exercised in Phase C reports.
- §9.4 `test_diagnostic_attributed_to_consumer` — Phase C diagnostic surface.
- §9.5 round-trip lock — Phase C (CLI) + Phase E (gxformat2 fixture).

### Phase C — diagnostics surface ✅ LANDED

1. New diagnostic types in `_report_models.py` (`inline_source_invalid`, `inline_source_lint_warning`, `inline_source_lint_error`).
2. Wire `validate_inline_tool_source` into `validate.py` and `lint_stateful.py`.
3. New `--strict-inline-source` axis.
4. JSON + Markdown report rendering for inline diagnostics.
5. Tests 9.5-9.6.

### Phase C status (2026-05-22)

**Files modified** (`wf_tool_state` branch, uncommitted):
- `lib/galaxy/tool_util/workflow_state/_report_models.py` — `InlineToolSourceResult` reused as the per-step diagnostic shape (rather than the four separate `StepDiagnostic` types §5.5 framed). New `inline_source` field on `ValidationStepResult`. Shared helper `_tally_inline_source(step_results)` powers new `inline_source_summary` computed fields on `WorkflowValidationResult`, `SingleValidationReport`, `LintWorkflowResult`, `SingleLintReport`, `TreeValidationReport`, `LintTreeReport`.
- `lib/galaxy/tool_util/workflow_state/_inline_tool.py` — `validate_inline_tool_source_for_step(step, *, offline)` step-shaped wrapper; `InlineToolSourceResult.has_issues` computed field.
- `lib/galaxy/tool_util/workflow_state/_cli_common.py` — `strict_inline_source` added as a fourth `StrictOptions` axis (promoted by `--strict`); `offline` added to `ToolCacheOptions`; new `add_offline_arg` helper registered via `build_base_parser`/`build_base_subparser_args` so every `gxwf` subcommand accepts `--offline`.
- `lib/galaxy/tool_util/workflow_state/validate.py` — `_validate_native` and `_validate_format2` admit inline UDT steps even when `tool_id is None` (label falls back to parsed tool id/version), attach `inline_source` diagnostics to each emitted result. `_validate_format2` switched to `ensure_format2(expand=False)` (Phase B workaround now applied here too — note that under the prior `expand=True`, the `NormalizedFormat2` subworkflow-recursion branch was unreachable). New text helpers `_format_inline_source_text` / `_summary_inline_source_text`. Exit code respects `--strict-inline-source` in both single and tree modes.
- `lib/galaxy/tool_util/workflow_state/lint_stateful.py` — `offline` plumbed through `validate_workflow_cli`. New `_inline_source_exit_code(results, strict)`; **lint errors and pydantic validation errors are both gated by `--strict-inline-source`** (plan §7.3 literal read; warnings still never fail). Tree-mode `compute_exit_code` mirrors.
- `lib/galaxy/tool_util/workflow_state/templates/reports/{validate_tree,lint_tree}.md.j2` — per-workflow "Inline Source" markdown section.
- `__init__.py` — exports `validate_inline_tool_source_for_step`.

**Tests added** (all green):
- `test/unit/tool_util/workflow_state/test_inline_source_validation.py` (NEW, 18 tests) — covers §9.5 lint phase, §9.6 strict + offline plumbing, attachment on native+format2, admin-class unsupported, helper-level exit-code logic.
- `test/unit/tool_util/workflow_state/test_inline_udt_workflows.py` extended with §9.4 deferred tests: `test_inline_udt_output_format_source_resolves_to_inline_input`, `test_inline_udt_connection_diagnostic_attributed_to_consumer`.
- `report_json_contract_goldens/{lint_tree,validate_tree}.json` regenerated for new computed-field shape.

**Plan deviations**:
- §5.5 calls out four distinct `StepDiagnostic` types; we instead fold them into a single `InlineToolSourceResult` substructure with `validation_errors`/`lint_errors`/`lint_warnings`/`supported` buckets. User explicitly chose the folded shape over a sibling list. `_tally_inline_source` recovers the four counts for the summary surface.
- Lint-error gating: §5.5/§7.3 silent on inline-source lint errors. Landed behavior gates them with pydantic validation errors under `--strict-inline-source` (matches §7.3 "Errors fail per existing strict-* axes" literal read).
- `_ResolveCache` exists but remains unwired — wiring it requires reshaping the `GetToolInfo` callers across validate / connections / clean to pass a step-keyed cache. Filed as Phase E follow-up.

### Phase D — cache and JSON Schema surface ✅ LANDED

1. `galaxy-tool-cache populate-workflow` skips inline steps + emits inventory.
2. `galaxy-tool-cache list-inline-tools` new subcommand.
3. `galaxy-tool-cache embedded-schema <workflow>` new subcommand.
4. Two-level JSON Schema validation backend learns to consume the new per-step schemas.
5. Tests 9.7.

### Phase D status (2026-05-22)

**Files modified** (`wf_tool_state` branch, uncommitted):
- `lib/galaxy/tool_util/workflow_state/_inline_tool.py` — new `InlineToolInventoryEntry` model and `walk_inline_tools(workflow_dict, *, workflow_path=None)` walker. Recurses through subworkflows; emits dotted `step_path` for nested steps.
- `lib/galaxy/tool_util/workflow_state/cache.py` — `collect_inline_tools(workflow_path)` wrapper. `populate_cache` (and per-workflow / per-tree helpers) accept `offline: bool`; under `--offline`, ToolShed fetches are skipped and the inline inventory is still printed. New `ListInlineToolsOptions`, `EmbeddedSchemaOptions`, `run_list_inline_tools`, `run_embedded_schema`, and the private `_collect_inline_representations` walker that maps `step_path → representation dict` for schema export.
- `lib/galaxy/tool_util/workflow_state/scripts/tool_cache.py` — `list-inline-tools` and `embedded-schema` subcommands; `--offline` registered on `populate-workflow`.
- `lib/galaxy/tool_util/workflow_state/validation_json_schema.py` — `_load_tool_state_validator_from_dir` gains `step_path` kwarg; inline-aware lookup tries `<safe_id>.<version>.<step_path>.schema.json` first (a flat file, can't collide with the `<safe_id>/<version>.json` cacheable subdirectory layout), then falls through. Both `validate_native_workflow_json_schema` and `validate_workflow_json_schema` route inline steps through `resolve_for_step`; new `_build_tool_state_validator_from_parsed_tool` helper avoids re-fetching via `GetToolInfo`. Cache key gained `@{step_key|"-"}` suffix to keep inline steps separate.
- `__init__.py` — exports `walk_inline_tools` and `InlineToolInventoryEntry`.

**Tests added** (all green):
- `test/unit/tool_util/workflow_state/test_json_schema_inline.py` (NEW, 11 tests) — per-step schema preferred over cacheable fallback, `--tool-schema-dir` loading for inline, `collect_inline_tools` / `list-inline-tools --json` / `embedded-schema` CLI surfaces, admin-class skipped, `_collect_inline_representations`, `test_cache_populate_skips_inline_tools` (§9.6 R-test for inline-only workflow → zero ToolShed fetches).
- `test/unit/tool_util/workflow_state/test_offline_coverage.py` (NEW, 6 tests) — every `gxwf` subcommand parser accepts `--offline`; `populate-workflow` accepts it; `populate_cache(offline=True)` skips `add_tool` calls; default (`offline=False`) still calls it.

**Suite health (post C+D + triage)**: 644 passed, 16 skipped in `test/unit/tool_util/workflow_state/` (was 605 at start of C). 16 skipped is pre-existing.

**Plan deviations / carry-overs**:
- §9.7 `test_per_step_schema_for_inline_udt` originally called for the JSON Schema backend to *catch* a wrong-typed `n_lines`. Landed test (`test_per_step_schema_built_from_inline_tool_inputs`) introspects the generated schema for the declared input names instead — the JSON Schema export through `to_json_schema(WorkflowStepNativeToolState.parameter_model_for(...))` is too lenient on int coercion to reliably gate string-where-int. The pydantic backend does catch it (Phase B test). Root fix is a hardening pass on `galaxy.tool_util.parameters.json.to_json_schema` — owned by a separate workstream.
- §9.8 `test/unit/workflows/inline_udt/` on-disk fixture directory still absent; Phase C/D tests synthesize fixtures inline as Python dicts. Migration deferred to Phase E.
- `_ResolveCache` still unwired (Phase C deviation, same status).

**Suggested Phase E pickups** (from C/D review):
- gxformat2 fix: widen `ExpandedWorkflowStep.run` to include `GalaxyUserToolStub` and add the pass-through branch in `_expand_format2`. Once landed, revert `expand=False` in both `validation_format2.py` and `validate.py:_validate_format2`.
- Wire `_ResolveCache` across `validate_workflow_cli` so the same `tool_representation` is parsed once across validate + clean + connections phases (plan §5.3).
- `test/unit/workflows/inline_udt/` directory + migration of synthesized Python-dict fixtures.
- Address §9.7 JSON Schema lossiness once `to_json_schema` is tightened on the native representation.

### Phase E — gxformat2 ergonomic additions ✅ LANDED (mostly)

1. Add `is_inline_tool_step` / `inline_tool_representation` properties on the gxformat2 models.
2. Round-trip lock test in gxformat2.
3. Refactor `workflow_state` call sites to use the new properties (removes duplicated dict probing).
4. Bump gxformat2 dep pin (already on a branch dep, so this rides the same bump).
5. Widen `ExpandedWorkflowStep.run` to include `GalaxyUserToolStub`; add pass-through branch in `_expand_format2`. Revert `ensure_format2(expand=False)` Phase B workaround.

### Phase E status (2026-05-22)

**gxformat2 PR**: [galaxyproject/gxformat2#218](https://github.com/galaxyproject/gxformat2/pull/218) — "Less Broken User Defined Tool Support during Normalization". Open, three commits, currently being polished by a parallel agent. CI status: Java/TS/codecov/build_packages green; Python CI matrix has one failure on 3.11 with the rest cancelled — needs triage before merge.

**gxformat2 commits on `parameter_models`**:
- `39c414d` `_expand_format2: pass through GalaxyUserToolStub unchanged` — widens `ExpandedWorkflowStep.run` to allow the stub; adds the isinstance branch. Fixes the silent strip-to-`run=None` Phase B identified.
- `4f5ae48` `Add inline-tool step helpers to normalized step models` — `is_inline_tool_step` + `inline_tool_class` on `NormalizedNativeStep`; `is_inline_tool_step` + `inline_tool_representation` on `NormalizedWorkflowStep` (normalizes stub + defensive dict fallback).
- `2a7214e` `Lock native↔format2 round-trip for inline user-defined tools` — covers native → format2 → native, format2 → native → format2, plus a second-pass idempotence assertion.

**Galaxy-side commits on `wf_tool_state`**:
- `fc1f9321` `Bump gxformat2 pin to parameter_models` — `pyproject.toml` one-liner; rides the same branch dep that was already in place.
- `0139f18f` `workflow_state: revert ensure_format2(expand=False) workaround` — `validation_format2.py` and `validate.py:_validate_format2` back to `expand=True`. Restores `@import`/URL subworkflow expansion alongside inline UDT support. Phase B regression test renamed to drop the `expand_false` framing (the inline-subworkflow-containing-UDT case is worth locking regardless).
- `d1d33285` `workflow_state: delegate to gxformat2 inline-tool step properties` — `step_tool_representation` on the format2 branch now delegates to `inline_tool_representation`; drops the local `GalaxyUserToolStub` import. New `inline_class_from_run(run)` helper in `_util.py` centralizes the raw-dict `class in ("GalaxyUserTool", "GalaxyTool")` probe; replaces four duplicate inline probes across `clean.py`, `cache.py`, and `_inline_tool.py` walkers.

**Confirmed in tree**:
- `validation_format2.py:57` and `validate.py:391` both call `ensure_format2(..., expand=True)`. Workaround fully removed.
- `_util.py:24` defines `inline_class_from_run`; `_util.py:57` reads `step.inline_tool_representation` on the format2 path.
- `cache.py:22`, `clean.py:33`, `_inline_tool.py:39` import and use the centralized helper.

**Phase E carry-overs**:
- gxformat2 PR #218 Python CI failure (`build (3.11)`) — needs investigation before merge. The other Python versions were cancelled, so it may be a single-version flake or a real regression. Block on this before bumping to a tag.
- gxformat2 pin still points at the `parameter_models` branch — bump to a released tag once PR #218 lands and gxformat2 cuts a version.
- §9.7 JSON Schema lossiness on int coercion — still owned by separate `to_json_schema` hardening workstream.

### Phase E follow-up: `InlineResolver` cache wired (2026-05-22)

Promoted `_ResolveCache` → public `InlineResolver` (Phase B deviation finally addressed). Threaded through the walk entry points so per-step `parse_tool(YamlToolSource(...))` calls are memoized across the multiple validation phases that touch one workflow.

**Files modified** (`wf_tool_state` branch, uncommitted):
- `lib/galaxy/tool_util/workflow_state/_inline_tool.py` — renamed `_ResolveCache` → `InlineResolver`; structurally satisfies `GetToolInfo` via delegating `get_tool_info(tool_id, version)`. New `ensure_inline_resolver(get_tool_info, *, offline=False)` is idempotent (a pre-wrapped resolver is returned unchanged, preserving cache state across nested wraps). `resolve_for_step` short-circuits when handed an `InlineResolver`; internal `_resolve_for_step_uncached` is the shared core to avoid recursion. Cache keys on `id(step)` — content-hash dedupe still deferred per §5.3.
- `lib/galaxy/tool_util/workflow_state/__init__.py` — exports `InlineResolver`, `ensure_inline_resolver`.
- `lib/galaxy/tool_util/workflow_state/validate.py` — `validate_workflow_cli` wraps once at the top and passes the resolver to `clean_stale_state`, `precheck_native_workflow`, `_validate_native` / `_validate_format2`, and `validate_connections_report`. Existing call sites of `resolve_for_step(get_tool_info, step)` (notably the double-resolve in `_validate_format2` lines 438/442) automatically benefit — zero per-site changes.
- `lib/galaxy/tool_util/workflow_state/lint_stateful.py` — `lint_single`, `run_lint_stateful`, and the tree `process_one` all wrap once with `ensure_inline_resolver` before calling `validate_workflow_cli`.

**Tests added** (8 new, all green):
- `test/unit/tool_util/workflow_state/test_inline_resolver_cache.py` — covers idempotent wrapping, Protocol satisfaction, cache hits on repeated `resolve_for_step` against the same step instance, format2 double-resolve collapse, native precheck+validate collapse, and the deliberate non-collapse across connection-graph normalization.

**Concrete cache wins** (locked by tests):
- `_validate_format2`: 2 parses → 1 per inline step (the `validate_step_format2` → `resolve_for_step` call shares the cache with the line-442 labelling fallback).
- Native validate without connections: 2 parses → 1 (precheck + `_validate_native` share the dict).
- Native validate with connections: 3 parses → 2 (the connections walk re-parses because `normalized_native(workflow_dict)` builds fresh step instances; id() doesn't span).
- Clean + validate (when `clean=True`): both phases operate on the same `deepcopy`'d dict, so the parse done during cleaning is re-used during validation.

**Known limitations** (deliberate, locked by tests):
- Cache keyed on `id(step)` — different step instances with identical content each parse once. Format2 + connections together still see 2 parses per inline step because `_validate_format2` and `validate_connections_report` independently call `ensure_format2` / `normalized_native` and get different step objects. Content-hash dedupe is the §5.3-deferred next step if profiles ever show the parse cost matters.
- `InlineResolver.get_tool_info(tool_id, version)` does NOT cache — the wrapped resolver (`ToolShedGetToolInfo`, `CachedGetToolInfo`) is expected to handle `(tool_id, version)` caching itself. `InlineResolver` only adds the per-step layer.

### Phase E follow-up: §9.8 on-disk fixtures landed (2026-05-22)

Migrated the Python-dict synthesizers from `test_inline_udt_workflows.py`, `test_inline_source_validation.py`, and `test_json_schema_inline.py` to two canonical on-disk fixtures plus a shared loader. Removes ~150 lines of duplicated `CAT_UDT` / `_native_with_inline_udt` / `_format2_with_inline_udt` definitions.

**Fixtures created**:
- `test/unit/workflows/inline_udt/cat_udt_native.ga` — minimum-valid native workflow with one inline UDT step (cat-style head-n-lines tool).
- `test/unit/workflows/inline_udt/cat_udt_format2.gxwf.yml` — same workflow, format2 shape with `run: {class: GalaxyUserTool, ...}`.

The embedded UDT body matches `test/functional/tools/cat_user_defined.yml` (same `id`, `version`, `container`, `shell_command`) so the fixtures double as a coupling point between offline workflow_state validation and Galaxy's live UDT framework tools.

**Loader** (`test/unit/tool_util/workflow_state/inline_udt_fixtures.py`):
- `load_native_inline_udt(state=..., representation=...)` and `load_format2_inline_udt(state=..., representation=...)` — read fixture, optionally swap `tool_state` / `tool_representation` (native) or `state` / `run` (format2) for variant tests.
- `cat_udt_body()` — fresh deep copy of the inline UDT body for tests that build degenerate variants by mutating individual fields.

**Test refactors**:
- `test_inline_udt_workflows.py`, `test_inline_source_validation.py`, `test_json_schema_inline.py`, and `test_inline_resolver_cache.py` (via shared imports) all now load from disk.
- `test_inline_source_validation.py` callsites switched from positional `_native_with_inline_udt(rep)` to keyword `representation=rep` to match the consolidated loader signature.

**Declarative coverage added**:
- `test_declarative.py` `_resolve_fixture_path` extended with `INLINE_UDT_DIR` lookup.
- `expectations/validate.yml` adds `validate_inline_udt_native_passes` and `validate_inline_udt_format2_passes` — declarative coverage that the loaded fixtures pass `validate` without error and preserve their `tool_representation` / `run` block.

**Suite health**: 716 passed (was 714), 12 pre-existing failures unchanged.

### Phase F — REMOVED FROM SCOPE (2026-05-22)

Original Phase F was: synthetic IWC-shaped fixture in the sweep, docs in `doc/source/dev/wf_tooling.md`, CURRENT_STATE D7/D10 note. Dropped because this work is expected to land in CI before IWC ever embeds its first UDT — the synthetic-IWC sweep fixture would be regressioning against a hypothetical. If real IWC workflows start embedding UDTs later, revisit with a fresh fixture pass against actual content. Docs and CURRENT_STATE notes belong in whatever PR ships this work, not in this plan.

## 11. Risk and back-out

- **`parse_tool` on an invalid `tool_representation` raises** — handled in Phase A: `_validate_inline_tool_source` wraps the pydantic exception via `format_validation_errors`. `_parse_inline_tool` is reserved for already-validated representations.
- **Per-process re-parse cost** — non-zero but small; `_ResolveCache` keyed by step identity keeps it to once per step per invocation. Content-hash dedupe deferred until profiles say it matters.
- **gxformat2 dep churn** — Phase E adds two trivial properties; if downstream is blocked on the branch pin (CURRENT_STATE notes `pyproject.toml` still points at a git branch), Phase E can land separately from A-D, which use only the existing `tool_representation` / `run` fields.
- **Schema drift** — pydantic gate changes in `tool_util_models` propagate to workflow validation automatically. When PR #22615-style hardening lands new rules, any embedded UDT that didn't match the new schema now fails workflow validation — a workflow may newly fail. **Also impacts the entire IWC corpus** at re-evaluation time. Acceptable: matches Galaxy's gate; surface in IWC lint-on-merge.
- **`--offline` plumbing surface area** — touches every subcommand registrar plus `lint_user_tool_source_structured` and the resolver. Risk: a future remote-fetch site is added without honoring the flag. Mitigation: an `OfflineMode` context object threaded through `ToolCacheOptions` rather than a bare bool, plus `test_offline_coverage.py` (§9.6) asserting every CLI subcommand accepts `--offline`.
- **Network-linter posture flip** — workflow lint enables EDAM/biotools by default (interactive editor still skips). Risk: new false positives for tools that pass interactive create but fail network linting. Mitigation: warnings never fail exit codes by default; `--offline` is the immediate escape hatch.
- **Admin-tool out-of-scope decision** — if a real workflow embedding `class: GalaxyTool` shows up, we emit `inline_source_unsupported` but don't validate it. Risk: silent acceptance of a broken admin tool. Mitigation: the diagnostic is loud enough to surface in `--report-json`; revisit scope if observed in IWC corpus.
- **`lint_user_tool_source` signature change** — adding `lint_user_tool_source_structured` is additive; the one-arg shim preserves `managers/tools.py` and `agents/custom_tool.py` behavior. Risk: an out-of-tree caller relies on the flat-list return shape. Mitigation: shim is permanent, not deprecated.

## 12. Decisions (resolved 2026-05-22)

Two interview passes with jmchilton, plus a review pass, captured here so Phase A implementation has unambiguous direction.

### 12.1 First-pass decisions

- **Revalidation posture:** Always revalidate inline source on every CLI invocation. Cheap; catches schema-tightening drift in older exports and any hand-edits.
- **`state-clean` scope:** Clean `step.tool_state` only. `tool_representation` is read-only authoring content — revalidation reports drift, the cleaner never touches it.
- **Network linters:** Run by default. Add a global `gxwf` / `galaxy-tool-cache` `--offline` flag that disables *all* network access (network linters, ToolShed fetches, `--tool-source galaxy` HTTP). Single switch for CI / airgapped use.
- **Strictness axis:** `--strict-inline-source` as a distinct fourth axis. `--strict` shorthand promotes all four.
- **Lint warnings on exit:** Reported, never fail exit codes by default. No `--lint-fail-on-warn` flag. Matches current `lint_stateful` posture.
- **Per-step schema filenames:** `<tool_id>.<version>.<step_id>.schema.json`. Tool id + version self-describe for grep/glob; step id guarantees uniqueness when the same `(tool_id, version)` is embedded twice.
- **Diagnostic attribution:** Connection diagnostics on the consumer (matches today's connection-graph posture). Inline-source diagnostics on the producing step.
- **Round-trip threshold:** Canonical-order equivalence — `UserToolSource._canonical_order` serializer on both ends, dicts byte-identical after.
- **Admin dynamic tools (`class: GalaxyTool`):** Out of scope. Detect and emit `inline_source_unsupported` warning; do not parse, do not validate, do not feed the connection graph. Revisit if a real workflow exercising this shape appears.
- **VS Code surface:** Deferred. Pin down when `VS_CODE_TOOL_VIEW_PLAN.md` reaches the inline-tool surface. Phase D ships the JSON Schema artifacts regardless; LSP integration is a separate plan.

### 12.2 Review-pass decisions

- **Lint severity surface:** Extend `lint_user_tool_source` Galaxy-side. New `lint_user_tool_source_structured(*, skip_network: bool = False)` returns `(errors, warnings)`. Existing one-arg shim preserves current callers. Lets `InlineToolSourceResult` keep its `lint_errors` / `lint_warnings` split.
- **Resolver shape:** `GetToolInfo` stays a `typing.Protocol` (structural typing preserved for external consumers). Step-shaped resolution is a free function `resolve_for_step(get_tool_info, step, *, offline=False)` in `_inline_tool.py`. Every §5.4 caller switches; no Protocol/ABC rework.
- **`--offline` semantics (corrected):** Workflow lint **enables** network linters by default; `--offline` disables them. This is the inverse of `lint_user_tool_source`'s always-skip interactive posture. Requires the `skip_network` kwarg on the new structured linter.
- **`state-clean` on UDT steps:** Currently broken (short-circuits on `tool_id=None`). Fixed as Phase B side effect via the shared `resolve_for_step` swap — no separate phase.
- **JSON Schema backend lookup:** Backend gains an inline-tool branch — if `step.tool_representation` is set, look for `<tool_id>.<version>.<step_id>.schema.json` first; else fall back to `<tool_id>.<version>.schema.json`. Both naming schemes coexist on disk.
- **Phase A public surface:** Underscore-prefix `_inline_tool` module. Only `InlineToolSourceResult` (Pydantic report model) is public. Function names promote in Phase B once the call signatures have settled.
- **D7 / D10 references:** Linked via `[[PROBLEM_AND_GOAL]]` companion doc where they're defined.
