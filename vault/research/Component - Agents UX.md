---
type: research
subtype: component
tags:
  - research/component
  - galaxy/client
component: Agents UX
status: draft
created: 2026-02-13
revised: 2026-02-13
revision: 1
ai_generated: true
---

# Galaxy Agents UX: Comprehensive Report

## Overview

Galaxy's agent/AI features span four distinct UX surfaces:

1. **ChatGXY** -- full-page conversational assistant (the primary agent UX)
2. **GalaxyWizard** -- inline error analysis widget embedded in the DatasetError view
3. **CustomToolEditor** -- "Generate via AI" button in the tool YAML editor
4. **Jupyternaut adapter** -- transparent AI proxy for JupyterLite visualizations (no Galaxy-native UI)

All four are gated behind the `llm_api_configured` config flag, which is true when `ai_api_key`, `ai_api_base_url`, or `inference_services` is set. All backend endpoints use `unstable=True`, marking them as experimental in the OpenAPI spec.

---

## 1. ChatGXY: Full-Page Chat Interface

### File locations

| File | Purpose |
|------|---------|
| `client/src/components/ChatGXY.vue` (982 lines) | Main chat page component |
| `client/src/components/ChatGXY/ActionCard.vue` (126 lines) | Action suggestion button cards |
| `client/src/composables/agentActions.ts` (241 lines) | Action dispatch logic for suggestion buttons |
| `client/src/composables/markdown.ts` | Shared markdown renderer used for all agent output |
| `client/src/stores/activitySetup.ts` | Registers ChatGXY in the activity bar |
| `client/src/entry/analysis/router.js` | Routes `/chatgxy` to the component |
| `client/src/components/ActivityBar/ActivityBar.vue` | Conditionally hides ChatGXY when AI is not configured |

### Navigation and Discovery

ChatGXY is registered as an activity bar entry:
```ts
{ id: "chatgxy", title: "ChatGXY", to: "/chatgxy", icon: faComments,
  anonymous: false, optional: true, panel: false }
```

The `ActivityBar.vue` conditionally filters it out:
```ts
if (activity.id === "chatgxy" && !config.value?.llm_api_configured) { return false; }
```

This means ChatGXY only appears in the sidebar when the server has AI configured. Anonymous users cannot access it (`anonymous: false`), and the route has `redirectAnon()` protection.

### Visual Design: Notebook-Style Cells

ChatGXY uses a **notebook-cell metaphor** rather than a traditional chat bubble UI:

- **Query cells** (user input): Left-bordered in `$brand-primary` color, light primary background
- **Response cells** (assistant output): Left-bordered in `$brand-secondary`, panel background color
- Both use a **cell-label** header showing an icon + label (e.g., "Error Analysis", "Router")
- Cells fade in with a `translateY(4px)` animation

This is a deliberate design choice aligning with Galaxy's computational notebook heritage.

### Agent Type Selector

The UI provides a dropdown of six agent types, each with an icon:

| Value | Label | Icon | Description |
|-------|-------|------|-------------|
| `auto` | Auto (Router) | `faMagic` | Intelligent routing |
| `router` | Router | `faRoute` | Query router |
| `error_analysis` | Error Analysis | `faBug` | Debug tool errors |
| `custom_tool` | Custom Tool | `faPlus` | Create custom tools |
| `dataset_analyzer` | Dataset Analyzer | `faChartBar` | Analyze datasets |
| `gtn_training` | GTN Training | `faGraduationCap` | Find tutorials |

**Note**: `dataset_analyzer` and `gtn_training` are listed in the UI but are NOT implemented as backend agents. The `dataset_analyzer` is a forward-looking placeholder; the GTN agent was removed before merge. PR #21706 (not yet merged) renames `dataset_analyzer` to `data_analysis` and replaces `faChartBar` with `faMicroscope`.

The selected agent type is sent as a query parameter on `POST /api/chat`. When set to `auto`, the router agent decides which specialist to invoke.

### Conversation Flow

