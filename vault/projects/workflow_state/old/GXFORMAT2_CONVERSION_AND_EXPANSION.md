# gxformat2 Conversion and Expansion Layer

## Architecture

```
Layer 0: Raw dicts
Layer 1: Pydantic models (schema validation)
Layer 2: Normalized models (structural resolution)
         normalized_native() -> NormalizedNativeWorkflow
         normalized_format2() -> NormalizedFormat2
Layer 3: Conversion + expansion (cross-format, reference resolution)
         to_native() -> NormalizedNativeWorkflow | ExpandedNativeWorkflow
         to_format2() -> NormalizedFormat2 | ExpandedFormat2
Layer 4: Applications
```

Layers 0-2 exist today. This plan covers layer 3.

## Current State

### What exists

- `python_to_workflow(as_python, galaxy_interface=None, workflow_directory=None, import_options=None) -> dict` — Format2→native, returns raw dict, mutates input
- `yaml_to_workflow(has_yaml, ...) -> dict` — YAML wrapper around `python_to_workflow`
- `from_galaxy_native(native_workflow_dict, tool_interface=None, json_wrapper=False, compact=False, convert_tool_state=None) -> dict` — native→Format2, returns raw dict
- `ImportOptions` — `deduplicate_subworkflows`, `encode_tool_state_json`, `native_state_encoder`
- `ConversionContext` — internal, carries `workflow_directory`, `import_options`, labels, graph_ids, subworkflow contexts
- `NormalizedFormat2` / `NormalizedNativeWorkflow` — typed models with narrowed types, no conversion
- `normalized_format2()` / `normalized_native()` — structural normalization only

### What's wrong

- Conversion returns raw dicts, not typed models
- `ImportOptions` name is misleading — these are conversion options
- `from_galaxy_native` has vestigial `tool_interface` param
- No URL/TRS expansion — `@import` handled only in converter, URLs passed through as `content_id`
- `ConversionContext` is exposed in signatures but is internal bookkeeping
- Two separate option objects (none for native→Format2) instead of one
- `transform_*` functions mutate dicts in-place instead of building models

## Design

### `ConversionOptions`

Replaces `ImportOptions`. Single options object for both conversion directions.

```python
class ConversionOptions:
    workflow_directory: str | Path | None = None
    encode_tool_state_json: bool = True
    deduplicate_subworkflows: bool = False
    native_state_encoder: NativeStateEncoderFn = None
    convert_tool_state: ConvertToolStateFn = None
    compact: bool = False
    expand: bool = False
    url_resolver: UrlResolverFn = None

UrlResolverFn = Callable[[str], dict[str, Any]] | None
```

Fields grouped by concern:

**Filesystem context:**
- `workflow_directory` — base path for `@import` resolution

**Format2→native encoding:**
- `encode_tool_state_json` — JSON-encode tool_state strings (Galaxy expects this)
- `deduplicate_subworkflows` — emit `subworkflows` dict instead of inlining
- `native_state_encoder` — callback for custom tool state encoding

**Native→Format2 options:**
- `convert_tool_state` — callback for schema-aware tool state conversion
- `compact` — strip position info

**Expansion:**
- `expand` — resolve `@import`, URL, and TRS URL references in subworkflow steps
- `url_resolver` — callback: `(url: str) -> dict`. If None and `expand=True`, gxformat2 uses a built-in default (`requests.get` + YAML parse + TRS URL descriptor extraction). Galaxy provides its own with allowlists/policy.

### `ConversionContext` (internal)

Not in public API. Built from `ConversionOptions` inside conversion functions.

```python
class ConversionContext:
    options: ConversionOptions
    labels: dict[str, int]                    # label→step_id mapping
    graph_ids: dict[str, Any]                 # $graph subworkflow lookup
    subworkflow_conversion_contexts: dict     # nested contexts
    _resolving_urls: frozenset[str]           # cycle detection for expansion

    # Methods (used only by conversion internals)
    step_id(label_or_id) -> int
    step_output(value) -> tuple[int, str]
    get_subworkflow_conversion_context(step)
    resolve_run(run_action) -> dict | str     # @import, $graph, URL resolution
```

