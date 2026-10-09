# galaxy #23912 - Give multiselect search inputs meaningful accessible names

- PR: https://github.com/galaxyproject/galaxy/pull/23912 (itisAliRH, base `dev`)
- Head reviewed: `7dec4ae62d68113d27e82f30ff26832c484bec14` (diffed against freshly fetched `origin/dev`)
- Part of #23830 (Vue 3 migration a11y/warning cleanup)
- Worktree: `~/projects/worktrees/galaxy/pr/23912`
- Size: +67/-8, 14 files. Extends the pnpm patch for vue-multiselect 3.5.0 so the search input takes the caller's
  `aria-label` instead of the hard-coded `name + "-searchbox"`. Turns `FormSelect`'s `id` default into a factory.
  Changes `DatasetCopy` captions to `<label for>` and adds `aria-label` at six call sites. Four test files touched.

## Verdict

Approve with nits. The patch change is right: before this, no caller could name the input. The
`FormSelect` duplicate-id fix is a real bug fix. Tests fail before the fix and pass after it. The nits are
about using one mechanism consistently, plus a sibling with the same id bug.

## Findings (ranked)

1. **Three call sites duplicate a visible caption that could just be a `<label for>`.** This is the
   pattern the PR itself uses in `DatasetCopy`. `DatabaseEditTab`, `ChangeDatatypeTab` and
   `SuitableConvertersTab` each render a `<b>` caption directly above a `Multiselect` that already has an id
   (`database-build`, `datatype-extension`, `converter-tool`). The PR leaves the `<b>` in place and repeats the
   string in `aria-label`. If each `<b>` became `<label for="...">`, there would be one source of truth, clicking
   the caption would focus the input, and the PR would name inputs one way instead of two. The strings have
   already drifted in one place: `SuitableConvertersTab` shows `l("Converter Tool: ")` but names the input
   `l("Converter Tool")`, which are two different localization keys. `WorkflowAttributes` (`<b>Version</b>`,
   `<b>License</b>`) is the same situation. There the PR hard-codes `"Version"`/`"License"` inside the child
   selector components. Those strings aren't localized, unlike the collection tabs. Leaving them is acceptable,
   because each selector has a single consumer and `WorkflowVersionSelector` has no id to target.
   `PermissionsInputField` (`aria-label="title"` below an `<h2>{{ title }}</h2>`) is fine as is, because the
   string comes from a prop and isn't duplicated.
2. **`FormSelect` should reuse `useUid`, and `UploadSelect` has the same bug.** `uid()` in
   `utils/utils.ts` is marked `@deprecated in favor of useUid composable`. The sibling `FormSelectMany.vue`
   already uses exactly this form: `id: { type: String, default: () => useUid("form-select-many-").value }`.
   `FormSelect` should match it, and the explanatory comment can then go. Separately,
   `components/Upload/UploadSelect.vue:10` still has `` default: `upload-settings-select-${uid()}` ``. That
   is the same once-per-module literal, so every `UploadSelect`/`UploadSelectExtension` without an explicit
   id (the sample-sheet grid footers, for example) shares one id. That breaks the `listbox-<id>` /
   `<id>-<n>` option ids that the multiselect patch relies on. It's a one-line fix in this PR.
