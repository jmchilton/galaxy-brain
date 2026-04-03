# VSCode Extension: Rich Format2 Workflow Editing

## Schema Landscape: What Exists, What's Stale, What's Possible

### The VSCode Extension's Current Schemas Are Dated Copies of gxformat2

The galaxy-workflows-vscode extension ships YAML Salad schemas in `workflow-languages/schemas/gxformat2/v19_09/`. These are a **July 2022 snapshot** of gxformat2's source schemas — roughly 2.5 years behind the current gxformat2 `abstraction_applications` branch (March 2024+). The extension loads them via a custom `GalaxyWorkflowFormat2SchemaLoader` (~400 lines of TypeScript) that parses YAML Salad records, expands inheritance, resolves namespaces, and builds an internal `SchemaDefinitions` map used by completion/hover/validation services.

### What's Missing from the VSCode Copy

| Feature | VSCode (Jul 2022) | gxformat2 Current |
|---|---|---|
| Comment system | absent | TextComment, MarkdownComment, FrameComment, FreehandComment (discriminated union) |
| Creator types | `Any?` | CreatorPerson, CreatorOrganization with full schema.org properties |
| `pick_value` step type | absent | supported |
| `when` field (conditional execution) | commented out | enabled |
| `state` field type | `Any?` | `dict[str, Any] \| None` |
| `tool_state` field type | `Any?` | `str \| dict[str, Any] \| None` |
| `run` field type | `GalaxyWorkflow \| null` | `GalaxyWorkflow \| str \| dict[str, Any] \| None` |
| Input type arrays | not supported | `list[GalaxyType]` supported |
| Strict/lax validation modes | no | yes (extra="forbid" vs extra="allow") |

### YAML Salad's Type System Limitations

Raw YAML Salad can express records, enums, arrays, and simple unions (`[Type1, Type2, null]`). It **cannot** express:

- **Discriminated unions** — comment types need to be distinguished by their `type` field value ("text", "markdown", "frame", "freehand"). YAML Salad has no discriminator concept.
- **Complex container unions** — `list[WorkflowStep] | dict[str, WorkflowStep]` (steps as array or mapping). YAML Salad can only declare one form in the type field.
- **Literal types** — `Literal["text"]` for type-safe discriminators. YAML Salad uses open enums that collide (e.g., `GalaxyType` also has "text" and "data").
- **Lax vs strict modes** — no concept of `extra="forbid"` vs `extra="allow"` at the schema level.

### gxformat2's Adaptation Layer: `pydantic:type` Overrides

gxformat2 solves this with a **`pydantic:type` namespace annotation** in the YAML Salad source. The `schema-salad-plus-pydantic` code generator reads these annotations and overrides the generated pydantic field types:

```yaml
# In gxformat2's workflow.yml source
- name: in
  type: WorkflowStepInput[]?              # What YAML Salad sees
  pydantic:type: "list[WorkflowStepInput] | dict[str, WorkflowStepInput | str] | None"  # What pydantic gets

- name: comments
  type: Any?                              # YAML Salad can't express this
  pydantic:type: "list[TextComment | MarkdownComment | FrameComment | FreehandComment] | None"
```

This gives us **one source of truth** (YAML) that generates maximally-typed pydantic models via `build_schema.sh`. The generated models provide `.model_json_schema()` which exports standard JSON Schema draft 2020-12 — confirmed working.

### The Same Pattern Applies to TypeScript

The VSCode extension's YAML Salad loader is a bespoke TypeScript adaptation layer that reads YAML Salad and builds `RecordSchemaNode`/`EnumSchemaNode`/`FieldSchemaNode` objects for the completion/validation services. We have two options:

**Option A: Replace with JSON Schema.** Export JSON Schema from pydantic models, use a standard JSON Schema walker in TypeScript. Simpler, but loses the YAML Salad → TypeScript pipeline that could be shared with CWL tooling.

