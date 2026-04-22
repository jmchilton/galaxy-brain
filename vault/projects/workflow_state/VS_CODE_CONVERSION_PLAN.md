# VS Code Workflow Conversion Plan: Export & Convert Commands

## Current State

Conversion infrastructure already exists end-to-end:

- **Commands**: `convertToFormat2` / `convertToNative` registered in `package.json`, wired in `setup.ts`
- **Client**: `ConvertWorkflowCommandBase` in `client/src/commands/convertWorkflow.ts` — sends LSP request, opens a **diff view** via virtual `galaxy-converted-workflow` document scheme
- **Server**: `ConvertWorkflowService` in `server-common/src/services/convertWorkflow.ts` — routes to language service
- **Language services**: Both call upstream `toFormat2Stateful()` / `toNativeStateful()` with `toolInputsResolver`
- **Unit tests**: Full coverage (client, server-common, both language services)
- **E2E tests**: None

### What's Missing

The existing commands are **preview-only** (diff view, virtual document, nothing written to disk). No way to:
1. **Export** — write the converted workflow as a new file alongside the original
2. **Convert** — replace the original file with the converted one (rename + rewrite)

No E2E tests for any conversion path.

---

## File Extension Mapping

| Format | Extension(s) | Language ID |
|--------|-------------|-------------|
| Native | `.ga` | `galaxyworkflow` |
| Format2 | `.gxwf.yml`, `.gxwf.yaml` | `gxformat2` |

Conversion must change the extension:
- `workflow.ga` -> `workflow.gxwf.yml`
- `workflow.gxwf.yml` -> `workflow.ga`

Edge case: `.gxwf.yaml` should export/convert to `.ga`, and native `.ga` should always target `.gxwf.yml` (canonical format2 extension).

---

## Plan

### Step 1 — Refactor: Extract conversion request into reusable helper

**Files**: `client/src/commands/convertWorkflow.ts`

The existing `ConvertWorkflowCommandBase.execute()` mixes LSP request logic with diff-view UI. Extract the LSP call into a shared helper so export/convert commands can reuse it.

```
async function requestConversion(
  client: BaseLanguageClient,
  contents: string,
  targetFormat: "format2" | "native"
): Promise<ConvertWorkflowContentsResult>
```

Keep the existing diff-preview commands unchanged — they call this helper then open the diff view.

**Tests**: Existing unit tests should still pass unchanged.

### Step 2 — Export commands: write converted file to disk

**New commands** (register in `package.json` and `setup.ts`):
- `galaxy-workflows.exportToFormat2` — "Export as Format2 (.gxwf.yml)"
- `galaxy-workflows.exportToNative` — "Export as Native (.ga)"

**Enablement**: Same pattern as existing convert commands — `resourceLangId == galaxyworkflow` for exportToFormat2, `resourceLangId == gxformat2` for exportToNative.

**Behavior**:
1. Call `requestConversion()` from Step 1
2. Compute target path: swap extension (`.ga` -> `.gxwf.yml` or vice versa)
3. If target file exists, prompt with `window.showWarningMessage` + "Overwrite" / "Cancel" options
4. Write file via `workspace.fs.writeFile()`
5. Open the new file in editor

**Implementation**: New class `ExportWorkflowCommandBase` extending `CustomCommand` in a new file `client/src/commands/exportWorkflow.ts`, with concrete `ExportToFormat2Command` / `ExportToNativeCommand`.

**Extension mapping helper** (shared, reusable):
```
function convertedFilePath(originalUri: Uri, targetFormat: "format2" | "native"): Uri
```
- `.ga` -> replace `.ga` with `.gxwf.yml`
- `.gxwf.yml` / `.gxwf.yaml` -> replace compound extension with `.ga`

**Tests (unit)**:
- Extension mapping: `.ga` -> `.gxwf.yml`, `.gxwf.yml` -> `.ga`, `.gxwf.yaml` -> `.ga`
- Overwrite prompt when file exists
- File written with correct contents
- Error display on conversion failure

### Step 3 — Convert commands: replace original file

**New commands**:
- `galaxy-workflows.convertFileToFormat2` — "Convert File to Format2"
- `galaxy-workflows.convertFileToNative` — "Convert File to Native (.ga)"

**VS Code best practices for destructive file operations**:
- Show confirmation dialog before proceeding: `window.showWarningMessage` with explicit "Convert" action button — user must click it, Escape/dismiss = cancel
- Message should name both files: "Convert workflow.ga to workflow.gxwf.yml? The original file will be deleted."
- Use `WorkspaceEdit` to make the operation atomic and undoable:
  - `WorkspaceEdit.createFile()` for the new file
  - `WorkspaceEdit.deleteFile()` for the old file
  - Apply via `workspace.applyEdit()` — this integrates with VS Code's undo stack
- If the file is in a git repo, git tracks the rename naturally

