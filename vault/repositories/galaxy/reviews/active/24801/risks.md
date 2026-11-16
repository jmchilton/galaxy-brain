Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Client-only component swap (`BFormInput` to `GFormInput`) in seven components plus unit tests; no API, schema, tool, or workflow behavior changes, and a revert restores the previous inputs.
- The advanced filter inputs (`FilterMenuInput.vue`, `FilterMenuRanged.vue`) are shared by the history, workflow and other list filters, so a regression there is the widest-reaching one: values now pass through a string conversion on the way in and `null` to `undefined` on the way out.
- The filter inputs render slightly smaller (`size="small"`), a subtle visual change that needs no relearning.
- The disabled masked inputs in `VaultSecret.vue` and `APIKeyItem.vue` rely on `GFormInput` passing through `@click` and `data-test-id="api-key-input"`; the latter is used by Selenium.

</details>

<details><summary>Risk Review Advice</summary>

Spend the manual check on the advanced filter menu: type and clear text and range filters, apply with Enter, close with Escape, and use a date range, confirming that a cleared field drops the filter rather than sending an empty or literal `"null"` value.

The remaining swaps are mechanical; a quick look at the pairing filter's invalid state and the credentials "Group name is required" message is enough.

</details>
