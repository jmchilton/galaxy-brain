# Hide Markdown Toolbox When Chat Panel Open

> **Branch:** `history_pages`
> **Goal:** Reclaim horizontal space in the editor when the chat panel is open by hiding the left-side directives toolbox (`MarkdownToolBox`).

---

## 1. Current Structure

`PageEditorView.vue:320-350` chooses between two layouts based on `store.showChatPanel`:

- **Chat open:** `<EditorSplitView>` 60/40 split with `<MarkdownEditor>` on the left and `<PageChatPanel>` on the right.
- **Chat closed:** `<MarkdownEditor>` fills the row, optional `<PageRevisionList>` sidebar on the right.

The editor itself is layered:

```
MarkdownEditor.vue
  └── TextEditor.vue
        ├── <FlexPanel side="left">     ← MarkdownToolBox (directives sidebar, ~300px)
        │     └── MarkdownToolBox
        └── <textarea>                  ← actual editor surface
```

So with chat open the user sees, left to right: toolbox sidebar (~300px) | textarea (60% of remainder) | drag handle | chat (40%). The toolbox is the obvious thing to drop.

---

## 2. Approach

Thread a `hideToolbox` prop from `PageEditorView` down through `MarkdownEditor` to `TextEditor`. `TextEditor` renders `<FlexPanel>` only when not hidden.

**Why not CSS-only:** `FlexPanel` does its own width/drag bookkeeping; conditionally rendering with `v-if` is cleaner than fighting it with `display: none` overrides.

**Why not a slot refactor:** TextEditor + MarkdownEditor are shared with the Workflow Editor; a slot redesign is bigger surface area than the problem warrants.

**Why a prop rather than reading the store directly in TextEditor:** `MarkdownEditor`/`TextEditor` are generic components used by Workflow Editor too. Coupling them to `pageEditorStore` would leak page-editor concerns into shared code.

---

## 3. Patches

### Patch 1 — `TextEditor.vue`

Add a prop, conditionally render the `FlexPanel`:

```ts
const props = defineProps<{
    markdownText: string;
    mode: DirectiveMode;
    steps?: Record<string, any>;
    title: string;
    hideToolbox?: boolean;     // new
}>();
```

```html
<template>
    <div class="d-flex h-100 w-100">
        <FlexPanel v-if="!hideToolbox" side="left">
            <MarkdownToolBox :steps="steps" @insert="insertMarkdown" />
        </FlexPanel>
        <textarea ... />
    </div>
</template>
```

### Patch 2 — `MarkdownEditor.vue`

Pass-through prop:

```ts
const props = defineProps<{
    markdownText: string;
    mode: DirectiveMode;
    labels?: Array<WorkflowLabel>;
    steps?: Record<string, any>;
    title: string;
    hideToolbox?: boolean;     // new
}>();
```

```html
<TextEditor
    v-if="editor === 'text'"
    :title="title"
    :markdown-text="markdownText"
    :steps="steps"
    :mode="mode"
    :hide-toolbox="hideToolbox"
    @update="$emit('update', $event)" />
```

### Patch 3 — `PageEditorView.vue`

Only the chat-open branch passes `:hide-toolbox="true"`:

```html
<EditorSplitView v-if="store.showChatPanel">
    <template v-slot:editor>
        <MarkdownEditor
            :markdown-text="store.currentContent"
            :mode="markdownEditorMode"
            :title="editorTitle"
            :hide-toolbox="true"      <!-- new -->
            @update="handleContentUpdate" />
    </template>
    ...
</EditorSplitView>
```

The non-chat branch (line 335) stays unchanged.

Workflow Editor's `<MarkdownEditor>` usage at `client/src/components/Workflow/Editor/Index.vue:122` is unaffected — `hideToolbox` defaults to `false`.

---

## 4. Tests

### 4a. `TextEditor.test.ts` (existing)

Add two cases:
- Mounts with `hideToolbox: false` (or unset) → `findComponent(FlexPanel)` exists.
- Mounts with `hideToolbox: true` → `findComponent(FlexPanel).exists()` is false.

### 4b. `PageEditorView.test.ts` (existing)

Add a test that toggles `store.showChatPanel = true` and asserts the rendered `MarkdownEditor` receives `hideToolbox: true` via `props()` or by asserting the `MarkdownToolBox` is no longer in the tree.

---

## 5. Manual Verification

1. Open a notebook, no chat. Toolbox visible on the left. Width ~300px.
2. Toggle chat panel open. Toolbox hides; editor expands to fill the 60% pane.
3. Toggle chat closed. Toolbox reappears.
4. Toggle revision panel open (also a right-side panel). Toolbox should *still* be visible (only chat hides it). Confirms the gate is `showChatPanel`, not "any side panel."
5. Workflow Editor (`/workflows/edit?id=...`): open the report editor mode. Toolbox still visible. Regression check.
6. Drag-and-drop from history panel into the textarea still works (drop target is `<textarea>`, independent of toolbox).

---

## 6. Out of Scope

- A user-controlled "show toolbox" toggle in the chat layout (e.g., button in the editor toolbar to re-expand). Defer to a follow-up if anyone misses the toolbox in chat mode.
- Persisting toolbox visibility preference across sessions. Current behavior is purely a function of `showChatPanel`.
- Resizing/repositioning the directives toolbox elsewhere (e.g., into the chat panel's tool list).

---

## 7. Resolved Decisions

- **Prop name: `hideToolbox`.** Matches existing codebase convention for visibility toggles: `hidePanel` (`ActivityBar.vue:52`), `hideName` (`ToolSection.vue:30`, `Tool.vue:30`), `hideSubmitButton` (`Workflow/Import/FromUrl.vue`), `hideHeader` (`GTable.vue`).
- **Scope: page editor only.** Workflow editor's `<MarkdownEditor>` call site (`Workflow/Editor/Index.vue:122`) stays unchanged. Prop defaults to `false` so no functional change there. Revisit if workflow editor ever gets a chat panel.
- **Mid-interaction safety: no concern.** `MarkdownToolBox` uses click + dialog, not HTML5 drag (grep confirms no `draggable`, `@dragstart`, `@dragend`). Unmounting the `<FlexPanel>` mid-click aborts any open `MarkdownDialog` cleanly via Vue's normal teardown — no dangling drag state, no DOM errors. Worst case: a user mid-click loses an open dialog. Not worth defending against.
