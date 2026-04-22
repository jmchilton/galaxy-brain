# Tool Search LSP + `@galaxy-tool-util` Search Plumbing — Staged Plan

**Date:** 2026-04-21

**Status update (2026-04-22):** Stages happened **out of order**. A reader picking up Stage 4 should read this block before the per-stage sections.

- ✅ **Stage 4a done** — `expandToolStateDefaults` landed first as its own port (commit `afcd804`, `vs_code_integration` worktree). See `FILL_STATIC_DEFAULTS_PORT_PLAN.md`.
- ✅ **Stages 1–3 done** (unstaged on `vs_code_integration` at the time of writing): new `@galaxy-tool-util/search` package with plain-TS wire types + `normalizeToolSearchResults` (Stage 1), `searchTools` / `iterateToolSearchPages` HTTP client (Stage 2), and `ToolSearchService` with fan-out, cross-source dedup, maxResults, enrichment, and TRS version helpers (Stage 3). TRS helpers (`getTRSToolVersions`, `getLatestTRSToolVersion`) landed in `core` rather than `search` — justified because `ToolInfoService.getToolInfo` now uses them to auto-resolve latest versions, which is cross-cutting. `search` re-exports them. No `rerank` helper yet — deliberately deferred, disclosed in the changeset.
- ✅ **Package-layout prep for Stage 4 done (2026-04-22)**: `ParsedTool` (+ `HelpContent`, `XrefDict`, `Citation`) moved from `@galaxy-tool-util/core` to `@galaxy-tool-util/schema`. `ParsedTool.inputs` tightened from `readonly unknown[]` to `readonly ToolParameterModel[]`. A latent cycle was fixed along the way: `tool-state-validator.ts` used to type-import `ToolInfoService` from `core`; it now accepts any `ToolInfoLookup = { getToolInfo(toolId, toolVersion?) }` structural interface, which `ToolInfoService` satisfies automatically. This means **`schema` no longer depends on `core` at all, and `core` now depends on `schema`** — the `schema ← core ← search` chain is real in package.json for the first time. All consumers updated; no re-export kept.
- ✅ **Stage 4 remaining scope done (2026-04-22)**: `buildMinimalToolState` (returns `{}`, doc-commented as extension point) in `packages/schema/src/workflow/minimal-tool-state.ts`; step-skeleton generators (`buildNativeStep` / `buildFormat2Step` / `buildStep`) in `packages/schema/src/workflow/step-skeleton.ts`; 16 unit tests in `packages/schema/test/step-skeleton.test.ts` covering schema-validation round-trips, defaults, overrides, and dispatch. `make check` and `make test` clean. Changeset `.changeset/step-skeleton.md` bumps `schema` minor. `ParsedTool` overload on `expandToolStateDefaults` not added — no caller wants it yet; trivial to add later.
- ⏳ **Stage 5**: publish. Bumps now needed (combined across the four changesets on branch):
  - `@galaxy-tool-util/schema` — **minor** (new `ParsedTool` export, tightened `inputs`, `ToolInfoLookup` interface) + any Stage 4 additions.
  - `@galaxy-tool-util/core` — **major** (breaking removal of `ParsedTool`/`HelpContent`/`XrefDict`/`Citation` exports; new TRS exports; `getToolInfo` auto-resolves latest).
  - `@galaxy-tool-util/search` — **initial 0.1.0**.

**Companion docs (same folder):**
- `VS_CODE_ARCHITECTURE.md` — current shape of the VS Code extension and its two LSP servers.
- `COMPONENT_TOOL_SHED_SEARCHING.md` — neutral survey of what Tool Shed search and TRS APIs actually offer.
- `TS_SEARCH_OVERHAUL_ISSUE.md` — prioritized issue list for the Tool Shed server (runs in parallel; this plan does not block on it).
- `VS_CODE_TOOL_VIEW_PLAN.md` — hover + tree + CodeLens plan for *already-known* tools. This plan is about *discovering* new tools.
- `FILL_STATIC_DEFAULTS_PORT_PLAN.md` — ahead-of-time port plan for `expandToolStateDefaults`; **implemented**, see below.

**Upstream worktree:** `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/vs_code_integration` (originally scoped to `wf_test_schema`; moved to `vs_code_integration` for execution)
**VS Code worktree:** `/Users/jxc755/projects/worktrees/galaxy-workflows-vscode/branch/wf_tool_state`

## Goal

Add a "find a tool and insert a step" workflow authoring surface to the VS Code extension, driven through the LSP, with as much of the reusable service/model/protocol logic living in published `@galaxy-tool-util/*` packages. The extension should be a thin adapter that:

1. talks LSP to the servers,
2. drives VS Code UI (QuickPick, commands, code actions),
3. performs the final AST-aware workspace edit to insert the new step.

Everything else — HTTP, Effect schemas, result normalization, ranking, step skeleton generation — belongs upstream so the `gxwf-web` server, the tool-cache-proxy, CLI users, and a potential third-party consumer can reuse it.

