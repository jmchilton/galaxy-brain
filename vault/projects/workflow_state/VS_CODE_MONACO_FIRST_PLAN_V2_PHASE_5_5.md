# Phase 5.5 — Editor Toolbar

**Date:** 2026-04-16
**Parent plan:** `VS_CODE_MONACO_FIRST_PLAN_V2.md`
**Slot:** Between Phase 5 (CSS Audit) and Phase 6 (Keybindings).
**Status (2026-04-16):** Implemented on branch `vs_code_integration`. `EditorToolbar.vue` + `useEditorMarkers` composable landed; `MonacoEditor.vue` exposes `editor`/`model` via `defineExpose` so `FileView.vue` forwards them. Unit tests (5) green; `make check` + `make test` green. E2E spec `packages/gxwf-e2e/tests/monaco-toolbar.spec.ts` added (problems badge, palette, find, undo, save-PUT); gated by the existing `GXWF_E2E_MONACO=1` `.vsix` fixture. Plan-V2 doc updates (Phase 5.5 insert, 6.2 cross-link, Test Strategy row, Locked-Decisions note) landed alongside.

## Why insert here

Phase 6.2 already plans to override `workbench.action.files.save` and route ⌘S to gxwf-ui's save handler. The toolbar Save button and the ⌘S keybinding share that handler — design them together. Phase 6.4 keybinding tests then naturally cover "toolbar button vs. shortcut both fire once." Toolbar before Phase 6 also gives Phase 7's "v1 feature surface" a concrete UI to point at.

UX-wise, a toolbar lands earlier in user value than the remaining plan items (CSP smoke polish, Open VSX prod unpack, server-side fixture wiring). Surface this in plan ordering.

## Decision recorded — why no `views-service-override`

Considered three paths:

1. Pure custom Vue toolbar (chosen).
2. `views-service-override` with `attachPart(Parts.EDITOR_PART, …)` — gives breadcrumbs + editor-title actions for free; needs synthetic `.code-workspace` shim, re-does CSS audit, expands DOM ownership boundary.
3. Full workbench-service-override — explicitly rejected at Phase 0; `document.body.replaceChildren()` takeover.

Path 2 is real and lighter than full workbench, but for a single-file workflow editor it costs more than it returns. The "not building an IDE" constraint stays load-bearing. Reference: research summary in conversation history (six real `attachPart` consumers surveyed; closest match was ParaN3xus/tyraria, Vue 3, Typst editor).

If we ever want native VS Code breadcrumbs / editor-title actions, the upgrade path is monotonic: add `views-service-override`, attach `EDITOR_PART`, drop the relevant Vue toolbar buttons. Today's choice does not foreclose that path.

## What the embedded extension actually contributes

Verified from `galaxy-workflows-vscode` @ pinned `5040bd5`:

- **Diagnostics**: yes — validation rules in `server-common/providers/validation/rules/` plus YAML schema validation across all three languages. Render inline as squigglies; readable via `monaco.editor.onDidChangeMarkers` + `monaco.editor.getModelMarkers({ resource })`.
- **Code actions / quick fixes**: no. Zero `provideCodeActions` / `registerCodeActionProvider` registrations in the pinned tree. "Fixes" is not a feature today — only warnings/errors with messages.
- **Commands**: many, palette-only — `cleanWorkflow`, `previewCleanWorkflow`, `convertFileToFormat2`, `convertFileToNative`, `exportToFormat2`, `exportToNative`, `populateToolCache`, `selectForCleanCompare`, `compareCleanWith`. Already accessible via the existing `quickaccess-service-override`.

Implication: the toolbar should not duplicate clean/convert/export — those live in `OperationPanel` (gxwf-client driven, not LSP). The toolbar covers editor mechanics; the palette covers extension-contributed commands.

## Component layout

New `packages/gxwf-ui/src/components/EditorToolbar.vue`. Sibling to `MonacoEditor.vue`, not nested. PrimeVue `Toolbar` + `Button` + `Badge`.

```ts
defineProps<{
  editor: monaco.editor.IStandaloneCodeEditor | null;
  model: monaco.editor.ITextModel | null;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}>();
```

`MonacoEditor.vue` exposes the editor + model via `defineExpose({ editor, model })` so `FileView` reaches them through a template ref. Replaces the test-only `__gxwfMonaco` global as the production handle (test exposure stays under the env flag).

## Buttons (v1)