**Option B: Build a TypeScript adaptation layer analogous to `pydantic:type`.** Extend the existing YAML Salad loader to read `pydantic:type` annotations and generate richer TypeScript schema nodes (discriminated unions, container unions, literal types). This keeps the YAML Salad source as the single source of truth and mirrors gxformat2's approach. Tracked in jmchilton/schema-salad-plus-pydantic issue for TypeScript code generation.

**Recommendation: Option A for now, Option B later if CWL alignment matters.** The pydantic JSON Schema export is already working and captures all the richness. The TypeScript YAML Salad loader is complex and fragile. Replacing it with a JSON Schema walker also unifies the native (.ga) and Format2 schema paths — the native server already uses `vscode-json-languageservice` with JSON Schema.

### Tool State Schemas: The Real Prize

Structural workflow schema improvements are incremental. The transformative feature is **per-tool state completions**. Our `WorkflowStepToolState` pydantic models generate JSON Schema per-tool:

```json
{
  "properties": {
    "input1": {"type": "null", "gx_type": "gx_data", "title": "Concatenate Dataset"},
    "queries": {"$ref": "#/$defs/RepeatType", "gx_type": "gx_repeat"}
  }
}
```

This includes parameter names, types, titles (for hover docs), defaults, and nested structure (repeats, conditionals). No workflow editor anywhere offers this today.

### Conditional Completions: Partially Free via JSON Schema

Galaxy's `ConditionalParameterModel` already generates `oneOf` with `const` discriminators in JSON Schema:

```json
{
  "oneOf": [
    {"$ref": "#/$defs/When_test_parameter_a"},
    {"$ref": "#/$defs/When_test_parameter_b"}
  ]
}
```

Each `When_*` variant has `"test_parameter": {"const": "a"}`, so the schema fully describes which fields are valid for which branch.

**What's free:** Validation works correctly — `vscode-json-languageservice` has discriminator auto-detection (PR #292) that recognizes `oneOf` with constant properties. Error messages will be accurate.

**What's not free:** Auto-completion inside conditional branches is a known weakness in YAML language services (vscode-yaml issue #222). The validation engine traverses `oneOf` correctly, but the completion engine doesn't always resolve which branch matches the current document state. This means:
- Without custom logic: completions show fields from **all** branches (noisy but not wrong)
- With custom logic: completions filter to only the matching branch based on the test parameter value

**Recommended approach:** Start with `oneOf` schemas (Phase 1) — validation is correct and completions show all possible fields. Add discriminator-aware completion filtering in Phase 4 as a targeted enhancement. The custom logic is ~50 lines: read the test parameter value from the AST, match against `const` values in the `oneOf` variants, return only the matching variant's properties.

---

## Tool Source Architecture: Cascading Multi-Source with Galaxy API

### Already Implemented in Our Branch

The `wf_tool_state` branch **already supports** fetching tool definitions from multiple sources:

1. **ToolShed 2.0 TRS API** — `ToolShedGetToolInfo.fetch_from_api()` hits `{toolshed_url}/api/tools/{trs_id}/versions/{version}`
2. **Galaxy instance API** — `ToolShedGetToolInfo.fetch_from_galaxy()` hits `{galaxy_url}/api/tools/{tool_id}/parsed`
3. **Local tool XML** — `galaxy-tool-cache add-local <xml_path>`

The cache layer (`cache.py`) already cascades: `--tool-source auto` tries ToolShed first, falls back to Galaxy instance. Env vars `GALAXY_TOOLSHED_URL` and `GALAXY_URL` configure the endpoints.

### Galaxy API Feasibility

The `/api/tools/{id}/parsed` endpoint returns the same `ParsedTool` model as the ToolShed API. Key considerations:

- **Auth:** The endpoint requires a history context (not marked `public=True`). Public instances (usegalaxy.org, usegalaxy.eu) allow anonymous browsing but the parsed endpoint may require at minimum an anonymous session cookie. API key auth is the standard Galaxy pattern.
- **CORS:** Galaxy's CORS middleware is opt-in (`allowed_origin_hostnames` config). Most public instances likely don't enable it. **Desktop VSCode extension is unaffected** (no CORS). Web extension (vscode.dev) would need a proxy or Galaxy admin config changes.
- **Custom/local tools:** This is the primary value of Galaxy instance sources — tools not published to the ToolShed (custom wrappers, development tools) are only available from the instance where they're installed.

### Recommended Configuration Model for VSCode Extension

```yaml
galaxy.workflows.toolSources:
  - type: "toolshed"
    url: "https://toolshed.g2.bx.psu.edu"
    enabled: true
  - type: "galaxy"
    url: "https://usegalaxy.org"
    apiKey: ""  # optional, for private instances
    enabled: true
  - type: "galaxy"
    url: "https://usegalaxy.eu"
    enabled: false
  - type: "local"
    path: "/path/to/tools"
    enabled: false

galaxy.workflows.toolCache:
  directory: "~/.galaxy/tool_info_cache"
  ttl: 604800  # 1 week
```

Settings UI would be a tree of sources with enable/disable toggles, URL fields, and optional API key fields. A "Populate Cache" command would trigger `galaxy-tool-cache populate-workflow` for the active workspace.

### Source Resolution Order

For a step with `tool_id: toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_intersectbed/2.31.1`:

1. **Local cache** — check `~/.galaxy/tool_info_cache/` first
2. **ToolShed 2.0** — construct TRS ID from tool_id, fetch from ToolShed API
3. **Galaxy instance** — if ToolShed fails (custom tool, unpublished), try configured Galaxy instances in order
4. **Local XML** — if configured, search local tool directories

For stock tools (`cat1`, `Filter1`, etc.): ToolShed doesn't have them, so Galaxy instance is the primary source. Our branch already handles this via `CombinedGetToolInfo`.

---

## Feasibility Assessment

### What Exists Today

**galaxy-workflows-vscode** has a full LSP architecture (TypeScript) with:
- Custom YAML language service with AST walking
- Schema-based completions/validation/hover via YAML Salad schemas
- Completion resolves cursor -> AST path -> schema node -> proposals
- **No tool-state awareness** — `state:` typed as `Any?`, zero completions inside it
- **No dynamic schemas** — everything static YAML Salad loaded at init
- **No tool registry or ToolShed integration**
- **Already web-ready** — dual webpack build (Node + WebWorker), browser LSP entry points exist, works on vscode.dev for local features

**Our gxformat2 pydantic models** can:
- Export JSON Schema via `.model_json_schema()` (confirmed working)
- Provide richer structural schema than the hand-maintained YAML Salad files
- Express discriminated unions, container unions, literal types that YAML Salad cannot

**Our Galaxy tool state models** can:
- Generate per-tool JSON Schema for `WorkflowStepToolState` (confirmed — includes parameter names, types, titles, defaults, nested structure)
- Conditionals already generate `oneOf` with `const` discriminators — validation is correct out of the box
- These schemas are the backbone for tool-specific completions nobody else offers

### Competing Components

The extension's YAML Salad schema system **competes** with our pydantic-generated JSON Schema for structural validation. The YAML Salad schemas are static and stale (v19.09, Jul 2022); our pydantic models are generated from the same YAML Salad sources but with richer types via `pydantic:type` overrides. The real differentiator is tool-specific state completions — this is entirely new territory.

### Key Integration Point

The extension's `SchemaNodeResolver` walks `path -> schema node`. When it hits `state:` under a `WorkflowStep`, it returns `Any` (no completions). The integration: when the resolver hits `state:`, look up the step's `tool_id` from the AST, fetch the tool's `WorkflowStepToolState` JSON Schema from the cache, and synthesize schema nodes from it.

---

## Iterative Plan

### Phase 1: JSON Schema Export Pipeline (Python side)
**Goal:** Reliable JSON Schema generation for both workflow structure and per-tool state.