1. **On mount**: attempts to load the most recent chat from history. If none exists, shows a welcome message listing capabilities.
2. **User types a query**: textarea with Enter-to-submit (Shift+Enter for newline). Send button shows spinner while `busy`.
3. **Request**: `POST /api/chat` with `{ query, context: null, exchange_id }` in body and `agent_type` in query params.
4. **Loading state**: A skeleton animation (3 `BSkeleton` wave bars) appears in a response cell, labeled with the selected agent type.
5. **Response arrives**: A new response cell renders the content as markdown. The cell label shows the actual responding agent type (which may differ from `auto` if routing occurred).
6. **Multi-turn**: The `exchange_id` from the first response is reused in subsequent queries, maintaining conversation context.

### Response Cell Anatomy

Each assistant response cell contains:

```
[Agent Icon] [Agent Label]  [optional: "via Router" badge]
+--------------------------------------------------+
| Markdown-rendered content                         |
|                                                   |
| +-----------------------------------------------+|
| | Suggested Actions                              ||
| | [Run Tool] [View Documentation] [Open Link]   ||
| +-----------------------------------------------+|
+--------------------------------------------------+
[Thumbs Up] [Thumbs Down]        [Agent Type] [Model Name] [Token Count]
```

- **Routing badge**: "via Router" appears when `metadata.handoff_info` exists, indicating the response was routed from the router agent to a specialist.
- **Action suggestions**: Rendered by `ActionCard.vue`, sorted by priority. Only shown when `suggestions[]` is non-empty.
- **Feedback buttons**: Thumbs up/down, persisted to backend via `PUT /api/chat/exchange/{exchange_id}/feedback`. Disabled after submission. Shows "Thanks!" text.
- **Response stats**: Small footer showing agent type, model name (extracted from paths like `openai/gpt-4`), and token count from `metadata.total_tokens`.
- **System/welcome messages**: Have `isSystemMessage: true` and do NOT show feedback buttons or stats.

### Action Suggestions (ActionCard.vue)

Actions are typed buttons rendered in a card below the response content:

| Action Type | Icon | Frontend Behavior |
|-------------|------|-------------------|
| `TOOL_RUN` | `faPlay` | Navigates to tool panel with `tool_id` query param |
| `SAVE_TOOL` | `faSave` | Parses YAML from `metadata.tool_yaml`, POSTs to `/api/unprivileged_tools`, redirects to tool editor |
| `CONTACT_SUPPORT` | `faLifeRing` | Opens `config.support_url` or galaxyproject.org/support in new tab |
| `VIEW_EXTERNAL` | `faExternalLinkAlt` | Opens `parameters.url` in new tab |
| `DOCUMENTATION` | `faBook` | If `tool_id` present, navigates to tool help; otherwise opens GTN |
| `REFINE_QUERY` | `faPencilAlt` | Shows toast "Please refine your query..." (**Note**: REFINE_QUERY was removed from backend in PR #21692 but still exists in frontend enum) |

Buttons are styled by priority: priority 1 gets `btn-outline-primary`, others get `btn-outline-secondary`. All buttons disabled while `processingAction` is true.

Toast notifications provide feedback for action execution (success/error messages via `useToast`).

### Conversation History Sidebar

Toggled by the History button in the header. When opened:

- **280px wide** sidebar on the left of the chat area
- **History list**: Each item shows truncated query text, agent icon, and elapsed time via `UtcDate`
- **Clear History button**: Deletes all non-job chat exchanges after confirmation dialog
- **Click to load**: Fetches full conversation via `GET /api/chat/exchange/{id}/messages` and rebuilds the message list
- **Fallback**: If full conversation fetch fails, falls back to loading just the first query/response pair

### New Chat

"New" button in the header clears messages, resets `currentChatId`, and shows a fresh welcome message.

### Error Handling

- API errors surface as red response cells with content prefixed by a red X emoji
- Error cells do NOT show feedback buttons (checked via `!message.content.startsWith(...)`)
- Network/unexpected errors also render as error cells
- All errors populate `errorMessage` ref but it is not separately rendered outside the cell

---

## 2. GalaxyWizard: Inline Error Analysis

### File locations

| File | Purpose |
|------|---------|
| `client/src/components/GalaxyWizard.vue` (170 lines) | Error analysis widget |
| `client/src/components/DatasetInformation/DatasetError.vue` (206 lines) | Host view that embeds the wizard |

### Context and Visibility

The GalaxyWizard is embedded inside the `DatasetError.vue` component. It only appears when:
```ts
const showWizard = computed(() => isConfigLoaded.value && config.value?.llm_api_configured && !isAnonymous.value);
```

It is presented under a "Possible Causes" heading with the disclaimer: "We can use AI to analyze the issue and suggest possible fixes. Please note that the diagnosis may not always be accurate."

### Interaction Flow

1. User views a failed dataset's error page
2. A blue "Let our Help Wizard Figure it out!" button is shown
3. On click, sends `POST /api/ai/agents/error-analysis` with:
   - `query`: the tool's stderr
   - `job_id`: the creating job's ID
   - `error_details.context_type`: "tool_error"
4. While waiting: skeleton loading animation (3 wave bars, same pattern as ChatGXY)
5. Response: rendered as markdown in a `chatResponse` div
6. Error metadata checked: if `metadata.error` exists, shows monospace error message below a dashed divider

### Feedback

After a successful response, shows "Was this answer helpful?" with thumbs up/down buttons:
- Animated swoosh on click
- Persists to `PUT /api/chat/{job_id}/feedback`
- Shows "Thank you for your feedback!" after submission
- Disabled after first click

### Design Differences from ChatGXY

- **Not conversational**: Single query/response, no multi-turn
- **Embedded widget**: Not a full page, lives inside the DatasetError view
- **No action suggestions**: Does not render ActionCard
- **Direct endpoint**: Uses `/api/ai/agents/error-analysis` instead of `/api/chat`
- **Simpler layout**: No notebook-cell styling, just a button + response area

---

## 3. CustomToolEditor: AI-Assisted Tool Generation

### File location

| File | Purpose |
|------|---------|
| `client/src/components/Tool/CustomToolEditor.vue` (242 lines) | YAML tool editor with AI generation |

### Interaction Flow

1. User opens the tool editor (accessible via unprivileged tools)
2. A lightbulb icon button ("Generate via AI") appears in the toolbar
3. On click: browser `prompt()` dialog asks "Describe the tool you would like to build"
4. Sends `POST /api/ai/agents/custom-tool` with `{ query: userPrompt }`
5. While generating: button is disabled (`generating` ref)
6. On success: if `metadata.tool_yaml` exists, replaces the Monaco editor content with the generated YAML
7. On model capability error: shows alert "The configured AI model doesn't support tool generation..."
8. On other errors: shows the response `content` as an error message

### UX Characteristics

- **Inline prompt**: Uses native browser `prompt()` for input (no custom modal)
- **No streaming**: Waits for full response before updating editor
- **Error alerts**: Uses Bootstrap `b-alert` with dismissible variant
- **No feedback mechanism**: Unlike ChatGXY and GalaxyWizard, no thumbs up/down

---

## 4. Jupyternaut Adapter: Plugin AI Proxy

### File location

| File | Purpose |
|------|---------|
| `lib/galaxy/webapps/galaxy/api/plugins.py` | OpenAI Chat Completions proxy endpoint |

### UX Surface

This is **transparent to Galaxy's UI**. The endpoint exists at:
```
POST /api/plugins/{plugin_name}/chat/completions
```

It proxies OpenAI-format requests from the Jupyternaut AI assistant running inside JupyterLite visualizations. Galaxy controls the system prompt (injecting `GALAXY_PROMPT` + plugin-specific `ai_prompt` from XML config) and ignores client-supplied system prompts.

The user interacts with Jupyternaut's own chat UI inside JupyterLite. Galaxy's role is purely backend: rate limiting (30/min), message validation, token capping, and prompt injection. No Galaxy-native UI surfaces are involved.

---

## 5. Upcoming: Data Analysis Agent (PR #21706, not merged)

PR #21706 proposes significant UX expansion that is NOT yet in the codebase:

### Planned UX additions

- **Dataset selector** in ChatGXY: `FormData` component for picking history datasets
- **Pyodide execution** in browser: Web Worker runs Python (WASM) for data analysis
- **Artifact display**: Image previews, download buttons for generated files
- **Analysis steps UI**: Collapsible Thought/Action/Observation/Conclusion steps
- **WebSocket streaming**: Real-time updates during execution via per-exchange WS
- **Busy state**: `isChatBusy` blocks input during multi-step execution

This would transform ChatGXY from a Q&A interface into an interactive analysis notebook.

---

## Cross-Cutting UX Patterns

### Markdown Rendering

All agent UX surfaces use the shared `useMarkdown` composable (`client/src/composables/markdown.ts`):
```ts
const { renderMarkdown } = useMarkdown({ openLinksInNewPage: true, removeNewlinesAfterList: true });
```
Content is rendered via `v-html="renderMarkdown(message.content)"` with MarkdownIt. Deep styles in ChatGXY handle code blocks, lists, and links.

### Loading States

Consistent skeleton animation pattern across all surfaces:
```html
<BSkeleton animation="wave" width="85%" />
<BSkeleton animation="wave" width="55%" />
<BSkeleton animation="wave" width="70%" />
```

### Feedback Pattern

Two feedback mechanisms:
1. **Job-based**: `PUT /api/chat/{job_id}/feedback` (GalaxyWizard)
2. **Exchange-based**: `PUT /api/chat/exchange/{exchange_id}/feedback` (ChatGXY)

Both use thumbs up (1) / thumbs down (0) with immediate UI update and server persistence.

### Conditional Feature Visibility

The `llm_api_configured` config flag controls visibility at multiple levels:
- **Activity bar**: ChatGXY entry hidden when AI not configured
- **DatasetError view**: GalaxyWizard section hidden when AI not configured
- **CustomToolEditor**: The generate button uses the endpoint directly (will fail gracefully if unconfigured)

### API Surface Summary

| Endpoint | UI Consumer | Purpose |
|----------|------------|---------|
| `POST /api/chat` | ChatGXY | Main conversational endpoint |
| `GET /api/chat/history` | ChatGXY history sidebar | List past conversations |
| `DELETE /api/chat/history` | ChatGXY clear button | Delete conversation history |
| `GET /api/chat/exchange/{id}/messages` | ChatGXY history loading | Full conversation retrieval |
| `PUT /api/chat/exchange/{id}/feedback` | ChatGXY feedback buttons | Per-exchange feedback |
| `PUT /api/chat/{job_id}/feedback` | GalaxyWizard | Job-based feedback |
| `POST /api/ai/agents/error-analysis` | GalaxyWizard | Direct error analysis |
| `POST /api/ai/agents/custom-tool` | CustomToolEditor | AI tool generation |
| `GET /api/ai/agents` | (unused in current UI) | List available agents |
| `POST /api/ai/agents/query` | (DEPRECATED) | Unified query endpoint |
| `POST /api/plugins/{name}/chat/completions` | JupyterLite Jupyternaut | Plugin AI proxy |

### State Management

ChatGXY uses **component-local state only** (no Pinia/Vuex store for agent data):
- `messages: ref<Message[]>` -- reactive array of all messages
- `currentChatId: ref<number | null>` -- current exchange ID for multi-turn
- `chatHistory: ref<ChatHistoryItem[]>` -- sidebar history list
- `busy: ref<boolean>` -- loading state
- `selectedAgentType: ref<string>` -- dropdown selection

The `agentActions.ts` composable manages `processingAction: ref<boolean>` for action button state.

The only store interaction is `useUnprivilegedToolStore` (used by SAVE_TOOL action to refresh the tool list after saving).

---

## Summary of UX Maturity

| Surface | Maturity | Notes |
|---------|----------|-------|
| ChatGXY | Beta | Full-featured but experimental. Notebook-cell design, multi-turn, history, feedback, action suggestions. All endpoints `unstable=True`. |
| GalaxyWizard | Stable-ish | Simple single-shot error analysis. Pre-dates the agent framework (adapted to use new endpoint). |
| CustomToolEditor | Minimal | Browser `prompt()` input, no streaming, no feedback. |
| Jupyternaut proxy | Transparent | No Galaxy-native UI. Server-side prompt injection only. |
| Data Analysis (PR #21706) | Not merged | Would add dataset selection, browser-side Python execution, WebSocket streaming, artifact display. |