| # | Button | Implementation | Notes |
|---|---|---|---|
| 1 | **Save** (⌘S) | Calls `onSave` prop — reuses `FileView`'s existing `saveFile()` | Dirty dot reuses existing `editorContent !== checkpoint` logic |
| 2 | **Undo / Redo** | `editor.trigger("toolbar", "undo"/"redo", {})` | Disabled state from `model.canUndo()` / `model.canRedo()`, polled on `model.onDidChangeContent` |
| 3 | **Format Document** | `editor.getAction("editor.action.formatDocument")?.run()` | Hide button when action is null (no formatter registered yet); revisit when extension ships one |
| 4 | **Find** (⌘F) | `editor.getAction("actions.find")?.run()` | Existence guaranteed — built-in |
| 5 | **Command Palette** (⌘⇧P) | `editor.trigger("toolbar", "editor.action.quickCommand", {})` | Single button surfaces every Galaxy-Workflows extension command |
| 6 | **Problems indicator** | PrimeVue `Badge` bound to error/warning counts; click → `editor.getAction("editor.action.marker.next")?.run()` | The "status-bar replacement" piece — see composable below |

Skipped for v1: language picker (single-extension scope), encoding/EOL (workflow files are UTF-8/LF), cursor pos (low value vs. cost), inline buttons for clean/convert/export (lives in OperationPanel).

## Problems indicator — `useEditorMarkers`

New composable `packages/gxwf-ui/src/composables/useEditorMarkers.ts`:

```ts
function useEditorMarkers(model: Ref<ITextModel | null>): {
  errors: ComputedRef<number>;
  warnings: ComputedRef<number>;
  jumpToNext: () => void;
};
```

Subscribes to `monaco.editor.onDidChangeMarkers`, filters by `model.uri.toString()`, counts by `MarkerSeverity.Error` / `MarkerSeverity.Warning`. Disposes on unmount.

Click on the badge triggers `editor.action.marker.next`. A future Vue popover listing the marker rows is out of scope for v1 — same `getModelMarkers()` data, ~50 lines, drop in later if the count-only badge feels insufficient.

## FileView integration

`FileView.vue` already has a save toolbar above the editor (`<Button label="Save">`, `<Button label="Restore">`). Reorganize:

- **Always-shown** (current behavior): Save, Restore.
- **Monaco-only** (new): `<EditorToolbar>` rendered next to existing buttons when `monacoEnabled && !monacoFailed && editorRef.value`. The `EditorShell` fallback path keeps today's chrome verbatim — no chrome regressions for users on the textarea path.

Save button keeps the dirty dot indicator. Toolbar's own Save button delegates to the same handler — two surfaces, one action, no duplication.

## Tests

- **Unit** — `useEditorMarkers`: feed fake markers via `monaco.editor.setModelMarkers`, assert error/warning counts and `jumpToNext` dispatches.
- **E2E** — extend `packages/gxwf-e2e/tests/monaco-hover.spec.ts` rather than create a new spec (shares the `.vsix` fixture + readiness gate):
  - Type something invalid → wait for diagnostic squiggle → assert problems badge shows `1`.
  - Click Format → assert no-op for a no-formatter language; covers the "action present vs. absent" branch.
  - Click Palette → assert `.quick-input-widget` visible.
  - Click Save → assert `useContents.saveFile` fires (network mock or assertion on subsequent GET).
  - Click Undo after a typed change → assert content reverts.
- **Phase 6 carries**: toolbar Save button + ⌘S keybinding both call handler exactly once (Phase 6.4 keybinding tests).

## Plan-doc edits when this lands

- Insert "**Phase 5.5 — Editor Toolbar**" section in `VS_CODE_MONACO_FIRST_PLAN_V2.md` between Phase 5 and Phase 6.
- Cross-link from Phase 6.2: "Save target — toolbar button defined in 5.5 + ⌘S keybinding share handler."
- Add a row to the Test Strategy table.
- Add the `views-service-override` decision-recorded note to the "Locked Decisions" table at the top.

## Unresolved questions

1. Toolbar position — above editor inside FileView, or sticky inside MonacoEditor's host div?

User Input: Use whatever you feel will look the most cohesive.

2. Save dirty-dot — keep on Save button only, or also color the Problems badge red on errors?

User Input: Try to make it rich like this - I like the idea.

3. Format button when no formatter registered — hide entirely, or show disabled with tooltip?
4. Problems popover (list view, not just count) — v1 or 9-bucket?

User Input: We can defer this but let's track it in the main plan when we're done with this plan.

5. Toolbar visibility on read-only files — hide entirely, or grey-out write actions?

User Input: We don't support read-only files currently I don't think.

6. Keybinding tests in Phase 6.4 — assert toolbar buttons too, or keep keybindings-only?