### Expanded models

Inherit from normalized, narrow `run`/`subworkflow` to resolved types.

```python
class ExpandedWorkflowStep(NormalizedWorkflowStep):
    run: ExpandedFormat2 | None = None

class ExpandedFormat2(NormalizedFormat2):
    steps: list[ExpandedWorkflowStep] = []

class ExpandedNativeStep(NormalizedNativeStep):
    subworkflow: ExpandedNativeWorkflow | None = None

class ExpandedNativeWorkflow(NormalizedNativeWorkflow):
    steps: dict[str, ExpandedNativeStep] = {}
```

### Public API

```python
# Format2 → native
@overload
def to_native(workflow, options: ConversionOptions, expand: Literal[True]) -> ExpandedNativeWorkflow: ...
@overload
def to_native(workflow, options: ConversionOptions | None = None, expand: Literal[False] = False) -> NormalizedNativeWorkflow: ...

# Native → Format2
@overload
def to_format2(workflow, options: ConversionOptions, expand: Literal[True]) -> ExpandedFormat2: ...
@overload
def to_format2(workflow, options: ConversionOptions | None = None, expand: Literal[False] = False) -> NormalizedFormat2: ...

# Backward compat (return dicts)
def python_to_workflow(as_python, galaxy_interface=None, workflow_directory=None, import_options=None) -> dict
def yaml_to_workflow(has_yaml, galaxy_interface=None, workflow_directory=None, import_options=None) -> dict
def from_galaxy_native(native_workflow_dict, tool_interface=None, json_wrapper=False, compact=False, convert_tool_state=None) -> dict
```

### Built-in URL resolver

```python
def default_url_resolver(url: str) -> dict[str, Any]:
    """Fetch URL, parse as YAML/JSON, return dict.

    Detects TRS URLs via GA4GH regex and fetches the GALAXY descriptor,
    extracting the 'content' field. Plain URLs return the parsed body.
    Handles base64:// URLs by decoding inline.
    """
```

No server registry needed. TRS URLs are self-contained (base URL is in the URL). Galaxy's split-form TRS ID (`trs_server` + `trs_tool_id` + `trs_version_id`) was dropped from serialized format per galaxyproject/galaxy#21887.

## Implementation Plan

### Phase 1: Schema fix + `ConversionOptions`

#### Step 1: Widen `WorkflowStep.run` in Format2 schema

Currently `run: GalaxyWorkflow | None` — rejects URL strings at `model_validate` time. Change schema definition to `run: Any`. This unblocks `normalized_format2()` for workflows with URL `run` refs.

Regenerate pydantic schemas.

#### Step 2: `ConversionOptions` replaces `ImportOptions`

New class in `gxformat2/converter.py` (or new module). Subsumes `ImportOptions` fields plus new expansion/resolution fields and native→Format2 options (`convert_tool_state`, `compact`).

`ImportOptions` becomes a deprecated alias or is removed.

#### Step 3: `ConversionContext` becomes internal

Remove from public signatures. `python_to_workflow` constructs it internally from `ConversionOptions`. `SubworkflowConversionContext` unchanged (internal).

Add `_resolving_urls: frozenset[str]` for cycle detection during expansion. Add `resolve_run()` method that unifies `@import`, `$graph` ref, and URL resolution (when `expand=True`).

Tests: all existing tests pass with `ConversionOptions` replacing `ImportOptions`.

### Phase 2: `to_native()` — Format2→native returning typed models

#### Step 4: `_build_*` functions replace `transform_*` mutators

Each `transform_*` currently mutates a dict in-place. New `_build_*` functions read from `NormalizedWorkflowStep` and construct `NormalizedNativeStep`:

- `_build_input_step(inp: WorkflowInputParameter, order_index: int) -> NormalizedNativeStep`
- `_build_tool_step(ctx, step: NormalizedWorkflowStep, order_index: int) -> NormalizedNativeStep`
- `_build_pause_step(ctx, step, order_index) -> NormalizedNativeStep`
- `_build_pick_value_step(ctx, step, order_index) -> NormalizedNativeStep`
- `_build_subworkflow_step(ctx, step, order_index) -> NormalizedNativeStep`
- `_build_user_tool_step(ctx, step, order_index) -> NormalizedNativeStep`

Shared pure helpers:
- `_build_tool_state(ctx, step) -> dict[str, Any]`
- `_build_input_connections(ctx, step) -> dict[str, NativeInputConnection | list[NativeInputConnection]]`
- `_build_post_job_actions(step) -> dict[str, NativePostJobAction]`

#### Step 5: Core `_build_native_workflow`

```python
def _build_native_workflow(
    wf: NormalizedFormat2,
    ctx: ConversionContext,
) -> NormalizedNativeWorkflow:
```

- Build label→id mapping from normalized inputs + steps (ids already populated)
- Convert inputs to native input steps via `_build_input_step`
- Convert each step via type dispatch to `_build_*`
- Wire outputs to step `workflow_outputs`
- Convert comments
- Assemble `NormalizedNativeWorkflow`

No dict mutation. Pure model construction.

#### Step 6: `to_native()` entry point

```python
def to_native(workflow, options=None, expand=False):
    options = options or ConversionOptions()
    wf = normalized_format2(workflow)
    ctx = ConversionContext(options)
    # register labels, handle $graph (already resolved in normalized_format2)
    result = _build_native_workflow(wf, ctx)
    if expand:
        result = _expand_native(result, ctx)
    return result
```

#### Step 7: `_encode_native()` serialization

Handles `encode_tool_state_json` at the boundary for backward-compat dict output:

```python
def _encode_native(wf: NormalizedNativeWorkflow, options: ConversionOptions) -> dict:
    data = wf.model_dump(by_alias=True, exclude_none=True)
    if options.encode_tool_state_json:
        for step in data.get("steps", {}).values():
            if isinstance(step.get("tool_state"), dict):
                step["tool_state"] = json.dumps(step["tool_state"])
    return data
```

#### Step 8: Backward-compat `python_to_workflow` wrapper

```python
def python_to_workflow(as_python, galaxy_interface=None, workflow_directory=None, import_options=None) -> dict:
    import_options = import_options or ImportOptions()
    options = ConversionOptions(
        workflow_directory=workflow_directory,
        encode_tool_state_json=import_options.encode_tool_state_json,
        deduplicate_subworkflows=import_options.deduplicate_subworkflows,
        native_state_encoder=import_options.native_state_encoder,
    )
    result = to_native(as_python, options)
    return _encode_native(result, options)
```

### Phase 3: `to_format2()` — native→Format2 returning typed models

#### Step 9: Refactor `from_galaxy_native` internals to build `NormalizedFormat2`

The function already uses typed `NativeStep` access (from our earlier refactor). Change it to construct `NormalizedFormat2` / `NormalizedWorkflowStep` models instead of OrderedDicts.

The step converter functions (`_convert_tool_step`, `_convert_input_step`, etc.) return `NormalizedWorkflowStep` instead of `OrderedDict`.

#### Step 10: `to_format2()` entry point

```python
def to_format2(workflow, options=None, expand=False):
    options = options or ConversionOptions()
    wf = normalized_native(workflow)  # handles dict/path/model input
    result = _build_format2_workflow(wf, options)
    if expand:
        result = _expand_format2(result, ctx)
    return result
```

#### Step 11: Backward-compat `from_galaxy_native` wrapper

