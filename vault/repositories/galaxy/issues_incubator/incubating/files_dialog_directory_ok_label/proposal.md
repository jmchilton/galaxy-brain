# Directory pickers label their confirm button "Select" instead of "Select this folder"

When the remote files dialog is used to pick a directory, its confirm button reads "Select", not "Select this folder".

In directory mode, clicking a folder row opens it. The confirm button picks the folder you are currently in, not a row. "Select this folder" said that. "Select", shown under a list of folders, reads as "select the highlighted row", and row clicks never select anything.

| `SelectionDialog` caller | OK button on current `dev` (20f365a2654) | Expected |
| --- | --- | --- |
| `FilesDialog`, `mode="directory"` | Select ❌ | Select this folder |
| `FilesDialog`, `mode="source"` (RDM new-record repository picker) | Select | Select this folder, its label before 24.2 |
| `FilesDialog`, file mode, `multiple` | Select | Select |
| `DataDialog` (`multiple`) | Select | Select |
| `HistoryDatasetPicker` | its own `actionButtonText` | unchanged |
| `BasicSelectionDialog`, `DatasetCollectionDialog`, single-select `FilesDialog` | no OK button | no OK button |

Directory mode is what users get from the tool form `directory_uri` input (`FormDirectory.vue`) and from every remote-destination picker built on `FilesInput mode="directory"`: history, invocation and archive export destinations (`ExportForm.vue`, `ExportRemoteSourceSelector.vue`), the RDM destination selector, and the collection wizard's `SelectFolder.vue`.

<details><summary>Why</summary>

`SelectionDialog.vue` already has the right logic, but it can never run:

```ts
const props = withDefaults(defineProps<Props>(), {
    // ...
    okButtonText: "Select",
});

const okButtonText = computed(() => {
    return props.okButtonText ? props.okButtonText : props.fileMode ? "Select" : "Select this folder";
});
```

`props.okButtonText` always has a value, so the `fileMode` fallback is dead code. `FilesDialog` passes `:file-mode="fileMode"` (true only for `mode="file"`) but no `ok-button-text`, so directory and source mode get the default.

</details>

<details><summary>Reproduction (vitest, fails on dev)</summary>

Add to the existing `describe("FilesDialog, directory mode", ...)` block in `client/src/components/FilesDialog/FilesDialog.test.ts`. It reuses that block's `initComponent({ multiple: false, mode: "directory" })` setup.

```ts
it("labels the ok button 'Select this folder'", async () => {
    const okButton = wrapper.find("[data-description='selection dialog ok']");
    expect(okButton.text()).toBe("Select this folder"); // fails on dev: "Select"
});
```

```
AssertionError: expected 'Select' to be 'Select this folder'
```

</details>

## Context

Bug found while converting the FilesDialog tests to Storybook play functions on 🌿 [`vitest_story_play`](https://github.com/jmchilton/galaxy/tree/vitest_story_play). A regression from 🔀 #18518 (24.2), which added the `okButtonText` prop with a `"Select"` default next to the fallback it shadows. The "Select this folder" label came from 🔀 #12641, which added it to make the remote files dialog less ambiguous.

## Proposed Approach

Drop the `"Select"` default for `okButtonText` in `SelectionDialog.vue`, leaving it `undefined`, so the existing computed picks "Select" in file mode and "Select this folder" in directory mode. This is a one-line change. The only other label it changes is `FilesDialog`'s source mode, which goes back to the "Select this folder" it showed before 24.2. Every caller that shows the OK button in file mode already gets "Select" from the fallback, and `HistoryDatasetPicker` passes its own text.

<details><summary>Approach details</summary>

- Only callers that render the OK button matter. It is shown when `multiple || !fileMode`, which covers `FilesDialog` (multiple file mode, directory mode and source mode), `DataDialog`, and `HistoryDatasetPicker`. See the table above for each one before and after.
- Tests, red first: the `FilesDialog` directory-mode test above. Optionally add a `SelectionDialog.test.js` case covering the three branches of the computed (explicit `okButtonText`, `fileMode` true, `fileMode` false), so the fallback can't go dead again unnoticed.
- With the default removed, the existing `FilesDialog`, `SelectionDialog`, `DataDialog` and `Markdown` vitest suites all still pass.

</details>

## Alternative Approaches

`FilesDialog` could pass `:ok-button-text` itself, with the dead fallback deleted from `SelectionDialog`. That puts directory wording in the caller that knows about directories, but `SelectionDialog` already owns `fileMode` and uses it to decide whether the button shows at all. Removing the default restores the behaviour the component was written to have, with less churn. The caller-side version is worth it only if source mode should get its own wording rather than "Select this folder".

<details><summary>Alternatives In Detail</summary>

### Alternative: Have `FilesDialog` pass the label

<details><summary>Description</summary>

#### Details

In `FilesDialog.vue`, pass `:ok-button-text="fileMode ? 'Select' : 'Select this folder'"`, and reduce `SelectionDialog`'s computed to `props.okButtonText`.

#### Why the proposed approach is preferred

It moves the same ternary from one file to another and deletes a fallback that works once the default is removed. `fileMode` is a `SelectionDialog` prop that already controls the OK button. Choosing the button's label from the same prop belongs there, and any future directory-mode caller gets the right label for free. The trade-off: a boolean can't tell source mode from directory mode, so source mode gets "Select this folder" too, as it did before 24.2. If that wording is wrong for picking a repository, `FilesDialog` should pass a per-mode label instead.

</details>

</details>
