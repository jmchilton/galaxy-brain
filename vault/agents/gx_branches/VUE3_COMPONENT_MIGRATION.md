# Migrating Galaxy components to Vue 3 patterns

Use this checklist when moving a Galaxy component through the Vue compat layer. Preserve its inputs, emitted payloads and user workflows; verify reactive updates across the component and third-party boundaries. These examples come from the sample-sheet migration in [PR 24050](https://github.com/galaxyproject/galaxy/pull/24050).

## Component structure and compat

- **Do** use typed `<script setup lang="ts">`, `defineProps` and `defineEmits`; use `computed` for derived state and composables for shared lifecycle or state. Keep parsing and payload conversion in pure helpers. **Don’t** copy derived props into refs that can become stale.
- **Do** check the actual model contract: Vue 3 uses `modelValue` and `update:modelValue`; legacy components may still use `value` and `input`. For Vue 3 libraries under Galaxy’s MODE 2 runtime, apply `compatConfig: { MODE: 3 }` to the component and its async wrapper, as in `useAgGrid`. **Don’t** assume changing the parent’s syntax opts its children out of compat.

## Reactivity across library boundaries

- **Do** return the watched value: `watch(() => props.target, initialize, { immediate: true })`. **Don’t** write `() => { props.target; }`; it returns `undefined`, so replacements never trigger the callback.
- **Do** replace the bound row array when rebuilding an ag-grid target. ag-grid-vue3 marks rows raw; in-place refill can leave the grid stale. For edits made by the grid, explicitly update dependent state or refresh editors from current rows. **Don’t** assume raw row mutations invalidate Vue computeds.
- **Do** reset rows, columns, edit flags and view mode when a replacement cannot be displayed. **Don’t** let a late event serialize data from a discarded target.

## Preserve data and validation contracts

- **Do** retain dataset and pair identities when reloading a collection workbook; join parsed metadata to loaded objects by identifier, rejecting missing or duplicate matches. **Don’t** interpret metadata-only rows as URI uploads. Store internal row metadata under a Symbol to avoid collisions with user column names.
- **Do** accept the editor’s real value types: booleans, numbers, strings and `null`. Handle optional empties before restrictions; reject invalid required values, match backend rules, and show feedback while preserving the previous value. Reuse Galaxy’s datatype and genome validators. **Don’t** assume every editor returns text or accept partial numeric strings accidentally.
- **Do** propagate accepted identifier renames into references and dropdown choices; reject renames that violate restrictions. **Don’t** validate the renamed cell alone.
- **Do** render errors before loading placeholders. Keep a blocking load error visible until recovery. **Don’t** make the sole error message dismissible if closing it leaves an empty panel.

## Prove the migration

Test initial load, repeated prop replacement, editing and submitted payloads, including collection and URI modes. Keep the real async wrapper in compat tests. With a grid stub, assert replacement array identity as well as contents, and verify that reverting to an in-place splice fails. Exercise real-library integration in browser tests; a stub cannot establish that behavior. Run affected Vitest suites, `vue-tsc`, lint and formatting checks. Describe stubs and historical browser results accurately in the PR.

Examples: `useAgGrid.ts`, `useSampleSheetGrid.ts`, `SampleSheetGrid.vue`, `FetchGrid.test.ts`, and `DisplayCollectionAsSheet.vue` in PR 24050.