1. Add `export_json_schema()` to gxformat2 that exports `GalaxyWorkflow.model_json_schema()` as a standalone `.schema.json` file
2. Add a CLI to Galaxy's tool cache: `galaxy-tool-cache schema <trs_id> --representation workflow_step` — exports `WorkflowStepToolState.model_json_schema()` for a cached tool
3. Validate exported schemas are standard JSON Schema and round-trip through TypeScript JSON Schema libraries

**Unresolved:** Should schema export live in gxformat2 or galaxy-tool-util? Natural split: gxformat2 for workflow structure, galaxy-tool-util for tool state.

### Phase 2: Static Workflow Schema Replacement (TypeScript side)
**Goal:** Replace stale YAML Salad schemas with pydantic-generated JSON Schema.

1. Generate `gxformat2.schema.json` from pydantic models, commit to the VSCode extension repo (or generate at build time via a Python script)
2. Replace `GalaxyWorkflowFormat2SchemaLoader` with a JSON Schema loader — this eliminates ~400 lines of custom YAML Salad parsing and unifies with the native server's `vscode-json-languageservice` approach
3. Adapt `SchemaNodeResolver` to walk JSON Schema `$ref`/`$defs` instead of SALAD records
4. Verify completions/hover/validation parity with the old path — the JSON Schema has richer types so completions should improve (e.g., comment types, creator types now have real fields instead of `Any?`)

**Unresolved:** Does the YAML language service support standard JSON Schema validation natively? The native server uses `vscode-json-languageservice` which does. Could we unify the two servers?

### Phase 3: Tool Registry Service (TypeScript side)
**Goal:** Fetch and cache tool definitions, provide tool-aware completions.

1. Add a `ToolRegistryService` that:
   - Reads from a local tool cache directory (same format as `galaxy-tool-cache` output)
   - Fetches from ToolShed 2.0 TRS API on demand
   - Optionally fetches from configured Galaxy instances
   - Caches tool JSON Schemas in memory with TTL
2. Add VSCode settings for tool source configuration (ToolShed URLs, Galaxy instance URLs with optional API keys, local tool paths)
3. Add a "Populate Tool Cache" command that discovers tools in workspace workflows and pre-fetches their schemas
4. Wire into the completion service: when cursor is inside `state:` of a step with `tool_id`, look up the tool's schema and generate field completions with parameter names, type hints, and defaults
5. Wire into validation: validate `state:` blocks against tool schemas, report errors as diagnostics
6. Wire into hover: show parameter help text and type info from tool schema descriptions

**Unresolved:** Tool version resolution — steps may omit `tool_version`. ToolShed API needs a version; Galaxy API can return latest. Default strategy: if version missing, fetch latest and note it in hover.

### Phase 4: Dynamic Schema Composition (TypeScript side)
**Goal:** Compose per-step schemas dynamically — workflow structure + tool-specific state.

1. When a step has `tool_id`, dynamically replace the `state: Any` schema node with the tool's `WorkflowStepToolState` JSON Schema
2. Handle conditionals in tool state — add discriminator-aware completion filtering (~50 lines): read test param value from AST, match against `const` in `oneOf` variants, return only matching branch's properties. Validation already works via `oneOf` + `const` discriminators.
3. Handle repeats — completions inside repeat blocks should show the repeat's inner parameter schema
4. Handle `in:` completions — suggest valid input parameter names from the tool schema (parameters with `gx_type: gx_data` or `gx_collection`)

### Phase 5: Connection Source Completions (TypeScript side)
**Goal:** Auto-complete `source:` references in `in:` blocks.

1. Parse the workflow to build a step graph (step labels, output names, output types)
2. When completing `source:` under an `in:` entry, suggest `step_label/output_name` from upstream steps
3. Use connection type validation (from our `connection_types.py` / `connection_validation.py` work) to filter suggestions by type compatibility — e.g., only suggest `list:paired` outputs for inputs that accept `list:paired`
4. Show type mismatch warnings as diagnostics for existing connections

**Unresolved:** Output type information — ParsedTool already includes outputs with type info, so this should work. Need to verify the JSON Schema export includes output definitions.