```python
def from_galaxy_native(native_workflow_dict, tool_interface=None, json_wrapper=False, compact=False, convert_tool_state=None) -> dict:
    options = ConversionOptions(compact=compact, convert_tool_state=convert_tool_state)
    result = to_format2(native_workflow_dict, options)
    data = result.model_dump(by_alias=True, exclude_none=True)
    if json_wrapper:
        return {"yaml_content": ordered_dump(data)}
    return data
```

### Phase 4: Expansion

#### Step 12: Built-in URL resolver

New module `gxformat2/resolve.py`:

```python
TRS_URL_REGEX = r"(?P<trs_base_url>https?://.+)/ga4gh/trs/v2/tools/(?P<tool_id>.+)/versions/(?P<version_id>[^/]+).*"

def default_url_resolver(url: str) -> dict[str, Any]:
    """Fetch URL and return parsed workflow dict."""
    if url.startswith("base64://"):
        content = base64.b64decode(url[len("base64://"):]).decode()
        return yaml.safe_load(content)
    response = requests.get(url)
    response.raise_for_status()
    if _is_trs_url(url):
        return yaml.safe_load(response.json()["content"])
    content_type = response.headers.get("content-type", "")
    if "json" in content_type:
        return response.json()
    return yaml.safe_load(response.text)

def _is_trs_url(url: str) -> bool:
    return bool(re.match(TRS_URL_REGEX, url))
```

Add `requests` as runtime dependency (or optional dep with clear error on import).

#### Step 13: `_expand_format2`

```python
def _expand_format2(wf: NormalizedFormat2, ctx: ConversionContext) -> ExpandedFormat2:
    expanded_steps = []
    for step in wf.steps:
        if step.run is not None and not isinstance(step.run, NormalizedFormat2):
            # Unresolved reference (URL string, @import dict)
            resolved_dict = ctx.resolve_run(step.run)
            sub_wf = normalized_format2(resolved_dict)
            child_ctx = ctx.child_for_url(str(step.run))
            expanded_run = _expand_format2(sub_wf, child_ctx)
        elif isinstance(step.run, NormalizedFormat2):
            expanded_run = _expand_format2(step.run, ctx)
        else:
            expanded_run = None
        expanded_steps.append(ExpandedWorkflowStep(**step.model_dump(), run=expanded_run))
    return ExpandedFormat2(**wf.model_dump(), steps=expanded_steps)
```

#### Step 14: `_expand_native`

```python
def _expand_native(wf: NormalizedNativeWorkflow, ctx: ConversionContext) -> ExpandedNativeWorkflow:
    expanded_steps = {}
    for key, step in wf.steps.items():
        if step.subworkflow:
            expanded_sub = _expand_native(step.subworkflow, ctx)
            expanded_steps[key] = ExpandedNativeStep(**step.model_dump(), subworkflow=expanded_sub)
        elif step.content_id and _should_expand(step):
            resolved_dict = ctx.resolve_run(step.content_id)
            # Detected format: native or format2
            sub_wf = normalized_native(resolved_dict)  # or convert if format2
            child_ctx = ctx.child_for_url(step.content_id)
            expanded_sub = _expand_native(sub_wf, child_ctx)
            expanded_steps[key] = ExpandedNativeStep(**step.model_dump(), subworkflow=expanded_sub, content_id=None)
        else:
            expanded_steps[key] = ExpandedNativeStep(**step.model_dump())
    return ExpandedNativeWorkflow(**wf.model_dump(), steps=expanded_steps)
```

### Phase 5: Cleanup

#### Step 15: Remove dead code

After migration, remove from converter.py:
- `transform_*` functions (replaced by `_build_*`)
- `_populate_annotation`, `_ensure_inputs_connections`, `_ensure_defaults`, `_populate_tool_state`
- `convert_inputs_to_steps`
- `_preprocess_graphs` (in normalization layer now)
- Old `ConversionContext.__init__` positional args

