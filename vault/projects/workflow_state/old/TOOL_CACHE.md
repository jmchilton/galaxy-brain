# Tool Cache: Lazy Per-Workflow Resolution

## Goal

When a workflow document is opened, automatically resolve any uncached tools rather than
waiting for the user to manually run "Populate Tool Cache". Report failures clearly without
blocking the user.

The current behavior: a cache miss during validation emits an Information diagnostic:
> "Tool 'x' is not in the local cache. Run 'Populate Tool Cache' to enable tool state validation."

The new behavior: on document open, the server proactively fetches uncached tools from
ToolShed. If successful, re-validate and the diagnostic disappears. If the fetch fails,
report the failure in an output channel and keep the existing Information diagnostic (or
update its text to reflect "could not be resolved").

---

## Architecture Overview

The server side is identical in native and web environments — both run
`GalaxyWorkflowLanguageServerImpl` via `ToolCacheService`. The difference is the LSP
transport (IPC vs. Web Worker) and, critically, **whether network access from the server
process works**.

- **Native**: server runs in a Node.js child process — full HTTP access via
  `@galaxy-tool-util/core`'s `ToolInfoService`.
- **Web/Browser**: server runs in a **Web Worker** inside the browser. `ToolInfoService`
  likely uses Node.js HTTP APIs (`https`, `node-fetch`) which do not work in a Web Worker
  context. Even if rewritten to use `fetch`, a CORS preflight to `toolshed.g2.bx.psu.edu`
  would likely fail.

**Design decision:** auto-resolution is an opt-in capability the client declares at
initialization. Native clients declare it; web clients do not. The server only auto-resolves
for clients that declare the capability.

---

## Component Design

### 1. Client capability flag

Add a custom client capability (in `InitializeParams.capabilities.experimental`) signaling
whether the client supports/wants server-initiated tool resolution:

```
experimental: { toolAutoResolution: true }
```

- **Native `extension.ts`**: set flag to `true`
- **Web `browser/extension.ts`**: omit the flag (or set `false`)

The server reads this flag once during `initialize()` and stores it. The existing
`buildBasicLanguageClientOptions()` in `client/src/common/index.ts` is the right place to
inject this.

### 2. Server-side trigger — `documents.onDidOpen`

`GalaxyWorkflowLanguageServerImpl.trackDocumentChanges()` currently only wires up
`onDidChangeContent` and `onDidClose`. Add `documents.onDidOpen` to trigger resolution
**without re-running validation immediately** (validation already fires from
`onDidChangeContent` which is also emitted on open).

```
documents.onDidOpen(event => {
  if (autoResolutionEnabled) {
    ToolCacheService.scheduleResolution(event.document);
  }
})
```

`onDidChangeContent` is still the validation trigger; `onDidOpen` is solely the resolution
trigger, so tool fetches don't happen on every keystroke.

### 3. Batching / debounce in `ToolCacheService`

Multiple files may open at startup (e.g. a workspace with 10 workflows). Batch them:

- `scheduleResolution(doc)` extracts uncached tool refs from the document using the same
  AST walk already in `onGetWorkflowToolIds()` (extract to a shared helper).
- Accumulate into a pending set. Start a 300 ms debounce timer on first addition; reset
  on each additional add.
- When the timer fires, deduplicate against an "in-flight" Set, then call
  `toolRegistryService.populateCache(batch)`.
- Track the documents that contributed to each batch so their validation can be re-triggered
  after the fetch completes.

An in-flight Set prevents duplicate fetches when the same tool appears in multiple open
documents.

### 4. Re-validation after fetch

After `populateCache()` resolves:

- Remove successfully fetched tools from the in-flight Set.
- Re-validate all documents that were waiting on the fetched tools (call the existing
  `validateDocument()` path — no new validation logic needed).
- The Information diagnostic for a successfully cached tool will disappear naturally.

### 5. Failure reporting

`populateCache()` already returns `{ fetched, alreadyCached, failed[] }`. On completion:

- **Successes**: silent (validation re-runs and the diagnostic goes away).
- **Failures**: send a custom LSP notification `TOOL_RESOLUTION_FAILED` to the client with
  the list of `{ toolId, error }` entries.
- The client's notification handler writes each failure to a dedicated **output channel**
  ("Galaxy Workflows — Tool Resolution") and shows a one-time dismissible warning:
  > "Could not resolve N tools from ToolShed. See Output for details."
- The server's validation diagnostic for failed tools changes from "Run Populate Tool Cache"
  to "Tool could not be resolved from ToolShed — see Output panel."

### 6. Diagnostic text update

`ToolStateValidationService` currently emits a single Information message on cache miss.
After this change it should distinguish:

- **Never attempted** (doc just opened, resolution pending): keep existing text or change to
  "Resolving tool…" (low priority, may not be worth the complexity).
- **Resolution failed** (fetch returned an error): "Could not resolve tool 'x' from ToolShed."
- **Unknown** (web environment, never attempted): keep existing "Run Populate Tool Cache" text.