## What each side does

| Concern | Home |
|---|---|
| Plain TS types + normalize fn for tool-search responses, paginated result wrappers, TRS `ToolVersion` | **new** `@galaxy-tool-util/search` |
| Tool Shed HTTP (`/api/tools?q=`, TRS `versions`) | **new** `@galaxy-tool-util/search` |
| `ToolSearchService` — multi-source fan-out, cross-source dedup, optional ParsedTool enrichment, cache integration | **new** `@galaxy-tool-util/search` |
| Ranking / fuzzy re-ranking on top of Whoosh BM25 | **new** `@galaxy-tool-util/search` (pure helper module) |
| `buildMinimalToolState(tool)` (trivial today — `{}`) and `expandToolStateDefaults(tool, state)` | `@galaxy-tool-util/schema` (state-representation concerns) |
| "Given a `ParsedTool`, produce a step skeleton for `.ga` and `.gxwf.yml`" generator | `@galaxy-tool-util/schema` |
| LSP protocol IDs + payload types (`SEARCH_TOOLS`, `GET_STEP_SKELETON`) | `shared/` in the VS Code repo |
| LSP server handlers that wrap the service | `server/packages/server-common/` |
| QuickPick UX, command registration, AST-aware insert edit | `client/` |

### Package layout decision

Search plumbing lives in a new package `@galaxy-tool-util/search`, not in `core`. A separate package:

- keeps `core` lean and its browser-entry verifier (`check:browser`) focused on the cache path;
- lets `search` depend on `schema` + `core` without the inverse;
- gives `@galaxy-tool-util/gxwf-web` and the VS Code extension a single focused dependency for tool discovery;
- makes versioning of search-specific concerns independent of cache/model changes.

Dependency chain: `schema` ← `core` ← `search` (new) ← `cli` / `tool-cache-proxy` / VS Code / `gxwf-web`.

After the 2026-04-22 move, data models (parameter types, `ParsedTool`, workflow formats, step skeleton) live in `schema`; IO/caching/services (`ToolInfoService`, `ToolCache`, HTTP clients) live in `core`. `search` depends on both: `core` for `ToolInfoService` + `ToolSource` + TRS helpers, `schema` for `ParsedTool`.

The bar: when Stage 1–5 are published, a non-VS-Code consumer (`gxwf-web`, planemo, a Jupyter extension) could ship tool search + step insertion without pulling in any VS Code code.

## Staging

Stages 1–5 happen in `galaxy-tool-util` and end with a published package set. Stages 6–9 happen in the VS Code extension and depend only on published upstream versions. A reviewer/other agent should be able to validate each upstream stage in isolation (tests green, `make check` clean, changeset present) before VS Code work begins.

---

## Stage 1 — Create `@galaxy-tool-util/search` package + wire types

**Owner:** galaxy-tool-util agent.

### Deliverables

1. **New package scaffold** `packages/search/` mirroring `packages/core/` layout: `package.json` (`"name": "@galaxy-tool-util/search"`, starts at `0.1.0`, `"type": "module"`, dual entry if Node-only HTTP helpers are needed, `workspace:*` dep on `@galaxy-tool-util/core`), `tsconfig.json`, `README.md` stub, `src/index.ts`, `test/` directory. Register in `pnpm-workspace.yaml`. Follow existing package conventions — use `packages/core/package.json` + `packages/tool-cache-proxy/package.json` as templates (cache-proxy is the closest structural analog since `search` will also have HTTP code).
2. **Docs site** — add search to `docs/` nav and the publication doc's package list.
3. `packages/search/src/models/toolshed-search.ts` — **plain TS interfaces** mirroring the Tool Shed responses documented in `COMPONENT_TOOL_SHED_SEARCHING.md`, plus a small `normalizeToolSearchResults(raw: unknown): SearchResults<ToolSearchHit>` function that does the shape check and number coercion. No Effect Schema — these are trusted wire types that we deserialize one way and then flatten into `NormalizedToolHit` (Stage 3). Effect Schema's value (bidirectional codec, diagnostics tree, composable transforms for user-authored content) doesn't apply here.

- `ToolSearchHit` — `{ tool: { id, name, description: string | null, repo_name, repo_owner_username, version?: string, changeset_revision?: string }, matched_terms: Record<string, string>, score: number }`.
- `SearchResults<A>` — generic `{ total_results: number, page: number, page_size: number, hostname: string, hits: A[] }`. The server serializes `total_results`/`page`/`page_size` as *strings*; `normalize` calls `Number(...)` and throws if the result is `NaN`.
- Re-export these types + `normalizeToolSearchResults` from `packages/search/src/index.ts`.

### Constraints / notes for the implementer