From export.py:
- `_convert_*` functions (replaced by model builders in `to_format2`)
- `_tool_state` helper (normalized models have dict tool_state)
- `_copy_properties`, `_copy_common_properties`

From model.py (verify no other callers):
- `inputs_as_native_steps` (replaced by `_build_input_step`)
- `ensure_step_position`

#### Step 16: Update public API exports

```python
# gxformat2/__init__.py
from .converter import ConversionOptions, NativeStateEncoderFn, to_native, to_format2
from .export import ConvertToolStateFn

# Backward compat
from .converter import python_to_workflow, ImportOptions
from .export import from_galaxy_native
```

#### Step 17: Update `DEPENDENCY_GXFORMAT2_ABSTRACTIONS.md`

Document full layered architecture, `ConversionOptions`, expanded models, URL resolver callback pattern.

## Implementation Order

1. **Schema fix** (step 1) — unblocks everything, minimal risk
2. **`ConversionOptions`** (steps 2-3) — rename + restructure, all tests pass
3. **`to_native` with `_build_*` functions** (steps 4-8) — biggest chunk, most test coverage
4. **`to_format2` returning models** (steps 9-11) — leverages existing typed export code
5. **Expansion** (steps 12-14) — URL resolver, expand flag, expanded models
6. **Cleanup** (steps 15-17) — remove dead code, update docs

Phases 3-4 are the bulk. Phase 5 is independent of the conversion refactor and could be done in parallel once the expanded model types exist.

## Edge Cases

### `native_state_encoder` callback

Currently receives `(step_dict, state_dict)` where step is a partially-built native dict. With model-based conversion, it would receive `(NormalizedWorkflowStep, state_dict)` — the Format2 step model and the processed state. Galaxy is the only consumer and the callback was recently added, so changing the signature is fine.

### `convert_tool_state` callback

Currently receives a native step dict (via `step.model_dump()`). With `to_format2` building models, it would receive `NormalizedNativeStep` or its `model_dump()`. Existing Galaxy callback expects a dict — keep passing `model_dump()` for backward compat, or update Galaxy's callback.

### `encode_tool_state_json`

`NormalizedNativeStep.tool_state` is always `dict[str, Any]`. JSON encoding is a serialization concern handled by `_encode_native()` when producing dict output. The model always has the decoded view.

### `deduplicate_subworkflows`

With expansion, deduplicated subworkflows get inlined. With `expand=False`, `NormalizedNativeWorkflow.subworkflows` dict carries them. The `to_native` function handles this based on `ConversionOptions.deduplicate_subworkflows`.

### `$graph` multi-workflow documents

Already resolved in `normalized_format2()`. The converter never sees `$graph`. Deduplication is a separate concern handled during native output assembly.

### Extra fields passthrough

Both Format2 and native models use `extra="allow"`. Unknown fields on Format2 steps survive into `model_extra`. When building native steps, `model_extra` from the Format2 step should be forwarded where appropriate. Need to audit which extra fields are Format2-specific (drop) vs pass-through.

### URL expansion format detection

A fetched URL might return native `.ga` or Format2. Detection: check for `a_galaxy_workflow: "true"` key (native) vs `class: GalaxyWorkflow` (Format2). Both `_expand_format2` and `_expand_native` need to handle either format from fetched content and convert appropriately.

## Unresolved Questions

1. Should `requests` be an explicit runtime dep or optional? CLI tooling needs it; library consumers might not want it.
2. `base64://` URLs — support in default resolver? Galaxy tests use these.
3. Cycle detection max depth — hardcode 10 like Galaxy, or configurable on `ConversionOptions`?
4. Should `to_native`/`to_format2` accept `ConversionOptions` or take `**kwargs` that build one? Former is cleaner, latter is more ergonomic for simple cases.
5. `tool_interface` param on `from_galaxy_native` — remove or keep as deprecated no-op?
6. Extra fields passthrough — which Format2 step extras survive into native steps? Need audit.
