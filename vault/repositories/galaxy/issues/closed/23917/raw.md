# Vitest: auto-stubs break G-components migrated to Vue 3 v-model (COMPONENT_V_MODEL: false)

Source: follow-up from our review of #23908 ("Move GCheckbox and GFormInput v-model to modelValue", itisAliRH, merged 2026-10-05). Part of the #23812 G-component Vue 3 migration series. [Full review](../../../reviews/archived/23908/review.md).

## Problem

- #23908 moved `GCheckbox` and `GFormInput` (client/packages/ui) from `value`/`input` to `modelValue`/`update:modelValue`. Because the client runs `@vue/compat` (MODE 2, `compat-config.js`), each needs `defineOptions({ compatConfig: { COMPONENT_V_MODEL: false } })`; otherwise compat's `convertLegacyVModelProps` rewrites the parent's `modelValue` binding back to `value`/`input`. First use of that opt-out in the client.
- VTU's auto-stubbing (shallowMount, or `stubs: true`) copies a component's props but NOT its `compatConfig`. The stub therefore gets compat's legacy v-model treatment, and specs that drive a migrated component through its stub break.
- #23908 worked around it per spec with `stubs: { GFormInput: false }` in three files: `CopyModal`, `WorkflowExtractionForm`, `Workflow/Editor/Index` specs. If you remove those three lines, 25 tests fail.
- Every later #23812 PR that migrates another G-component (remaining `value`/`input` ones: `GTabs`, `GCollapse`; `GAlert` emits both) will hit the same trap in each shallowMount consumer spec and copy the workaround.

## Proposed fix

Add one hook in `client/tests/vitest/setup.ts` so components that opted out of compat v-model are never auto-stubbed:

```ts
config.plugins.createStubs = ({ component }) =>
    component.compatConfig?.COMPONENT_V_MODEL === false ? component : undefined;
```

(`compatConfig` isn't in VTU's component type, so it needs a cast.) Returning `undefined` falls back to VTU's default stub. Then delete the three per-spec `GFormInput: false` opt-outs.

Verified during review (on the #23908 head, reverted after): with the hook and the opt-outs removed, those 3 spec files pass (68 tests).

## Things to check while implementing

- Confirm `config.plugins.createStubs` exists in the VTU version pinned in client (VTU 2.x; added in 2.3ish) and doesn't clash with any existing `config.global.stubs` / plugin setup in `setup.ts`.
- Whether returning the real component (not stubbing it at all) is right, versus a stub that copies `compatConfig`. Real component is what the per-spec opt-outs already do; these are leaf form components, so it's cheap.
- Run the full client vitest suite: un-stubbing changes snapshots/`find` results in any spec that shallowMounts a parent of `GCheckbox`/`GFormInput`. Search for specs asserting on `g-form-input-stub` / `g-checkbox-stub`.
- Red-to-green: drop the three opt-outs first (25 fail), add the hook (green).
- Size: small client-only test-infra change, a two-way door. Could also just be a PR, but filing the issue lets the #23812 author pick it up or know it's coming.

## Probably assign

jmchilton, since it came from his review. No @-mentions in the issue body (the original author is itisAliRH; ask John before pinging).