The simplest implementation: add a `resolutionFailed: Set<string>` to `ToolCacheService`
that `ToolStateValidationService` can query to pick the right message. No new diagnostic
codes needed.

---

## Web Environment

When `experimental.toolAutoResolution` is absent/false, no change to existing behavior:

- The Information diagnostic continues to say "Run Populate Tool Cache".
- `PopulateToolCacheCommand` still works via explicit user invocation (currently this
  calls `POPULATE_TOOL_CACHE` through the format2 server — in a web Worker it will fail
  at the network layer too, which is a pre-existing limitation).
- The output channel is still created but will receive no auto-resolution messages.

A future improvement could add a galaxy-instance proxy or an iframe-based auth flow for
web ToolShed access, but that's out of scope here.

---

## New LSP Additions

| Type | Name | Direction | Purpose |
|------|------|-----------|---------|
| Notification | `TOOL_RESOLUTION_FAILED` | server → client | Reports per-tool fetch failures after a resolution batch |
| (Reused) | `POPULATE_TOOL_CACHE` | client → server | Already exists; no change needed |
| (Reused) | `GET_WORKFLOW_TOOL_IDS` | client → server | Walk already in ToolCacheService; extract to shared helper |

No new requests. The auto-resolution loop is entirely server-initiated; the client only
receives a notification after the fact.

---

## Implementation Steps

1. ✅ **Extract tool-ID-walk helper** from `ToolCacheService.onGetWorkflowToolIds()` into a
   standalone function `extractToolRefsFromDocument(doc: DocumentContext): ToolRef[]`
   (exported from `toolCacheService.ts`).

2. ✅ **Add `toolAutoResolution` client initialization option** in
   `client/src/common/index.ts` (`buildBasicLanguageClientOptions` now accepts optional
   `initializationOptions`). Set to `true` for the gxFormat2 client in native `extension.ts`.
   Read from `params.initializationOptions?.toolAutoResolution` in `server.ts` `initialize()`.
   Note: used `initializationOptions` rather than `capabilities.experimental` for simplicity.

3. ✅ **Add `documents.onDidOpen` handler** in `GalaxyWorkflowLanguageServerImpl`. Calls
   `ToolCacheService.scheduleResolution()`. Handler fires after `onDidChangeContent` (which
   populates the cache) because both are registered in that order.

4. ✅ **Implement debounced batch resolution in `ToolCacheService`**: 300 ms debounce timer,
   `_pending` Map (key → {toolRef, documentUris}), `_inFlight` Set for deduplication,
   `populateCache()` call, try/catch for unhandled rejection, re-validation of affected docs.

5. ✅ **Add `TOOL_RESOLUTION_FAILED` notification** to `requestsDefinitions.ts`
   (`LSNotificationIdentifiers.TOOL_RESOLUTION_FAILED` + `ToolResolutionFailedParams`).
   Sent from `ToolCacheService._flushResolution()` when failures occur.

6. ✅ **Client notification handler**: registered on `gxFormat2Client` in `initExtension()`.
   Writes each failure to "Galaxy Workflows — Tool Resolution" output channel. Shows a
   one-time warning toast per session (intentional — all failures still logged to output).

7. ✅ **Update diagnostic text** in `ToolStateValidationService`: cache-miss now checks
   `toolRegistryService.hasResolutionFailed()` → `DiagnosticSeverity.Warning` +
   "Could not resolve tool '...' from ToolShed — see Output panel." when true.
   `hasResolutionFailed` / `markResolutionFailed` added to `ToolRegistryService` interface
   and implemented in `ToolRegistryServiceImpl` with an in-memory `_resolutionFailed` Set.

8. ⬜ **Tests**:
   - Unit: debounce batching, deduplication against in-flight set
   - Unit: re-validation triggered after populate completes
   - Unit: `TOOL_RESOLUTION_FAILED` notification sent on failure
   - Unit: Warning diagnostic when `hasResolutionFailed` returns true
   - Integration: open a document with an uncached tool → verify `populateCache` called →
     verify diagnostic updates

---

## Open Questions

1. ✅ resolved — deferred to follow-up. Should `onDidOpen` also re-trigger when a step with
   a new `tool_id` is *added* to an already-open document? (Requires diffing tool ID sets
   between validation runs.) A TODO comment is in `server.ts` near the `onDidOpen` handler.

2. Should auto-resolution respect a user-facing setting (`galaxyWorkflows.toolCache.autoResolve:
   boolean`, default true)? Or is it always-on for native?

3. ✅ resolved — Warning severity. On resolution failure, the diagnostic now uses
   `DiagnosticSeverity.Warning` + "Could not resolve tool '...' from ToolShed".

4. ✅ resolved — tracked separately. `ToolInfoService` fetch-based work for web:
   https://github.com/jmchilton/galaxy-tool-util-ts/issues/44