**Implementation**: New class `ConvertFileCommandBase` in `client/src/commands/convertFile.ts`. Flow:
1. Call `requestConversion()`
2. Compute target path via shared `convertedFilePath()`
3. If target exists, show warning and abort (don't silently overwrite on a destructive op)
4. Show confirmation dialog
5. Apply `WorkspaceEdit` with createFile + deleteFile
6. Open converted file in editor

**Tests (unit)**:
- Confirmation dialog shown
- Cancellation aborts without changes
- WorkspaceEdit contains both create and delete
- Aborts if target already exists

### Step 4 — Menu / command palette organization

**`package.json` updates**:

Commands section — add 4 new commands with appropriate enablement.

Menus — group conversion commands in editor context menu and command palette:
- "Preview Conversion" (existing diff commands) — available in command palette
- "Export as..." — available in command palette + editor context menu
- "Convert File to..." — available in command palette + editor context menu + explorer context menu

Consider using submenus for the editor context menu to avoid clutter:
```json
"submenu": [
  {
    "id": "galaxy-workflows.convert",
    "label": "Galaxy Workflow Conversion"
  }
]
```

All 6 conversion-related commands (2 preview, 2 export, 2 convert-file) go in the submenu.

### Step 5 — E2E tests for conversion preview (existing commands)

**New test data**:
- `test-data/json/conversion/simple_wf.ga` — minimal native workflow with 1-2 tool steps
- `test-data/yaml/conversion/simple_wf.gxwf.yml` — expected format2 output for the above
- `test-data/yaml/conversion/simple_wf.gxwf.yml` (source) + `test-data/json/conversion/simple_wf.ga` (expected) for reverse direction

Keep test workflows minimal — just enough structure to verify the conversion ran (class, steps present, correct format). Don't test conversion correctness exhaustively here; that's upstream's job.

**Tests** in `extension.ga.e2e.ts`:
```
test("Convert to Format2 preview opens diff view", async () => {
  // Open native workflow
  // Execute galaxy-workflows.convertToFormat2
  // Verify active editor is a diff editor (check tab label or URI scheme)
  // Verify converted content is valid YAML with expected class
});
```

**Tests** in `extension.gxformat2.e2e.ts`:
```
test("Convert to Native preview opens diff view", async () => {
  // Open format2 workflow
  // Execute galaxy-workflows.convertToNative
  // Verify diff editor opened
  // Verify converted content is valid JSON with expected format_version
});
```

### Step 6 — E2E tests for export commands

**Tests** in `extension.ga.e2e.ts`:
```
test("Export to Format2 creates .gxwf.yml file", async () => {
  // Open native workflow from a temp/writable location (copy fixture first)
  // Execute galaxy-workflows.exportToFormat2
  // Verify .gxwf.yml file exists on disk
  // Verify contents are valid YAML
  // Verify original .ga still exists
  // Cleanup: delete exported file
});
```

Mirror test for format2 -> native in `extension.gxformat2.e2e.ts`.

**Test helper needed**: Copy fixture to temp workspace dir before test, cleanup after. The existing test-data dir may be read-only or shouldn't accumulate generated files.

### Step 7 — E2E tests for convert-file commands

```
test("Convert file to Format2 replaces .ga with .gxwf.yml", async () => {
  // Copy fixture to temp dir
  // Open the copy
  // Execute galaxy-workflows.convertFileToFormat2
  // (Note: confirmation dialog — E2E may need to auto-accept or mock)
  // Verify .gxwf.yml exists
  // Verify .ga is gone
  // Verify active editor shows the .gxwf.yml file
  // Cleanup
});
```

**Challenge**: The confirmation `showWarningMessage` dialog. Options:
1. Add an optional `skipConfirmation` flag to the command args (test-only, not exposed in UI) — pragmatic and common in VS Code extensions
2. Or test only up to the point of dialog display and verify via mocks in unit tests

Recommend option 1 — an internal `{ confirmed: true }` arg that E2E tests pass. The UI never passes it so users always see the dialog.

---

## Unresolved Questions

- Should export/convert commands also clean the workflow during conversion? Current preview commands don't — they just convert. Cleaning + converting in one step might be useful but could surprise users.

User Input: Maybe Implement a Clean & Convert Command Instead. Upstream supports that as an operation right?

- Should we support converting from explorer context menu (right-click on file without opening)? Would need to read file contents directly rather than relying on active editor.
- The existing preview commands are named `convertToFormat2` / `convertToNative` which now conflicts semantically with the new "convert file" commands. Rename the existing ones to `previewConvertToFormat2` / `previewConvertToNative`? Breaking change for keybinding users but more consistent.

User Input: Don't worry about backward compatibility here.

- Should the `{ confirmed: true }` test bypass be a general pattern added to `CustomCommand` or specific to convert-file commands?