- Types live in `search`, not `core` or `schema`. `core` owns cache + ParsedTool; `schema` owns parameter types; `search` owns discovery.
- Do **not** include `edam_operations`/`edam_topics` yet — the Tool Shed does not yet return them (see `TS_SEARCH_OVERHAUL_ISSUE.md` P0). When a forward-compatible upstream patch lands, add the optional field then.
- `version` and `changeset_revision` are optional on the tool-hit `tool` sub-record for the same reason.
- `normalize` should throw a descriptive `Error` (not `ToolFetchError` — reserve that for HTTP-layer failures) on malformed input; the HTTP client (Stage 2) wraps/rethrows as appropriate.

### Tests

Unit tests (`packages/search/test/models/toolshed-search.test.ts`): feed `normalizeToolSearchResults` a happy-path payload captured from a live Tool Shed (fixture under `packages/search/test/fixtures/toolshed-search/`), a payload with missing optional fields, an empty-hits response, and a malformed payload (asserting the thrown error identifies the bad field).

### Exit criteria

- `pnpm --filter @galaxy-tool-util/search test` passes.
- `make check` clean.
- Changeset present announcing the new package at `0.1.0`.

---

## Stage 2 — Low-level HTTP client functions in `@galaxy-tool-util/search`

**Owner:** galaxy-tool-util agent. Starts after Stage 1 lands.

### Deliverables

New module `packages/search/src/client/toolshed.ts`:

```ts
searchTools(toolshedUrl, query, opts?): Promise<SearchResults<ToolSearchHit>>
getTRSToolVersions(toolshedUrl, trsToolId): Promise<TRSToolVersion[]>     // GET /api/ga4gh/trs/v2/tools/{id}/versions
```

`opts` = `{ page?, pageSize?, fetcher? }`. Use the same `AbortSignal.timeout(30_000)` + `ToolFetchError` pattern as `@galaxy-tool-util/core`'s `fetchFromToolShed` (re-use the `ToolFetchError` class via re-export from core rather than cloning it). Default `fetcher` to `globalThis.fetch`; keep the module browser-safe (no Node-only imports).

### Notes for the implementer

- `searchTools` must handle the Tool Shed's `ObjectNotFound` 404 when paging past the end (see `COMPONENT_TOOL_SHED_SEARCHING.md` §6). Treat as empty page; don't throw. Log through `console.debug` consistent with existing client.
- Do **not** rewrite the query. The Tool Shed already does its own `*term*` wrapping server-side; sending another layer will break things. Pass through verbatim (URL-encoded).
- Paginate at the caller's discretion. Provide a small async generator helper `iterateToolSearchPages(toolshedUrl, query, opts?)` that yields full pages until the server returns fewer than `pageSize` hits. Having this here means `ToolSearchService` (Stage 3) and any CLI consumer don't redo it.

### Tests

Use a small hand-rolled `fetcher` mock (check existing `packages/core/test/` patterns for precedent; if none, inject a `fetcher` into tests). Cover: 200 happy-path, 404-past-end (treated as empty), 500, network error, timeout.

### Exit criteria

- Unit tests green.
- Browser-entry verifier for `@galaxy-tool-util/search` passes — no Node-only imports. Add a `check:browser` script mirroring `core`'s if one is used.

---

## Stage 3 — `ToolSearchService` high-level API

**Owner:** galaxy-tool-util agent.

### Deliverables

New class `packages/search/src/tool-search.ts` — analogous to `ToolInfoService` (in `core`):

```ts
export class ToolSearchService {
  constructor(opts: {
    sources: ToolSource[];       // same shape as ToolInfoService
    info: ToolInfoService;       // for ParsedTool lookups + cache reuse
    fetcher?: typeof fetch;
  });

  async searchTools(query: string, opts?: {
    pageSize?: number;
    maxResults?: number;
    enrich?: boolean;            // when true, fetch ParsedTool per hit via `info`
  }): Promise<NormalizedToolHit[]>;

  async getToolVersions(toolshedUrl, trsToolId): Promise<string[]>;
  async getLatestVersionForToolId(toolshedUrl, trsToolId): Promise<string | null>;
}
```

`NormalizedToolHit`:
- `source: ToolSource` — which shed the hit came from.
- `toolId`, `toolName`, `toolDescription`, `ownerUsername`, `repoName`, `repoOwnerUsername`, `score`.
- `version?`, `changesetRevision?` — populated when the server supplies them (future-proof; empty today).
- `trsToolId: string` — `<owner>~<repo>~<toolId>` form, computed from the hit even though the search API doesn't return it. This is the id the TRS and `getToolInfo` calls want.
- `fullToolId: string` — `<host>/repos/<owner>/<repo>/<toolId>/<version?>` form, the id Galaxy stores in workflows.
- `parsedTool?: ParsedTool` — populated when `enrich: true`.

