# galaxy #23908 - Move GCheckbox and GFormInput v-model to modelValue

- PR: https://github.com/galaxyproject/galaxy/pull/23908 (itisAliRH, base `dev`)
- Head reviewed: `6cab455dd5a32727108f5fb77985c30b2afe3bf7` (merge-base with `origin/dev`: `931bdcff826`; merges cleanly with current `origin/dev` `c44846cd321`)
- Part of #23812 (bootstrap-vue form control swaps) and the #23830 v-model follow-up
- Worktree: `~/projects/worktrees/galaxy/pr/23908`
- Size: +153/-24, 8 files. `GCheckbox` / `GFormInput` move from `value`/`input` to `modelValue`/`update:modelValue`
  with `defineOptions({ compatConfig: { COMPONENT_V_MODEL: false } })`. One hand-wired caller is migrated
  (`CompositeFileUpload`), three shallowMount specs are updated, and two new vitest files are added in `packages/ui`.

## Verdict

Approve. Every consumer is accounted for, the compat opt-out is necessary and covered by tests, and type-check
and lint are clean. One optional suggestion: a shared test-setup hook would replace the per-spec
`stubs: { GFormInput: false }` workaround before #23812 adds more of these.

## Findings (ranked)

1. **No consumer breaks.** `client/src` has 12 consumers of the two components on both head and current `origin/dev`.
   I found no new ones in the 153 commits since the merge-base. All of them use `<script setup>`:
   - `GFormInput` (v-model): `QuotaForm`, `ResetUserPasswordForm`, `DelayedInput`, `RenameModal`, `VaultSecret`,
     `CopyModal`, `WorkflowExtractionForm`, `ToolOntologies`, `UserDeletion` and `Workflow/Editor/Index`.
   - `GCheckbox` (v-model plus `toggle`): `WorkflowRunFormSimple`, 5 instances.
   - `CompositeFileUpload` was the only caller using `:value`/`@input`, and the PR migrates it.

   No caller uses `.sync`, `@input`, or `@change` on either component, and none passes `value=`. That matters
   because `input` is no longer a declared emit and `GFormInput` keeps `inheritAttrs`. A leftover `@input` would
   now fall through to the native `<input>` and receive an `InputEvent` instead of a string, with no warning.
   Nothing does that today, and `vue-tsc` would flag a leftover `:value`. The rendered DOM is unchanged, so
   Selenium and Playwright selectors (`*-input` / `*-label` test ids, `.g-checkbox`) are unaffected. All test
   references to `props("value")` and `$emit("input")` on these components are in the three specs the PR updates.
2. **`compatConfig: { COMPONENT_V_MODEL: false }` is required, and this PR is the first use of it.**
   `compat-config.js` runs in MODE 2. Without the opt-out, compat's `convertLegacyVModelProps` rewrites every
   vnode that passes `modelValue` back to `value`/`input`. I removed just the `defineOptions` blocks and kept
   the new prop and emit names. That fails 4 of the 7 new tests and 5 `CopyModal` tests. No other component in
   `client/src` or `packages/ui` emits `update:modelValue` or sets `COMPONENT_V_MODEL`; the only per-component
   compat settings are `MODE: 3` in `SortableList.ts` and one test. So this PR sets the pattern for the rest of
   #23812. The library is now inconsistent: `GAlert` accepts both `value` and `modelValue` and emits both,
   `GTabs` and `GCollapse` still use `value`/`input`, and these two are `modelValue` only. Moving to Vue 3's
   contract is the right direction for an internal package that "flips to publish when the interface
   stabilizes on Vue 3" (`client/packages/README.md`). The `vue: ^2.7.16 || ^3.4.0` peer range in
   `packages/ui/package.json` no longer reflects how these two components can be bound, but the package is
   `private`, so that's only a nit.
