# Vitest auto-stubs drop `COMPONENT_V_MODEL: false`, so every `modelValue` migration needs per-spec workarounds

In `shallowMount` tests, a component migrated to `modelValue` gets a stub whose `v-model` is wired back to `value`/`input`.

```ts
// client/src/components/History/Modals/CopyModal.test.ts (dev), with its `stubs: { GFormInput: false }` line removed
const wrapper = shallowMount(CopyModal, { props: { history, showModal }, global: withPlugins(localVue, pinia) });
expect(wrapper.findComponent(GFormInput).props("modelValue")).toBe("Copy of 'My History'");
// AssertionError: expected undefined to be 'Copy of 'My History''
```

| Spec (dev @ `244549a041e`) | with per-spec `GFormInput: false` | opt-out removed |
|---|---|---|
| `History/Modals/CopyModal.test.ts` | ✅ | ❌ |
| `History/WorkflowExtractionForm.test.ts` | ✅ | ❌ |
| `Workflow/Editor/Index.test.ts` | ✅ | ❌ |
| **total** | 68 pass | **25 fail** / 43 pass |

VTU's default stub copies a component's props (and its legacy `model` option) but not its `compatConfig`. Compat decides `COMPONENT_V_MODEL` from the vnode's component, so for the stub it falls back to the global MODE 2: the parent binds `value` and listens for `input`, and the stub's `modelValue` stays `undefined`.

#23908 worked around this with the three `GFormInput: false` opt-outs above. Each later migration will hit the same issue in every spec that shallow-mounts a consumer and checks its `v-model`, and the fix will be another copied line. In `packages/ui`, `GTabs` and `GCollapse` are still `value`/`input` (`GAlert` takes both), and #23830 plans to move nearly every custom `v-model` component in the client the same way.

## Context

This is a follow-up to 🔀 #23908, which moved `GCheckbox`/`GFormInput` to `modelValue` and added the client's first `COMPONENT_V_MODEL: false` opt-outs. It's related to 🎯 #23812 (the G-component migration series) and 🎯 #23830 (compat cleanup), where custom `v-model` components move to `modelValue`.

## Proposed Approach

Add a VTU `createStubs` hook to `client/tests/vitest/setup.ts` so a component that opted out of compat v-model is never auto-stubbed, then delete the three per-spec opt-outs. The hook keys off the opt-out the component already declares, so later migrations need no test changes.

<details><summary>Patch and verification</summary>

```ts
// Auto-stubs drop compatConfig, so compat would rewire a modelValue component's
// v-model back to value/input. Leave components that opted out unstubbed;
// returning undefined falls back to VTU's default stub (its type doesn't say so).
config.plugins.createStubs = (({ component }) =>
    (component as { compatConfig?: { COMPONENT_V_MODEL?: boolean } }).compatConfig?.COMPONENT_V_MODEL === false
        ? component
        : undefined) as NonNullable<typeof config.plugins.createStubs>;
```

- VTU 2.5.1 (pinned) calls `config.plugins.createStubs` only on the default-stub path (`shallow`, or an explicit `stubs: { X: true }`) and falls back to its default stub on `undefined`. Explicit `X: false` and `X: SomeStub` entries still win.
- Caveat: an explicit `X: true` goes through the hook, so it would no longer stub an opted-out component. No spec does that for `GFormInput`/`GCheckbox` today. When `GTabs`/`GAlert` migrate, the specs with `GTabs: true` (`DatasetView`) or `GAlert: true` (`UserPreferences`, `ExternalRegistration`, `VisualizationUnsavedChanges`) would render the real component unless they pass a stub component instead.
- The cast is needed because VTU's `CustomCreateStub` type declares a component return even though the runtime accepts `undefined`. `compatConfig` also isn't on `ConcreteComponent`.
- Checked on dev `244549a041e`, red to green:
  - Removing the three opt-outs makes 25 tests fail.
  - Adding the hook brings all 68 tests in those three specs back to passing.
  - The full client vitest suite passes with the hook: 537 files, 4112 tests.
  - `vue-tsc`, eslint and prettier are clean.
- No spec asserts on `g-form-input-stub` or `g-checkbox-stub`.

</details>

## Alternative Approaches

The other options either keep the per-component bookkeeping (opt-out lists), change test behavior away from the app (a global compat flag in tests), depend on VTU internals (a compat-aware stub), or wait on a VTU release (an upstream fix). The hook is a few lines, follows the component's own declaration, and goes away with `@vue/compat`.

<details><summary>Alternatives In Detail</summary>

### Alternative: Keep per-spec `stubs: { X: false }`

<details><summary>Description</summary>

#### Details

This is the status quo from #23908: each spec that shallow-mounts a consumer of a migrated component opts that component out of stubbing.

#### Why the proposed approach is preferred

It scales with consumers × migrated components. The failure (`modelValue` is `undefined`, or an emit never arrives) doesn't point at stubbing, so every migration PR has to rediscover the cause.

</details>

### Alternative: A global `config.global.stubs` list

<details><summary>Description</summary>

#### Details

List `GFormInput: false, GCheckbox: false, ...` once in `setup.ts`.

#### Why the proposed approach is preferred

It fixes the per-spec duplication, but every migration still has to remember to extend the list. The hook reads the `compatConfig` the component already sets.

</details>

### Alternative: A stub that copies `compatConfig`

<details><summary>Description</summary>

#### Details

Keep stubbing, but return a stub that carries the component's `compatConfig`, so specs still get shallow rendering.

#### Why the proposed approach is preferred

VTU doesn't export `createStub`, so this would mean re-implementing its stub. The affected components are leaf form controls and cheap to render. Leaving them unstubbed is also what the existing per-spec opt-outs already do.

</details>

### Alternative: Fix it upstream in VTU

<details><summary>Description</summary>

#### Details

VTU's `createStub` already copies the legacy `model` option for compat (vuejs/test-utils#1550); copying `compatConfig` next to it would fix this for everyone.

#### Why the proposed approach is preferred

Worth filing in parallel, but it needs a VTU release and an upgrade, and the problem goes away when Galaxy drops `@vue/compat`. The hook fixes it now and is easy to delete later.

</details>

### Alternative: Disable `COMPONENT_V_MODEL` globally in tests

<details><summary>Description</summary>

#### Details

Configure compat in the vitest setup with `COMPONENT_V_MODEL: false`.

#### Why the proposed approach is preferred

`compat-config.js` is deliberately shared between the app and the test setup so that components behave the same in both. Unmigrated `value`/`input` components rely on compat's v-model translation, so their tests would break or stop matching the app.

</details>

</details>
