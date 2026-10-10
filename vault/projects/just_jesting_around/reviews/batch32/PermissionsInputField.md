# PermissionsInputField (.test.js)

Selected originator: `client/src/components/Libraries/LibraryPermissions/PermissionsInputField.test.js`. Baseline and final: **1 test**. The diff is small, because the suite was already short and readable.

What changed:
- The mount uses `props` and `global: getLocalVue()`, as its `.test.ts` sibling and `getLocalVue()`'s own usage note do. It no longer uses the `localVue` and `propsData` compat options.
- The sanitizer spy's `mockClear()` moved into `beforeEach`. The global mock in `tests/vitest/setup.ts` persists across tests and files.
- The arrange step is separated from the mount.

Preserved: `sanitizeHtml` is called with the alert and `"default"`, and the `<strong>` text renders as "any".

Strengthened: the rendered-markup check is scoped to `findComponent(GAlert)`, so it proves the sanitized alert lands in the info alert and not elsewhere in the component. Probe: moving `<div v-sanitize-html="alert" />` outside `<GAlert>` fails the scoped check, while the unscoped original passed. Swapping `v-sanitize-html` for `v-html` fails the `toHaveBeenCalledWith` check. Both probes were reverted, so production code is unchanged.

Reuse: `getLocalVue`, plus the shared pass-through `sanitizeHtml` mock from `directives/__mocks__/sanitizeHtml.ts`. No new helper.

Validation: 1 test passes shuffled (seed `320101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Follow-up: the component has two test files with independent origins. This one came from `c235454170e` (v-sanitize-html). `PermissionsInputField.test.ts` came from `b306e513c69` and later commits (modelValue binding, paging, aria-label). Each mocks `Services` its own way. The sanitize case fits the `.ts` suite, using its `PROPS` with an `alert` override and its hoisted `getSelectOptions` mock. Then the `.js` file can go. That's a structural change across two test files, so it is left for the driver.
