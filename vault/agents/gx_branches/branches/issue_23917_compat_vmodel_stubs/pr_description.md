Fix 🎯 #23917 - keep v-model working in `shallowMount` specs for components that opted out of compat v-model, without a per-spec workaround.

VTU's auto-stub copies a component's props but not its `compatConfig`. So after a component moves to `modelValue` with `compatConfig: { COMPONENT_V_MODEL: false }`, compat wires a shallow spec's `v-model` on its stub back to `value`/`input`, and the stub's `modelValue` stays `undefined`. 🔀 #23908 worked around this with a copied `GFormInput: false` line in each affected spec:

| Spec | with `GFormInput: false` (dev) | opt-out removed | this branch (no opt-out) |
|---|---|---|---|
| `History/Modals/CopyModal.test.ts` | ✅ | ❌ | ✅ |
| `History/WorkflowExtractionForm.test.ts` | ✅ | ❌ | ✅ |
| `Workflow/Editor/Index.test.ts` | ✅ | ❌ | ✅ |
| **total** | 68 pass | **25 fail** / 43 pass | 68 pass |

Every later migration (`GTabs`, `GCollapse`, `GAlert` and the rest of #23830) would need the same line in every spec that shallow-mounts a consumer and checks its `v-model`. A `createStubs` hook in `client/tests/vitest/setup.ts` keys off the opt-out the component already declares:

```ts
config.plugins.createStubs = (({ component }) =>
    component.compatConfig?.COMPONENT_V_MODEL === false ? component : undefined) as NonNullable<
    typeof config.plugins.createStubs
>;
```

***It's test-only, with no application code changes.*** ***Only components that declare `COMPONENT_V_MODEL: false` are affected (today just `GFormInput` and `GCheckbox`); every other component is still auto-stubbed as before.***

***Opted-out components render for real in shallow specs, even under an explicit `stubs: { X: true }`.*** To force a stub, pass a stub component. No spec stubs `GFormInput` or `GCheckbox` with `true` today. ***When `GTabs` or `GAlert` migrate, the specs with `GTabs: true` (`DatasetView`) or `GAlert: true` (`UserPreferences`, `ExternalRegistration`, `VisualizationUnsavedChanges`) will need a stub component instead.***

<details><summary>Details</summary>

- VTU 2.5.1 calls `createStubs` only on the default-stub path (`shallow`, or `stubs: { X: true }`) and falls back to its default stub when the hook returns `undefined` (`createStubs?.(…) ?? createStub(…)`). Explicit `X: false` and `X: SomeStub` entries never reach the hook.
- The outer cast is there because VTU's `CustomCreateStub` type doesn't allow the `undefined` return its runtime accepts. `compatConfig` is typed on `ConcreteComponent`, so a misspelled key fails type-checking.
- `tests/vitest/setup.test.ts` (the first spec under `tests/vitest/`, already covered by the include glob) checks both directions under `shallowMount`. A `<GFormInput v-model>` gets `modelValue` and round-trips `update:modelValue`, and a plain child still renders as `child-stub`.
- `ConfigTemplates/VaultSecret.test.ts` is the only other shallow spec of a `GFormInput`/`GCheckbox` consumer. It now renders a real password input, and its assertions don't touch it. No snapshots or `*-stub` selectors reference these components.
- Not covered: `compatConfig: { MODE: 3 }` components (`SortableList`, vue-multiselect) have the same stub issue in principle. Including them would change what every shallow spec renders, and nothing fails from it today.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Builds on 🔀 #23908, which moved `GCheckbox`/`GFormInput` to `modelValue` and added the three opt-outs. Clears the way for the remaining `modelValue` migrations in 🎯 #23812 and 🎯 #23830.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? N/A. Test infra only. If the hook regresses, `setup.test.ts` fails with `expected undefined to be 'first'`.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. `setup.test.ts` checks shallow-mount behavior, not the hook. It fails without the hook, and it fails if the hook returns the real component for everything.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests run</summary>

- Red: on dev with the three opt-outs removed, 25 of 68 tests in the three specs fail. `setup.test.ts` against dev's `setup.ts` fails with `expected undefined to be 'first'`. With a hook that returns the real component for everything, its plain-child case fails.
- Green: `setup.test.ts` plus the three specs, 70 pass, on node 22.20.0 (`client/.node_version`).
- Full client vitest on `a568fce6dd1`: 547 files, 4198 pass, 1 skipped.
- vue-tsc, eslint and prettier are clean.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
