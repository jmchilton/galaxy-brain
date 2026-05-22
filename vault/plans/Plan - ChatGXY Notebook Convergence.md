---
type: plan
title: ChatGXY Notebook Convergence
tags:
  - plan
  - galaxy/agents
  - galaxy/client
related_notes:
  - "[[HISTORY_MARKDOWN_ARCHITECTURE]]"
  - "[[HIDE_TOOLBOX_WHEN_CHAT_OPEN_PLAN]]"
status: draft
created: 2026-05-21
revised: 2026-05-21
revision: 2
ai_generated: true
summary: "Converge PR 22096's docked ChatGXY and history_pages PageChatPanel into one Analysis-level chat surface; notebooks become a router context"
---

# ChatGXY + Notebook Chat Convergence

## Executive Summary

Two parallel branches landed/are-landing chat work:

- `history_pages` (merged into dev, PR #22361) — `PageChatPanel.vue` as a 60/40 split-view inside the notebook editor, talks to `PageAssistantAgent` via `POST /api/chat` with `payload.page_id` + `agent_type=page_assistant`.
- `chatgxy-panel` (PR #22096, in review) — docked GalaxyAI panel at right/bottom (FlexPanel) plus the existing full-page `/galaxyai`, with route-derived `interface_context` and `@mention` entity context, talks to the router via `POST /api/chat`.

End goal: **one chat surface**, mounted only at Analysis level (docked right / bottom / center). Notebooks become a context the router recognizes — when the user is editing a notebook, the chat *reflects the current global state*, and the router hands off to `PAGE_ASSISTANT`. No editor-local chat button, no editor-embedded mount, no per-page chat-location preference. The notebook surface gains awareness, not its own chat.

This plan does not block #22096 — it's a follow-up that lands after.

### Goals

- One chat mount (`GalaxyAI.vue` inside `Analysis.vue`'s FlexPanel slots) — no second mount anywhere.
- One request shape on `POST /api/chat` — no `payload.page_id` from the client; notebook context flows through `interface_context`.
- Router picks `PAGE_ASSISTANT` from interface context, not from a client-forced `agent_type`.
- `@mentions` Just Work in notebook conversations (already do via shared `ChatInput`; just need the entity context to flow through the unified request).
- Proposals (`section_patch` / `full_replacement`) still render and still apply, even though they now appear inside the global GalaxyAI panel instead of a notebook-embedded one.

### Non-Goals

- New endpoints. Both surfaces already use `POST /api/chat`; converging is request-shape work.
- New DB columns. `ChatExchange.page_id` stays; `PageRevision.edit_source` stays.
- Removing `PageAssistantAgent` or its history tools. Still the right specialist; reached via router handoff.
- Per-notebook chat history filter UI for the first cut (was `PageChatHistoryList.vue`). Drop it; revisit only if users miss it.
- Per-page chat-resume continuity. The user's last global conversation persists; switching notebooks doesn't auto-load a notebook-specific conversation.
- Streaming responses / CodeMirror 6 — separate items in [[HISTORY_MARKDOWN_ARCHITECTURE]] §14.

### Scannable Outline

- **Frontend deletes:** `client/src/components/PageEditor/PageChatPanel.vue`, `PageChatHistoryList.vue`, `EditorSplitView.vue` *(the file is actually `client/src/components/Common/SplitView.vue` — check whether any other consumer still needs it before deleting; if not, drop it; if yes, just remove the import from `PageEditorView`)*. The "Chat" button in `PageEditorView.vue` toolbar. The `agent_type=page_assistant` query param and `payload.page_id` from all chat callers. Chat-related state in `pageEditorStore`: `showChatPanel`, `chatError`, `currentChatExchangeIds`, `dismissedChatProposals` *(see Proposals section — keep the store getters/setters, lose the panel-toggle state)*, `pageChatHistory`, `isLoadingChatHistory`, `showChatHistory`, `chatHistoryError`, `loadPageChatHistory`, `deletePageChatExchanges`, `toggleChatHistory`.
- **Frontend adds:** `contextType: "notebook"` in `useActiveContext.ts`. Proposal-rendering support inside the shared `ChatMessageCell` (or a thin extension) so notebook proposals appear in the global chat when context matches.
- **Frontend reuses:** the existing docked/center `GalaxyAI.vue` mount in `Analysis.vue`; `chatStore` for visibility + location; `ChatInput` mentions UX.
- **Backend touches:** `chat.py` — branch on `interface_context.contextType === "notebook"` the way it currently branches on `payload.page_id`. `prompts/router.md` — one rule for notebook handoff. `router.py` `_handoff_context` already propagates, no code change needed.
- **Back-compat:** one release where `payload.page_id` and `agent_type=page_assistant` still work server-side. Frontend stops sending them in the same PR as the editor cleanup.
- **Sequencing:** (1) extend useActiveContext + router prompt + server branch (additive), (2) wire proposal rendering in shared ChatMessageCell, (3) delete editor-embedded chat, (4) remove server back-compat next release.

---

## Table of Contents

1. [Current State](#1-current-state)
2. [Converged Request Contract](#2-converged-request-contract)
3. [Backend Changes](#3-backend-changes)
4. [Frontend Changes](#4-frontend-changes)
5. [Proposals in the Shared Chat](#5-proposals-in-the-shared-chat)
6. [Migration Sequencing](#6-migration-sequencing)
7. [Test Plan](#7-test-plan)
8. [Rejected Options](#8-rejected-options)
9. [Open Questions](#9-open-questions)

---

## 1. Current State

Both surfaces hit the same endpoint with different shapes:

| Surface | Endpoint | Distinguishing fields | Persistence |
|---|---|---|---|
| Docked GalaxyAI (PR #22096) | `POST /api/chat?agent_type=auto` | `context: JSON.stringify({contextType: "tool" \| "dataset" \| ...})`, `entity_context` | `chat_manager.create_general_chat` |
| PageChatPanel (in dev) | `POST /api/chat?agent_type=page_assistant` | `page_id: 42` (top-level) | `chat_manager.create_page_chat` → sets `ChatExchange.page_id` |

Server handling already branches on `payload.page_id`: looks up the page, derives `history_id` + exported `page_content`, injects into `full_context`, persists via `create_page_chat`. Router agent in #22096 already propagates `context` through `_handoff_context` so a specialist gets it on handoff.

Histories: `GET /api/chat/history` global, `GET /api/chat/page/{page_id}/history` scoped — same table, filter view. We drop the scoped UI but keep the endpoint (cheap to leave; useful later).

Component-level overlap already done by history_pages: `ChatInput.vue`, `ChatMessageCell.vue`, `ActionCard.vue`, `agentTypes.ts`, `chatTypes.ts`, `chatUtils.ts` are extracted under `GalaxyAI/`. After this plan, `PageChatPanel.vue` deletion means those shared components have one consumer (`GalaxyAI.vue`), which is the natural end state of the extraction.

## 2. Converged Request Contract

One shape on the wire:

```
POST /api/chat?agent_type=auto
{
  query, exchange_id,
  context: JSON.stringify({
    contextType: "notebook",      // new value, alongside "tool" | "dataset" | ...
    pageId: 42,
    historyId: 7,
  }),
  entity_context: { datasets, histories },   // unchanged
}
```

No `payload.page_id`. No `agent_type=page_assistant` from the client. Router reads `interface_context` and decides.

Page content stays a server-side lookup from `pageId` (not client-supplied — otherwise users could spoof what the agent sees vs the editor).

`ChatExchange.page_id` persists as today; the existing `create_page_chat` path runs when `interface_context.contextType === "notebook"`.

## 3. Backend Changes

### 3.1 `lib/galaxy/webapps/galaxy/api/chat.py`

In `query(...)`:

- After parsing `payload.context` into `interface_context`, if `interface_context.get("contextType") == "notebook"`:
  - `page_id = interface_context["pageId"]`
  - Run the existing access check (`self.chat_manager.get_accessible_page(trans, page_id)`)
  - Run the existing `history_id` + `page_content` injection block
  - Persist via `chat_manager.create_page_chat` (same as today's `page_id` branch)
- Keep the legacy `payload.page_id` branch for one release. When both are present, prefer `interface_context.pageId` and log a deprecation warning.

### 3.2 `lib/galaxy/agents/prompts/router.md`

Add one rule: when interface context is a notebook (`contextType=="notebook"`), prefer handing off to `PAGE_ASSISTANT`. Router's `_handoff_context` propagation (already in #22096) carries `pageId`/`historyId`/`page_content` to the specialist.

### 3.3 `lib/galaxy/agents/page_assistant.py`

Already reads `history_id` + `page_content` from the agent context dict. No code change expected — verify via handoff test.

### 3.4 Schema

`ChatPayload.context` stays a free-form string (already accepts JSON). No Pydantic model change. The notebook context shape is documented in a frontend type only:

```ts
type ActiveContext =
  | { contextType: "tool"; ... }
  | { contextType: "dataset"; ... }
  | { contextType: "workflow_editor"; ... }
  | { contextType: "workflow_run"; ... }
  | { contextType: "job"; ... }
  | { contextType: "notebook"; pageId: string; historyId: string };   // NEW
```

## 4. Frontend Changes

### 4.1 `useActiveContext.ts`

Add a notebook branch:

```ts
if (path.startsWith("/histories/") && params.historyId && params.pageId) {
    return { contextType: "notebook", pageId: params.pageId, historyId: params.historyId };
}
```

Add `"notebook"` to `contextIcon` switch in `GalaxyAI.vue` (book/file icon). Add a `contextLabel` case ("Notebook: …" — title looked up via `pageEditorStore` or new lightweight composable).

### 4.2 `PageEditorView.vue`

Delete:
- The Chat toolbar button and `store.toggleChatPanel` wiring.
- The right-side `<EditorSplitView>` / `<SplitView>` block that mounts `<PageChatPanel>`.
- The mutual-exclusion logic between `showChatPanel` and `showRevisions` (revisions panel keeps its own toggle; chat is no longer competing for the slot).

After cleanup, PageEditorView is just: toolbar + (revisions side panel | editor body). The chat surface lives at Analysis level — visible or not based on user's current global chat state.

### 4.3 Files to delete

- `client/src/components/PageEditor/PageChatPanel.vue`
- `client/src/components/PageEditor/PageChatHistoryList.vue`
- `client/src/components/PageEditor/PageChatPanel.test.ts`
- `client/src/components/PageEditor/PageChatHistoryList.test.ts`
- Possibly `client/src/components/Common/SplitView.vue` — only if no other consumer. Grep before deleting; it's a general primitive.

### 4.4 `pageEditorStore.ts`

Remove panel-toggle state and chat-history-sidebar state (full list in the Scannable Outline above). Keep:
- `getDismissedProposals` / `addDismissedProposal` / `clearDismissedProposals` (still the owner of per-page proposal dismissal — see §5).
- The DJB2 hash + staleness compute logic — same reason. Move from `PageChatPanel.vue:252-267` into the store or a small composable.

### 4.5 `Analysis.vue`

No changes for the notebook case. The docked right/bottom GalaxyAI mounts stay as #22096 wires them. The chat just gains notebook awareness via the context composable.

## 5. Proposals in the Shared Chat

The notebook-specific UX feature that doesn't dissolve is *proposals* — `section_patch` and `full_replacement` agent outputs that today render as `ProposalDiffView` / `SectionPatchView` inside `PageChatPanel`, with Apply / Dismiss controls and staleness gating against the current notebook content.

After convergence, these messages still arrive in `GalaxyAI.vue`. Recommended approach:

1. **Detect proposal messages in `ChatMessageCell.vue`** by inspecting the agent response payload. When `agent_type === "page_assistant"` and the message has a `mode` discriminator of `section_patch` / `full_replacement`, render via the existing `ProposalDiffView` / `SectionPatchView` components.
2. **Source the page context from `pageEditorStore`.** Components read `pageId` + current `pageContent` via the store directly. If the user is *not* currently editing the matching notebook, render the proposal as a plain message (diff visible, Apply/Dismiss disabled with a tooltip "Open this notebook to apply").
3. **Dismissed-proposal state stays in `pageEditorStore`** (keyed per `pageId`, same shape as today, no migration needed).
4. **When the user is not in the matching notebook**, the proposal still renders (diff visible, message readable) but Apply/Dismiss are disabled with a tooltip — e.g. "Open this notebook to apply." Hover affordance preserves "this is a real, actionable proposal" without enabling accidental cross-notebook applies.

This keeps the chat surface generic while letting page-assistant proposals retain their interactive UI when the user is in the right notebook. The coupling is one-way (chat reads pageEditorStore when needed), not a return to two stores fighting.

## 6. Migration Sequencing

Stacked PRs, each independently mergeable:

| PR | Scope | Risk |
|---|---|---|
| 1 | Backend: accept `interface_context.contextType=="notebook"` alongside `payload.page_id`. Add router prompt rule. Unit tests for both shapes. | Low — additive |
| 2 | Frontend: extend `useActiveContext` with notebook branch; surface notebook label/icon in `GalaxyAI.vue`. No PageEditorView change yet. | Low — additive |
| 3 | Frontend: wire proposal rendering into shared `ChatMessageCell` with pageEditorStore lookup; gate Apply/Dismiss on matching notebook context. | Med — touches shared chat |
| 4 | Frontend: delete PageChatPanel + PageChatHistoryList + editor Chat button + SplitView usage in PageEditorView + chat-related state in pageEditorStore. Stop sending `payload.page_id` and `agent_type=page_assistant`. | Med — UI removal |
| 5 | Backend: remove legacy `payload.page_id` branch. Bump deprecation warning to error. | Low — single release later |

PR 4 is the only one that visibly changes user flow; gate on selenium suite (history_pages added 30 selenium tests in `test_history_pages.py`). Several of those tests assert the editor-embedded chat — they'll need rewriting against the new global-chat-with-context model.

## 7. Test Plan

### Backend

- `test/unit/app/test_agents.py`: extend with a notebook-context router test that asserts handoff to `PAGE_ASSISTANT` and that `page_content` reaches the specialist.
- `test/unit/app/test_chat_manager.py`: existing `create_page_chat` tests stay; add one for the new `interface_context` path producing the same `ChatExchange.page_id`.
- API integration: extend `test_pages_history_attached.py` with a "chat via interface_context" case that mirrors the existing `agent_type=page_assistant` test.

### Frontend

- `useActiveContext.test.ts`: add notebook-route case.
- `GalaxyAI.test.ts`: extend with notebook-context mount → asserts `/api/chat` payload carries `interface_context.contextType==="notebook"`; asserts proposal messages render `ProposalDiffView`/`SectionPatchView` when `pageEditorStore` has matching `pageId`.
- Delete `PageChatPanel.test.ts`, `PageChatHistoryList.test.ts`. Migrate proposal-staleness assertions into the GalaxyAI test.

### Selenium

- Rewrite the notebook-chat scenarios in `test_history_pages.py` against the new flow: open chat via activity bar (not editor toolbar), assert proposal renders in the global chat panel, assert Apply works, assert switching to non-notebook context disables Apply on the same proposal.
- One new scenario: docked chat is open, navigate from non-notebook context into a notebook, assert context indicator updates and next query routes to page_assistant.

## 8. Rejected Options

### A. MIRROR_THREE_LOCATIONS_IN_NOTEBOOK

Add center/right/bottom modes to PageChatPanel using FlexPanel + chatStore-style location persistence. Notebook chat becomes a fourth location.

Why rejected: duplicates location plumbing while leaving two conversations, two stores, two `/api/chat` callers, two histories. Doesn't move toward "one chat that knows the notebook" — moves away.

### B. KEEP_EDITOR_EMBEDDED_MOUNT

Replace `PageChatPanel` with `<GalaxyAI panel />` mounted inside `PageEditorView`'s SplitView. Single chat instance per notebook, embedded UI feel preserved.

Why rejected: still two mounts of the same component (right-dock + editor-embed) when both are wanted, requiring re-parenting or hiding logic. Adds an editor-local Chat button that competes with the activity bar GalaxyAI control. "What happens when I click Chat in the notebook and GalaxyAI is already open?" has no clean answer. Drop the editor-local UI entirely; let the chat *reflect current state*.

### C. SERVER_SIDE_AGENT_TYPE_INFERENCE_KEEP_CLIENT_API

Keep `payload.page_id` as the client-facing field; server infers `agent_type` from presence of `page_id`. No interface_context unification.

Why rejected: PR #22096 already established `interface_context` as the general mechanism for "what is the user looking at." Notebook is one of those things. Carving out a special-case top-level field for one context type is the divergence we're trying to undo.

### D. SEPARATE_NOTEBOOK_CHAT_ENDPOINT

`POST /api/notebooks/{page_id}/chat` for notebook chat; existing `/api/chat` stays general.

Why rejected: doubles persistence paths and history endpoints with no upside; routing-via-router is what makes the "agent picks the right specialist" story work for *any* context type.

### E. CLIENT_PUSHES_PAGE_CONTENT

Frontend sends current `page_content` in the chat payload so the agent sees exactly what's on screen.

Why rejected: trust boundary — lets a client spoof the document the agent sees vs the document being saved. Server-side lookup from `pageId` keeps the two in sync (and the existing hash-based stale-proposal check still works against the editor's current content).

### F. KEEP_PER_NOTEBOOK_CHAT_HISTORY_UI

Keep `PageChatHistoryList.vue` as a notebook-scoped history sidebar.

Why rejected: per [user preference] keep the scope minimal for first cut. The endpoint stays; the UI doesn't. Revisit only if users miss it. The global chat history (sortable, searchable) plus the page-context-aware router should usually be enough — the user can scroll back to find prior notebook chats by content.

## 9. Open Questions

- **Dismissed-proposals migration shape** — keep current store API (`getDismissedProposals(pageId)` etc.) or refactor to a composable wrapping store state? Either works; composable is cleaner if multiple chat consumers ever materialize.
- **Title lookup for the notebook context label** — does GalaxyAI need to fetch the page title, or is it always available via pageEditorStore (i.e. is the store always populated when the route shows a notebook)? Check on initial route landing where store hydration may lag.
- **Deprecation timeline for `payload.page_id` / `agent_type=page_assistant`** — recommend one release, leaning toward removing in the same dev cycle as PR 4 since this is unstable/BETA API. Confirm.
### Dissolved (resolved by "drop the embed entirely" decision)

- ~~Two GalaxyAI instances at once~~ — there's only one mount.
- ~~Default chat-location when opening a notebook~~ — chat reflects current state, no notebook-specific default.
- ~~Per-notebook chat-history filter UI~~ — dropped for first cut.
- ~~Chat history scope when navigating notebook A → B~~ — chat surface untouched; conversation only changes via explicit user action.
- ~~Naming of GalaxyAI embed prop (`panel` vs `embed` vs `notebook`)~~ — no embed, so no prop needed.
- ~~SplitView vs FlexPanel for in-editor chat~~ — no in-editor chat.