3. **`SingleItemSelector` is the biggest wrapper the PR missed.** It is searchable and appears in every
   upload table row (extension and dbkey cells, plus the bulk headers), in `CompositeFileUpload`,
   `SelectionOperations`, `LibraryDataset` and `DirectoryDatasetPicker`. It already takes a `title` prop that
   callers fill with a descriptive tooltip ("Composite Type", the per-cell `tooltip`), and passes it to
   `Multiselect` as a root-div attribute. Since this PR, its search input has no `aria-label`, so it falls
   back to vue-multiselect's default placeholder, "Select option". Binding `:aria-label="title || undefined"`
   in the wrapper fixes every one of those call sites at once. That kind of reusable fix is better than adding
   strings per call site. Other searchable siblings are OK: `SelectionField` and `StorageOperationWizardModal`
   already have `<label for>`, and `UserSharing`, `ExternalLogin` and the admin `QuotaForm`/`GroupForm`/
   `RoleForm`/`UserRolesGroupsForm` have descriptive placeholders. (`FormElementLabel` doesn't render a
   `<label for>`, which explains why the admin forms have no label association, but that's out of scope.)
   `CustomBuilds` and `TargetObjectStoreSelector` are `:searchable="false"`, so they render no input.
4. **Patch mechanics are fine.** `vue-multiselect`'s `main` is `dist/vue-multiselect.esm.js`, and the
   existing patch only edits that file, so editing only the esm build is consistent. `_ctx.$attrs['aria-label']`
   works for kebab-case template bindings, which is every call site. Without inherit-attrs changes, the
   value also lands on the `role="combobox"` root, which can cause a double announcement. The PR body names
   this as a follow-up, which is reasonable.
5. **Tests are proportionate and behavior-focused.** The `DatasetCopy` test asserts that the input has no
   `aria-label` and resolves its name through `label[for]`. That checks the real mechanism, not a string.
   The other additions are one-line assertions on the rendered input. `LicenseSelector` has no test file,
   so its change is untested. That's acceptable for a static attribute.

Nit-level, skip: the patch's inline comment and the `FormSelect` factory comment are both explanatory rather
than obvious. The second one goes away if the code switches to `useUid`.

## Tests run

- Node 22.20.0, `CI=true pnpm install`, then
  `pnpm exec vitest run src/components/Dataset/DatasetCopy.test.js src/components/Form/Elements/FormSelect.test.js src/components/Libraries/LibraryPermissions/PermissionsInputField.test.ts src/components/Workflow/Editor/WorkflowAttributes.test.ts`
  -> 4 files, 19 passed on head.
- Red check: I reverted the installed esm build's line to `$props.name + '-searchbox'` and checked out
  `FormSelect.vue`, `DatasetCopy.vue`, `PermissionsInputField.vue` and `WorkflowVersionSelector.vue` from
  `origin/dev`. Result: 5 failed, which is every new or changed assertion. Afterwards I restored
  node_modules and the sources, and the worktree is clean.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).
The only ongoing cost is that the a11y behavior now depends on our local vue-multiselect patch, which already
existed and has to be rebased on any upgrade.

## Draft review comment

> *Drafted by Claude (AI assistant) on behalf of jmchilton.*
>
> Thanks, this is a good fix. The patch change is the right one, since callers had no other way to name the
> input, and the `FormSelect` duplicate-id fix is a real bug. The new tests fail against the pre-fix sources
> and pass here. A few small suggestions:
>
> - `DatabaseEditTab`, `ChangeDatatypeTab` and `SuitableConvertersTab` each already have a visible `<b>` caption
>   right above a `Multiselect` with an id. Could those be `<label for="database-build">` etc., as you did in
>   `DatasetCopy`? That keeps one way of naming these inputs and avoids repeating the string. It has already
>   drifted once: the converter tab shows `l("Converter Tool: ")` but names the input `l("Converter Tool")`.
> - `uid()` is deprecated in favor of `useUid`, and `FormSelectMany` already does
>   `default: () => useUid("form-select-many-").value`. It would be nice to match that, which also makes the
>   comment unnecessary. `Upload/UploadSelect.vue` has the same once-per-module
>   `` `upload-settings-select-${uid()}` `` default and could get the same one-line fix here.
> - `SingleItemSelector` (upload table cells and bulk headers, composite upload, selection operations) is
>   searchable, and its input now falls back to the "Select option" placeholder. It already receives a
>   descriptive `title` from callers, so `:aria-label="title || undefined"` in the wrapper would cover all
>   of them at once.
>
> None of this blocks the PR. Approving.