Service responsibilities:
- Fan search out across all enabled sources in parallel; concat and sort by `score DESC`.
- **Dedup** across sources: collapse hits with the same `(owner, repo, toolId)` across shed mirrors (e.g. `toolshed.g2.bx.psu.edu` vs a mirror). Prefer the source declared first in `sources`.
- Within a single source, dedup same `toolId` appearing in multiple repos only if the repos have identical owner+name (shouldn't happen; log `console.debug` if it does).
- Respect `maxResults`. Page through sources as needed (using the iterator from Stage 2) until budget is met.
- When `enrich: true`, resolve `ParsedTool` via `info.getToolInfo(trsToolId, latestVersion)` — the cache is shared, so this stays cheap on repeat queries.

### A separate pure helper: result ranking

Add `packages/search/src/search-ranking.ts`:

```ts
export interface RankInputs {
  query: string;
  hits: NormalizedToolHit[];
}

export function rerank(inputs: RankInputs): NormalizedToolHit[];
```

Implementation: start with server score, apply boosts for (a) exact `toolName` prefix match against the query (b) query appearing as a substring in `toolId` (c) deprioritize hits whose `score < 0.1 * topScore`. Keep this surgical — Whoosh BM25 is doing the heavy lifting; this is a thin corrective layer. Unit-test independently.

### Tests

- Service-level tests with fake `fetcher` + in-memory `ToolCache`. Assert fan-out, dedup, enrichment, maxResults truncation.
- Ranking tests on hand-built hit arrays.

### Exit criteria

- Exported from `packages/search/src/index.ts`.
- `make check` + `make test` clean.
- Changeset: minor bump.

---

## Stage 4 — Minimal tool state + expand-defaults + step skeleton generator in `@galaxy-tool-util/schema`

**Owner:** galaxy-tool-util agent.

**Status (2026-04-22):**
- ✅ `expandToolStateDefaults` landed ahead of Stages 1–3 (commit `afcd804`, `vs_code_integration` branch). Signature takes `ToolParameterModel[]` — see "Signature note" below about whether to add a `ParsedTool` overload.
- ✅ `ParsedTool` now lives in `@galaxy-tool-util/schema` (moved 2026-04-22), with `inputs: readonly ToolParameterModel[]`. The original rationale for `expandToolStateDefaults` taking `ToolParameterModel[]` instead of `ParsedTool` ("keeps schema free of a core dependency") no longer applies — `schema` owns `ParsedTool` now. A `ParsedTool` overload/wrapper is cheap to add; do it as part of this stage if it simplifies callers.
- ⏳ Remaining: `buildMinimalToolState` (trivial) + step-skeleton generators + tests. The unstaged changeset `parsed-tool-to-schema.md` on `vs_code_integration` already bumps `schema` minor for the move; Stage 4 additions can append to it or add a second changeset — either works.

### Why `schema` owns this

`schema` already owns `createFieldModel`, `STATE_REPRESENTATIONS`, `ToolParameterBundleModel`, and the parameter-type validators. These are state-representation concerns and belong next to them.

### Design: two functions, different jobs

The plan intentionally exposes **two** functions rather than one:

1. **`buildMinimalToolState(tool)`** — returns the smallest `tool_state` object such that a freshly inserted step is valid. **Today this is always `{}`** because `@galaxy-tool-util/schema`'s decoders already handle absent keys by falling back to the default conditional branch and parameter defaults. There is no tool for which we currently need to pre-seed anything into `tool_state` to make validation pass.

   The function still exists as the **designated extension point**: if a future parameter type, decoder change, or validation tightening ever requires pre-populated scaffolding, the logic lands here. Callers (step-skeleton generator, LSP server handler, future consumers) invoke this function instead of hardcoding `{}`, so a single patch can shift the semantics without a codebase sweep.

   The doc comment must state this explicitly — something like:

   > Returns the smallest `tool_state` object such that a freshly inserted step is valid. Today this is always `{}` — the schema decoders and validators handle missing keys via default conditional branches and parameter defaults, so there is no need to seed anything. This function exists as the designated extension point if that ever changes.

2. **`expandToolStateDefaults(tool, currentState)`** — user-initiated, opt-in, takes the *current* state and fills in explicit defaults for anything unset. Crucially, it reads the current state so that:
   - conditional branches respect the user's `test_value` (expanding the defaults of the *active* branch, not the XML-default branch);
   - `repeat` items are expanded in place, not wiped;
   - `section` recursion descends into actually-present sections.

   This is a pure, idempotent function. It does **not** validate. It does not call `ToolStateValidator`. It is not used by the step-skeleton generator. It exists for a user-invoked "Expand defaults" action (Stage 8) and scripting use cases where an explicit dump is wanted.

### Deliverables

**Delivered (2026-04-22):** `expandToolStateDefaults(toolInputs, currentState)` in `packages/schema/src/workflow/fill-defaults.ts`. Signature takes `ToolParameterModel[]`. Supporting scalar/default logic in `packages/schema/src/schema/parameter-defaults.ts`. Walker gained a `repeatMinPad` option. 30 unit tests. See `FILL_STATIC_DEFAULTS_PORT_PLAN.md` for design rationale.

**Signature note (2026-04-22):** The original rationale for taking `ToolParameterModel[]` instead of `ParsedTool` was "keep `schema` free of a `core` dependency." That constraint no longer exists — `ParsedTool` now lives in `schema` and its `inputs` are typed `readonly ToolParameterModel[]`. A thin `expandToolStateDefaults(tool: ParsedTool, state)` overload that forwards to the existing function is now trivial; add it here if the step-skeleton builder ends up wanting a uniform `ParsedTool`-in signature.

**Still to do in Stage 4:**

```ts
export function buildMinimalToolState(tool: ParsedTool): Record<string, unknown>;  // returns {}
```

New module `packages/schema/src/workflow/step-skeleton.ts`:

```ts
export interface StepSkeletonInputs {
  tool: ParsedTool;                    // from @galaxy-tool-util/core
  format: "native" | "format2";
  stepIndex?: number;                  // for .ga, the numeric step key; default = next available
  label?: string;                      // default = tool.name
  position?: { top: number; left: number };  // default = {0,0}
}

export function buildNativeStep(inputs: StepSkeletonInputs): NativeStep;       // from workflow/raw/native.effect.ts
export function buildFormat2Step(inputs: StepSkeletonInputs): WorkflowStep;    // from workflow/raw/gxformat2.effect.ts
export function buildStep(inputs: StepSkeletonInputs): NativeStep | WorkflowStep;
```

The skeleton functions internally call `buildMinimalToolState` to populate `tool_state` / `state` — they never hardcode `{}`. If the minimal function's semantics ever change, the skeleton follows automatically.

### Notes for the implementer

- Don't fabricate values for `data` / `data_collection` inputs. `expandToolStateDefaults` should omit them (or leave them `null`) so the user is forced to wire connections. Pre-seeding `{ __class__: 'RuntimeValue' }` would be mimicking the Galaxy UI's bad pattern — avoid.
- `expandToolStateDefaults` must be idempotent: `expand(tool, expand(tool, s))` equals `expand(tool, s)`. Test this explicitly.
- `expandToolStateDefaults` must **not** call the validator internally. Its output is best-effort; callers validate if they care.
- Don't invent position heuristics. Default `{top: 0, left: 0}`; UI can re-layout.
- Native and format2 diverge in tool_state encoding: native accepts both the string form and the object form (post-clean). Emit the object form (`tool_state: {}`) — what the VS Code clean pipeline expects.
- **Existing types to reuse** (confirmed present):
  - `ParsedTool` — `packages/schema/src/schema/parsed-tool.ts` (moved here 2026-04-22).
  - Native: `NativeStep` + `NativeStepSchema` from `packages/schema/src/workflow/raw/native.effect.ts`.
  - Format2: `WorkflowStep` + `WorkflowStepSchema` from `packages/schema/src/workflow/raw/gxformat2.effect.ts`.
  - Supporting: `StepPosition`, `NativeStepInput/Output`, `WorkflowStepInput/Output` from the same files.
  Return the Effect-schema-derived types (from `*.effect.ts`, not the plain-interface `*.ts` layer) so decoders/validators compose without extra conversion.

### Tests

1. **`buildMinimalToolState` invariant.** For every `ParsedTool` fixture available (check `packages/core/test/fixtures/` and `packages/search/test/fixtures/`), assert `buildMinimalToolState(tool)` deep-equals `{}`. The test file name should itself document the intent (e.g. `minimal-tool-state.test.ts`) with a top-of-file comment pointing at the extension-point doc comment. If this test ever has to change, the PR must explain why.
2. **Step-skeleton round-trip.** For each fixture, `buildStep` output must pass the existing workflow schema validator. It must pass `ToolStateValidator` *except* for diagnostics specifically of kind `data` / `data_collection` required-unset — assert positively against that shape so the test can't silently weaken.
3. **`expandToolStateDefaults` correctness** on a curated fixture set:
   - honors user's current `test_value` in a conditional;
   - preserves existing `repeat` entries;
   - doesn't fill in data/data_collection fields;
   - idempotence round-trip.
4. **Cross-package smoke test.** Feed skeleton output into the `galaxy-tool-util/cli` `validate-workflow` command if possible; otherwise exercise through the same validators the CLI uses.

### Exit criteria

- Both modules exported from `packages/schema/src/index.ts`.
- Tests green.
- Changeset: minor bump on `@galaxy-tool-util/schema`.

---

## Stage 5 — Publish + harden

**Owner:** galaxy-tool-util agent, with human review.

### Deliverables

- Changesets from Stages 1–4 merged.
- First release of `@galaxy-tool-util/search` at `0.1.0`.
- Minor bump on `@galaxy-tool-util/schema`.
- README / docs updates for the new `search` package and the new `schema` exports, with minimal usage snippets.
- Publication doc (`docs/development/publication.md`) updated to include the new package.

### Exit criteria

- `@galaxy-tool-util/search` published on npm.
- New `@galaxy-tool-util/schema` published on npm.
- `pnpm add @galaxy-tool-util/search` in a scratch project pulls the new API.
- Human signoff before VS Code work begins.

---

## Stage 6 — LSP protocol + server handler in VS Code extension

**Owner:** VS Code agent. Depends on Stage 5 being published.

### Deliverables

1. Add `@galaxy-tool-util/search` as a dependency in `server/packages/server-common/package.json` (and any other server package that needs it). Bump `@galaxy-tool-util/core` and `@galaxy-tool-util/schema` to the Stage 5 versions.
2. New custom LSP requests in `shared/src/requestsDefinitions.ts`:

   ```
   SEARCH_TOOLS          { query, pageSize?, maxResults? }                         -> { hits: NormalizedToolHit[], truncated: bool }
   GET_STEP_SKELETON     { toolshedUrl, trsToolId, version, format, stepIndex? }   -> { step, diagnostics? }
   EXPAND_TOOL_STATE     { toolshedUrl, trsToolId, version, state }                -> { state } // Stage 8b
   ```

   Notification (optional, Stage 8): `TOOL_SEARCH_PROGRESS` for incremental results.

3. Server-side: new singleton wrapping upstream `ToolSearchService` from `@galaxy-tool-util/search`, constructed with the same `sources` / cache configuration already used by `ToolRegistryService` and passed the same `ToolInfoService` instance. Register as a DI binding in `server-common/src/inversify.config.ts`. Expose through a `ToolSearchHandler` that implements the search/skeleton/expand requests. Reuse the existing `ToolRegistryService` cache — do not create a second cache.

4. Search is format-agnostic (answers don't depend on which workflow format the user is editing), so the handler can live in `server-common` and be registered by both servers. The step-skeleton handler routes by `format` — no document lookup required.

5. Wire both servers' `GalaxyWorkflowLanguageServerImpl.registerServices()` to include the new handler.

### Client-side request routing

Both LSP servers handle the new requests identically, so the client can forward to *either* — simplest approach is to always send to the native client. Document this in `client/src/requests/gxworkflows.ts`.

### Tests

- `server-common` unit: mock upstream `ToolSearchService`, assert handler translates request payload correctly and maps errors.
- Server integration test against a small canned Tool Shed response fixture (reuse Stage 1 fixtures).

### Exit criteria

- Server tests green.
- `npm run compile` clean.
- No behavior change from user perspective yet (no UI).

---

## Stage 7 — Client QuickPick + "Insert Tool Step" command

**Owner:** VS Code agent.

### Deliverables

1. New command `galaxy-workflows.insertToolStep` registered in `package.json`.
   - `enabledWhen`: `resourceExtname == .ga || resourceExtname == .gxwf.yml || resourceExtname == .gxwf.yaml`.
   - Appears in command palette and editor context menu under Galaxy submenu.

2. Client implementation (`client/src/commands/insertToolStep.ts`):
   1. Prompt `vscode.window.showInputBox` for a search term.
   2. Fire `SEARCH_TOOLS` to the LSP, show results in `vscode.window.createQuickPick`.
      - Each `QuickPickItem`: `label = toolName`, `description = "owner/repo · version?"`, `detail = description truncated 140ch`, `buttons = [{iconPath: "link-external", tooltip: "Open in ToolShed"}]`.
      - Live filtering is local to the QuickPick (no re-LSP on every keystroke) — the search already pulled `maxResults` hits.
   3. User picks a hit.
   4. Fire `GET_STEP_SKELETON` to get the formatted step object.
   5. AST-aware insert: use `jsonc-parser` (for `.ga`) / the server's YAML formatter helper (for `.gxwf.yml`) to append the step into `steps`. For `.ga` compute the next numeric string key; for `.gxwf.yml` append as a new list item. Respect existing indentation — use `FormattingOptions` from the `TextDocument`.
   6. Move cursor to the inserted `tool_id` line.

3. On LSP failure surface the `ToolFetchError` message via `showErrorMessage` with a "Retry" action. Same for empty-search-result ("No tools matched your query.").

### Edge cases

- No configured Tool Shed: fall back to default `toolshed.g2.bx.psu.edu` with a one-time info notification.
- Workflow file is unsaved / has parse errors: still allow insert but warn that the insertion may produce further diagnostics; don't try to be clever.
- Concurrency: disable the command while a previous invocation is still in flight.

### Tests

- Client unit (Jest) for the AST-insert helper: feed a real workflow fixture, insert a step, assert the resulting text round-trips cleanly through `cleanWorkflow()`.
- E2E test (`client/tests/e2e/suite/insertToolStep.e2e.ts`) mirroring the existing extension E2E tests: open a workflow, invoke the command with a canned query, assert a step is inserted and that `Populate Tool Cache` resolves its parameters.

### Exit criteria

- `test:e2e` green.
- Manual sanity check with a running ToolShed: type "fastqc", get expected hits, insert into a `.ga` and a `.gxwf.yml`.

---

## Stage 8 — Rough-edge polish + adjacent features

**Owner:** VS Code agent. Optional but cheap once Stages 1–7 are green.

Pick whichever of these deliver immediate value; none are strictly required.

### 8a. "Find tool" code action on unresolved tool_id

When `tool_id` has the "Could not resolve from ToolShed" warning, offer a code action "Find a similar tool…" that pre-fills the QuickPick with the tool id's short form as the query. Replaces the `tool_id` line in place rather than inserting a new step.

### 8b. CodeLens "Insert Tool Step" above `steps:`

Inline clickable lens at the top of the `steps` block, firing the same command. Nice discoverability for new users.

### 8c. Live-search as user types

Upgrade the QuickPick to re-fire `SEARCH_TOOLS` on input change, debounced ~200ms. Only worth doing if Stage 6 tests show the round-trip is snappy (<300ms for a typical ToolShed). If not, keep the one-shot input box.

### 8d. Persist recent searches

Per-workspace history of queries in `WorkspaceState`. Show as "recent" entries in the QuickPick when the query is empty.

### 8e. "Install status" decoration

Mark hits whose `trsToolId` is already cached by `ToolRegistryService` with a checkmark — lets the user prefer already-resolved tools for faster validation.

### 8f. "Expand tool state defaults" opt-in action (deemphasized)

Command `galaxy-workflows.expandToolStateDefaults` wired to the `EXPAND_TOOL_STATE` LSP request. Server-side: read the cursor-enclosing step's `tool_id`/`tool_version` + current `tool_state`, call `expandToolStateDefaults(tool, state)` from `@galaxy-tool-util/schema`, return the new state; client replaces the state subtree via a `WorkspaceEdit`. Expose on the Workflow Tools tree view's step item context menu (secondary overflow), not as a top-level code action. Purposefully unobtrusive — this is a user-invoked tool, not a suggestion. Do **not** surface it as a quick fix or a hover prompt.

---

## Stage 9 — Related improvements to push upstream over time

Strictly out-of-scope for this plan, but worth noting so the next maintainer knows where to land improvements:

- `@galaxy-tool-util/search`: once `TS_SEARCH_OVERHAUL_ISSUE.md` P0 ships (EDAM + version in hit payload), broaden `NormalizedToolHit` to expose the new fields and add an `edam: string[]` filter to `ToolSearchService.searchTools`.
- `@galaxy-tool-util/schema`: if a future parameter type or decoder change means `buildMinimalToolState` genuinely needs to emit more than `{}`, that's the designated extension point. Update the doc comment + tests together.
- `gxwf-web`: add a `/tools/search` endpoint that proxies `ToolSearchService` so browser consumers avoid CORS against the raw Tool Shed. Most obvious non-VS-Code consumer of the Stage 3 work.

---

## Summary of package impact

| Package | Stage | Version bump kind |
|---|---|---|
| `@galaxy-tool-util/search` (new) | 1, 2, 3 | initial `0.1.0` |
| `@galaxy-tool-util/schema` | 4 + ParsedTool move | minor (new APIs: `ParsedTool` export, `buildMinimalToolState`, `expandToolStateDefaults`, step-skeleton builders; `ToolInfoLookup` interface) |
| `@galaxy-tool-util/core` | 1–3 + ParsedTool move | **major** (breaking removal of `ParsedTool`/`HelpContent`/`XrefDict`/`Citation` exports; new TRS helpers; `getToolInfo` auto-resolves latest version) |
| `galaxy-workflows-vscode` extension | 6, 7, 8 | patch or minor per extension release policy |

## Hand-off prompt for the galaxy-tool-util agent (Stage 1 → 5)

> You are working in `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/vs_code_integration`. Read `CLAUDE.md` and `docs/development/publication.md` first.
>
> Read the top-of-file status block of this plan first — Stages 1–3 and Stage 4a (`expandToolStateDefaults`) are already done and unstaged on `vs_code_integration`, and `ParsedTool` was moved from `core` to `schema` on 2026-04-22. **Do not try to redo these.** Your remaining scope is **Stage 4's `buildMinimalToolState` + step-skeleton generators** and **Stage 5 publish**.
>
> Remaining Stage 4 work:
> - `buildMinimalToolState(tool: ParsedTool): Record<string, unknown>` — returns `{}` for every tool. That's not a placeholder; it's the correct answer. Doc-comment it as the designated extension point.
> - Step-skeleton generators (`buildNativeStep`, `buildFormat2Step`, `buildStep`) in `packages/schema/src/workflow/step-skeleton.ts`. Take `ParsedTool` directly — it lives in `schema` now, so the earlier `ToolParameterModel[]` workaround is no longer needed.
> - Optionally add a `ParsedTool` overload for `expandToolStateDefaults` if the step-skeleton builder wants a uniform `ParsedTool`-in signature.
> - Tests per the "Tests" subsection below.
>
> Before coding, surface any remaining ambiguities to the user (e.g. native vs format2 `tool_state` shape, how position defaults interact with existing workflows). Don't silently decide.
>
> Stage 5 publish: four changesets on branch at time of writing (`search-package-stage-1.md`, `search-service-core-trs.md`, `parsed-tool-to-schema.md`, plus the `expandToolStateDefaults` changeset). Stage 4 step-skeleton work adds to the schema changeset or a new one. Follow the publication doc.
>
> Ground rules from `~/.claude/CLAUDE.md` apply: concise commits, red-to-green testing, no test-data edits to make tests pass, do not run `git rebase`.

## Hand-off prompt for the VS Code agent (Stage 6 → 8)

> You are working in `/Users/jxc755/projects/worktrees/galaxy-workflows-vscode/branch/wf_tool_state` (or a new branch off it). The upstream `@galaxy-tool-util/search` (new package), `@galaxy-tool-util/core`, and `@galaxy-tool-util/schema` versions you depend on must already be published.
>
> Read `/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/VS_CODE_TOOL_SEARCH_LSP_PLAN.md` Stages 6–8, `VS_CODE_ARCHITECTURE.md`, and `VS_CODE_TOOL_VIEW_PLAN.md` (overlapping hover/tree work).
>
> Implement Stage 6 (server + protocol) first, commit, and verify server tests pass. Then Stage 7 (client UI + command), verify E2E tests pass. Stage 8 items are optional — ask the user which to pick up.
>
> Surface ambiguities before coding, especially: (a) whether `SEARCH_TOOLS` should route through both LSP clients or just one; (b) client-side AST-edit helper — any existing util to reuse?

## Resolved decisions

- **Search plumbing lives in a new `@galaxy-tool-util/search` package**, not in `core`. (§ "Package layout decision".)
- **Tool Shed wire types are plain TS interfaces**, not Effect Schemas. The responses are one-way deserialized, trusted-peer, and flattened into `NormalizedToolHit` one layer downstream — Effect Schema's payoff (bidirectional codec, user-facing diagnostics, composable transforms) doesn't apply. A small `normalizeToolSearchResults` function handles shape check + stringified-number coercion. (§ Stage 1.)
- **`buildMinimalToolState` returns `{}` today** and exists solely as the designated extension point. The schema decoders already handle missing keys via default branches + parameter defaults; there is no tool for which pre-seeded state is needed right now. (§ Stage 4 "Design".)
- **`expandToolStateDefaults` reads the current state** so conditional branches reflect the user's active `test_value`, repeat items aren't wiped, and sections recurse correctly. It is idempotent, does not validate, and does not pre-fill data / data_collection inputs. (§ Stage 4 "Design".)
- **Step-skeleton generator always seeds `tool_state: {}` / `state: {}`** by calling `buildMinimalToolState` — never hardcoded `{}`. (§ Stage 4 "Deliverables".)
- **The expand-defaults action is deemphasized**: surfaced only from the tree view's step context menu, not as a quick fix, hover prompt, or automatic suggestion. (§ Stage 8f.)
- **`expandToolStateDefaults` signature takes `ToolParameterModel[]`**, implemented 2026-04-22 (commit `afcd804`). The original rationale (keep `schema` free of `core`) is superseded — `ParsedTool` now lives in `schema` (moved 2026-04-22), so a `ParsedTool` overload is trivial and can be added in Stage 4 if useful.
- **`ParsedTool` + helpers live in `@galaxy-tool-util/schema`** (moved 2026-04-22 from `core`). `schema ← core` is the real dep direction now; the reverse type-import via `ToolStateValidator` was replaced with a `ToolInfoLookup` structural interface defined locally in `schema`. `ParsedTool.inputs` is typed `readonly ToolParameterModel[]`.
- **Walker `repeatMinPad` option** (rather than pre-padding state inside `fill-defaults.ts`) — cleaner, additive, matches a real model feature from Python's `_initialize_repeat_state`. The option also forces the repeat key to be written to output even when empty, and ignores `inputConnections` for instance count.
- **Lenient on unknown conditional `test_value`**: Python raises when no `when` matches and none is flagged `is_default_when`; our walker returns `null` and emits only the test parameter's default. Appropriate for a user-invoked UI action that shouldn't crash on partially-authored workflows.

## Open questions (please resolve before handing off)

- Stage 7 UX: one-shot input-box + QuickPick, or live-search QuickPick from the start?
- Do you want the VS Code work to land on `wf_tool_state` or a fresh branch?

## Out of scope

- Tool Shed server changes (handled separately via `TS_SEARCH_OVERHAUL_ISSUE.md`).
- `gxwf-web` search endpoint (noted as follow-up in Stage 9).
- Editing existing steps' tool versions from the search UI.
- Repository-level search / install-info plumbing — no concrete consumer today. Add when a real feature needs it.
- Fuzzy cross-shed search (same tool id in multiple sheds with different owners) — keep dedup conservative for now.