3. **Possible reusable fix: the shallowMount stub workaround.** The PR's claim is correct: VTU's auto-stub copies
   props but not `compatConfig`. When I removed the three `stubs: { GFormInput: false }` lines, 25 tests failed
   across `CopyModal`, `WorkflowExtractionForm` and `Editor/Index`. Every future shallowMount spec that drives a
   migrated G-component will hit the same trap. A single hook in `tests/vitest/setup.ts` handles it. I checked
   this locally: with the three opt-outs removed, all 68 tests pass.
   ```ts
   config.plugins.createStubs = ({ component }) =>
       component.compatConfig?.COMPONENT_V_MODEL === false ? component : undefined;
   ```
   It never stubs the migrated leaf components, which is what the per-spec opt-outs already do. Returning
   `undefined` falls back to VTU's default stub. The snippet leaves out type casts, since `compatConfig` isn't
   part of VTU's component type. Optional, but cheaper to land now than after more
   G-components migrate.
4. **The tests do their job.** With the two `.vue` files reverted to the merge-base, 4 of the 7 new tests fail:
   both "receives modelValue" tests and both "updates the bound value" tests. Removing only `compatConfig` fails
   the same 4 (see 2). The parent-render-function harness with `onUpdate:modelValue` exercises the real compat
   v-model path, so the test isn't just reading back its own mock. The other 3 tests (`change` re-emit,
   keydown/blur/focus, `toggle` class) pass on base as well. They pin down the event surface the PR says it
   preserves. The toggle-class test adds little, but these tests are cheap and the component had no tests before.
5. **`defineModel` isn't needed here.** Vue 3.5 has it, but nothing in the client uses it yet. It would also give
   `GCheckbox` local uncontrolled state when no v-model is bound, which changes behavior slightly. An explicit
   prop with an `update:modelValue` emit, as the PR does, is the more conservative choice under compat.

## Tests run

- Node 22.20.0, `CI=true pnpm install`.
- `vitest run` on the 2 new files plus the consumer specs (`QuotaForm`, `ResetUserPasswordForm`, `DelayedInput`,
  `RenameModal`, `VaultSecret`, `CopyModal`, `WorkflowExtractionForm`, `UserDeletion`, `Workflow/Editor/Index`,
  `ToolBoxSearch`, `ToolsList`): 13 files, 138 passed.
- `vitest run src/components/Workflow/Run/ src/components/Panels/Upload/` plus `WorkflowCardList`, `WorkflowEditor`
  and `CellAdd`: 16 files, 117 passed.
- Red check: `GCheckbox.vue` and `GFormInput.vue` at `931bdcff` gave 4 of 7 new tests failing.
- Red check: dropping only `defineOptions`/`compatConfig` gave 4 new tests and 5 `CopyModal` tests failing.
- Stub check: dropping the `GFormInput: false` stubs gave 25 failures. Adding the `createStubs` hook above
  brought those 3 files back to 68 passing. Reverted afterwards.
- `npx vue-tsc --noEmit` (client) and `pnpm --filter @galaxyproject/galaxy-ui type-check` both pass.
- `eslint` on the changed files reports only an existing `@update:slotItem` hyphenation warning in
  `CompositeFileUpload.vue`, which the PR didn't introduce.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). `galaxy-ui` is a private, source-consumed package and every caller is updated in the same PR. The `compatConfig` line is temporary scaffolding that goes away once `@vue/compat` is removed.

## Draft review comment

> *Drafted by Claude (AI assistant) on behalf of jmchilton.*
>
> Looks good. I checked every `GCheckbox` / `GFormInput` consumer in `client/src` against both this head and
> current `dev`. All of them use `v-model` from `<script setup>` except `CompositeFileUpload`, which you migrated.
> No caller has a leftover `@input`, `@change`, `:value` or `.sync`, and that matters now that `input` would fall
> through to the native element. `vue-tsc` and the galaxy-ui type-check are clean, and the consumer specs pass.
>
> I confirmed the `compatConfig` opt-out is required. With only the `defineOptions` blocks removed, the new
> modelValue tests and the `CopyModal` spec fail. With the `.vue` files reverted, the new tests fail too.
>
> One optional suggestion: removing the `stubs: { GFormInput: false }` lines breaks 25 tests, so every future
> shallowMount spec on a migrated G-component will hit the same trap as #23812 continues. A single hook in
> `tests/vitest/setup.ts` handles it centrally:
>
> ```ts
> config.plugins.createStubs = ({ component }) =>
>     component.compatConfig?.COMPONENT_V_MODEL === false ? component : undefined;
> ```
>
> With that in place and the three per-spec opt-outs removed, those specs pass locally. Happy to see that here
> or in a follow-up. Approving.
