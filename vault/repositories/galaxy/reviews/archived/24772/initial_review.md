# Initial review: #24772 Compile templates with Vue 3 semantics

- Profile: `default`
- Model: Opus 5.5
- Effort: medium
- Reviewed commit: `49fa5544810c37ddfa05ccc9eaa2bd52c07e019c` (merge base `bfde260e243`)

## Verdict

No P1 or P2 findings. The compiler switch does not change what any existing SFC renders, apart from the intended chart fix, which is the one place a shared key was removed. One P3: three comments in galaxy-ui that this PR makes wrong.

The verification below comes from compiling templates, not from a browser. The PR's manual click-through (still unchecked in its test plan) was not run here.

## Findings

### P3 1: galaxy-ui docs still say compat hides `.native` and bare `<template>`

Three comments describe the client as tolerating Vue 2 syntax at compile time. With the compiler in MODE 3 that is no longer true for these two forms: the client now drops `.native` and renders a bare `<template>` natively, the same as the Tool Shed.

- `client/packages/ui/README.md:16` says `.native` and a bare `<template>` "can look fine under compat and break in the shed". The `value`/`input` v-model part is still accurate; the other two now break in both consumers and fail lint.
- `client/packages/ui/src/portableImports.test.ts:51` says "@vue/compat honours it, so the client never notices".
- `lib/tool_shed/webapp/frontend/src/components/galaxyUi.test.ts:15` says the client's compat "still emulates Vue 2 behaviour such as `.native` listeners".

Evidence: compiling `<Foo @click.native="x"><template><b>y</b></template></Foo>` with `@vue/compiler-sfc` 3.5.43 gives different output for MODE 2 and MODE 3, with MODE 3 taking the plain listener and keeping the `template` element.

Suggested fix: reword the three comments. The `.native` check in `portableImports.test.ts` now overlaps the `vue/no-deprecated-v-on-native-modifier` error this PR applies to galaxy-ui, so it could go too, though keeping it does no harm.

## What was checked

### Does MODE 3 reach anything the PR did not touch?

No behavior change found. I compiled every SFC at the reviewed commit under both modes and compared the generated code. This covers all compiler compat flags at once (v-bind order, `.native`, bare `<template>`, `is`, `.sync`, filters, inline-template), rather than only those the vitest run happened to warn about.

- **Client SFCs (961 templates, `client/src` and `client/packages/ui/src`):** with `ref_for` placement normalized, the only remaining difference is `FormSelectMany.vue`.
- **`ref_for` placement:** the marker moves in `v-for` plus `v-bind` sites, including the untouched `GTable`, `FormInputs`, `FormRepeat`, `RuleCollectionBuilder`, `RulesDisplay` and `UndoRedoStack`. It is a reserved key that Vue strips from element and component props, and it only has an effect when a `ref` is present.
- **`FormSelectMany.vue:413,459`:** `<slot v-bind="{ option, selected }">` in a `v-for` now passes `ref_for: true` in its slot props. The only consumer, `ListCollectionCreator.vue:674`, reads `selectValue.option`, so this is harmless.
- **Third-party SFCs:** the two `.vue` files in `node_modules/.pnpm` (`vue-multiselect`, `schema-to-ts`) compile the same in both modes. This used a sibling worktree's install, whose `pnpm-lock.yaml` is byte-identical to this PR's.
- **Runtime-compiled templates:** none in the app; the only `template:` strings outside tests are citation format options. `compat-config.js` has no `COMPILER_*` keys.
- **Other build configs:** `vite.config.mjs` and `vitest.config.mts` are the only client configs that set the compiler mode, and both changed. The Tool Shed's config has no compat setting.

The comparison used `compileTemplate` without binding metadata or inline mode. The compat branches do not depend on either, and production CI builds pass.

### Is the reordering behavior-preserving?

Yes. For each changed SFC, the base commit under MODE 2 and the PR head under MODE 3 generate identical code, once adjacent merge objects are treated as one. MODE 2 moves the object to the front of the merge, so moving it to the front in source is the same thing. All 11 changed `.vue` files match.

### Is "only one collision" accurate?

It holds for behavior, but not literally for `GButton`.

| Component | Spread keys | Explicit keys overlap? |
|---|---|---|
| `GCard` (3 sites), `HistoryCounter` | `color`, `outline`, `transparent` from `variantToColor` | No |
| `BroadcastContainer` | those, plus `href`, `target`, `rel`, `to` | No, only `key` is explicit |
| `LintSection` | `data-missing-label`, `data-missing-annotation` | No |
| `GDropdown` | `aria-label` | No |
| `GPopover` | `aria-labelledby` or `aria-label` | No |
| `GTabs` | caller's `titleLinkAttributes`; the only callers pass `data-description` (`CollectionCreator.vue:175,214`) | No |
| `GLink` | `href`, plus `$attrs` | `$attrs` could overlap, see below |
| `GButton` | `href`, plus `$attrs` | Yes: `type` (`type="submit"` callers such as the Tool Shed's `ChangePassword.vue:50`), `aria-pressed` (`CustomToolEditorWorkspace.vue:64`) |
| `HistoryStorageOverview` | `enable-selection` before the fix | Yes, the case the PR describes |

The `GButton` overlaps do not matter. It and `GLink` have a single root and default `inheritAttrs`, so Vue merges `$attrs` onto the root again after the template's own props, and the caller wins whatever the template order. A small SSR render of a stand-in component with the same shape (not `GButton` itself, on plain Vue 3 rather than compat) confirmed a caller's `aria-pressed`, `type` and `title` beat explicit values, including an explicit `undefined`. So the PR's "explicit attribute wins" does not describe `$attrs` on these two components, and the `...$attrs` in their spread is redundant. That is pre-existing and needs no action here.

### Tool Shed

The Tool Shed compiles galaxy-ui from source on plain Vue 3, so it was already using source order and the reorder does flip the order there. Nothing changes in practice: `$attrs` still win through fallthrough, and no Tool Shed caller passes `titleLinkAttributes` or a key that overlaps in `GDropdown`. It is on vue-router 4, as is the `peerDependencies` range, which supports dropping the `.native` lint override.

### Chart fix

`byteFormattingForChart` has six uses across `HistoryStorageOverview`, `HistoriesStorageOverview`, `ObjectStoresStorageOverview` and `ObjectStoreStorageOverview`. All six set `enable-selection` explicitly, so removing the shared key changes nothing else. `BarChart` defaults it to false.

### Also checked, no finding

- `MastheadDropdown`: identical generated code before and after.
- `vue/attributes-order` is an error in this repo, and it skips a `v-bind` object next to other attributes, so autofix should not undo the reorder. I read this from memory of the rule and did not run eslint; CI lint passes.
- `GTabs.test.ts` is picked up by the `packages/*/src/**` vitest include, and it would fail if the spread moved back after the explicit attributes.
- `client-unit-test`, `build-client` and `Lint and unit test` pass on GitHub.