### Phase 6: Workspace-Aware Features (TypeScript side)
**Goal:** Make the extension aware of project context.

1. Auto-discover workflows in the workspace on activation, offer to populate the tool cache
2. Resolve subworkflow references (`run:` pointing to another `.gxwf.yml` file) for cross-file navigation and completions
3. Watch for file changes — when a workflow is saved, re-validate tool state and update diagnostics
4. Status bar indicator showing cache health (X/Y tools cached for this workspace)

### Phase 7: Web Platform Support (TypeScript side, layered)
**Goal:** Progressive web compatibility from vscode.dev to standalone editor.

The extension **already has web infrastructure** — dual webpack build (Node + WebWorker targets), browser LSP entry points for both servers (`vscode-languageserver/browser`), `BrowserMessageReader`/`BrowserMessageWriter`. Local features (validation, completions, hover, formatting) work on vscode.dev today.

**Layer A: vscode.dev with local-only features (near-term, minimal work)**
- Verify existing web build works on vscode.dev (run `npm run test-browser`)
- All Phase 1-6 features that use local/cached data work as-is
- Tool schemas bundled or pre-cached in IndexedDB — no network calls needed
- Ship a "schema pack" with common tools (IWC corpus tools, popular ToolShed tools) bundled into the extension

**Layer B: vscode.dev with network features (medium-term)**
- Add fetch-based API client for ToolShed/Galaxy (replacing Node `http`/`https`)
- CORS constraint: ToolShed and Galaxy instances don't enable CORS by default
- Options to address CORS:
  - **Preferred:** Add CORS headers to ToolShed 2.0 for `/api/tools/` endpoints (we control this)
  - **Fallback:** Lightweight CORS proxy (e.g., Cloudflare Worker, ~20 lines)
  - **Per-instance:** Galaxy admins can enable CORS via `allowed_origin_hostnames` config
- API key support for private Galaxy instances via VSCode secrets API
- Cache fetched schemas in IndexedDB for offline use

**Layer C: Standalone web editor (long-term)**
- Extract LSP servers into Monaco Editor-compatible web workers (using `monaco-languageclient`)
- Replace VSCode file system API with File System Access API + IndexedDB
- Replace VSCode Git with isomorphic-git for web
- Embeddable as a component in Galaxy's UI, IWC website, or training materials
- Same tool registry service, same schema infrastructure — just different host

---

## Resolved Questions

1. **Fork or contribute?** Contribute upstream — send PRs to the existing extension.
2. **YAML Salad -> JSON Schema migration risk?** Non-issue — the YAML Salad features are internal to the schema loader, not user-facing.
3. **Conditional completions in `state:`?** Partially free — validation works via `oneOf` + `const` discriminators already generated by our pydantic models. Completion filtering requires ~50 lines of custom logic to read the test parameter value from the AST and match against `oneOf` variants. Start with all-branch completions (Phase 3), add discriminator-aware filtering in Phase 4.
4. **Web extension compatibility?** Already 95% there — extension has dual Node/WebWorker build and browser LSP entry points. Local features work on vscode.dev now. Network features (tool fetching) need CORS resolution. See Phase 7 for layered approach.

## Unresolved Questions

1. **`schema-salad-plus-pydantic` for TypeScript?** [jmchilton/schema-salad-plus-pydantic#3](https://github.com/jmchilton/schema-salad-plus-pydantic/issues/3) filed. The architecture is already backend-friendly — orchestration calls `begin_class`/`declare_field`/`end_class` on a codegen object; a `TypeScriptCodeGen` implementing the same interface is straightforward. `pydantic:type` → TypeScript mappings are natural (e.g., `list[X] | dict[str, X]` → `X[] | Record<string, X>`, `Literal['text']` → `'text'`). schema-salad upstream already has a TS codegen but lacks `pydantic:type` support. Valuable for compile-time type safety in the extension even if we use JSON Schema for runtime completions.
