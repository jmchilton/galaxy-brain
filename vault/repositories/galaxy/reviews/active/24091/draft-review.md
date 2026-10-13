*This review was written by Claude (AI assistant) on behalf of John Chilton.*

Looks good to me — no correctness problems found. `GSelect` fills a real gap (there's no native select in the client; `FormSelect` is the multiselect tool-form control), it follows `GCheckbox`'s conventions closely, and each of the seven swaps keeps its values, `null` placeholders, object values and Selenium/Playwright selectors (`data-description`, `.workflow-version-select`, `select#type`) intact. I ran the touched specs plus the full client vitest suite locally, and checked the SchemaOrg add-attribute select still resets to its `null` placeholder after a pick.

A few non-blocking notes, roughly in order of how cheap they are now vs. after the follow-up swaps:

1. **Wrapper location.** The package file is `components/Form/GSelect.vue`, but the wrapper is `BaseComponents/GSelect.vue`. The existing Form components mirror into `BaseComponents/Form/` (`GForm`, `GFormInput`, `GFormLabel`), while root components like `GCheckbox` mirror to the root. #24090 has the same split for `GRadio`. Worth picking one before more files import it.
2. **`state` prop.** Nothing in this PR or the three remaining `BFormSelect` sites uses it, and `GFormInput` has no equivalent. Could it wait for a form that needs it?
3. **`change` payload.** `BFormSelect` emitted `change` with the value; `GSelect` emits the native `Event` (matching `GCheckbox`, and the JSDoc update reflects it). No current call site binds `change`, but a line in the component doc comment would keep the follow-up swaps from moving `change` handlers over unchanged.
4. **Template `v-model` coverage.** The spec drives `GSelect` through `h()` with explicit `modelValue`, so the compat opt-out is only covered indirectly via the UserSharing/TrsTool specs. A `GSelect` case in `vModelContract.test.ts` would pin it directly (I tried one locally; it passes).
5. Nit: `handlesMappingJobs.ts` has its own `SelectOption { value; text }`; `JobSelection` could use the exported `SelectOption<string>` instead.
6. Question: `DatasetCollectionElementPicker` got `w-auto` to replace Bootstrap's form-inline width rule, but `JobSelection` didn't, and its `BInputGroup` now only wraps the select. Screenshot 04 looks like it's fine; the `BInputGroup` may be droppable.

Small PR-body typo: "the sibling GRadio/GSelect PR" should be GRadio/GRadioGroup (#24090).

## Risks
This adds a public `galaxy-ui` component API (also used by the Tool Shed) that the remaining select swaps will copy.
<details><summary>Risk Details</summary>

- `options` takes only `{text, value, disabled}` (no field mapping, string arrays or optgroups); that covers every current site.
- `change` carries the native `Event`, unlike `BFormSelect`.
- `state` would be public API with no consumer yet.
- The wrapper path becomes the import path in every migrated file.
</details>
<details><summary>Risk Review Advice</summary>

The prop/emit surface is the long-lived part: confirm the option shape, the `change` payload, and whether `state` belongs in v1, and settle the wrapper location together with #24090. The call-site swaps are low risk and CI is green.
</details>
