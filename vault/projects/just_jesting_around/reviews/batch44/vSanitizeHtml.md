# vSanitizeHtml

Selected originator: `client/src/directives/vSanitizeHtml.test.ts`. Baseline **8 tests** → final **11 tests**.

The suite already read well. Changes are small. `mountWith(value, profile?)` takes the profile name and builds `v-sanitize-html:<profile>` itself, so callers write `"links"` rather than a directive string. `targetOf(wrapper)` names the element under test. The null/undefined case and the non-string loop became `test.each` tables, one case per value. The console spy now sits behind `afterEach(vi.restoreAllMocks)`; before, the trailing `mockRestore()` was skipped when an assertion failed. The redundant `await nextTick()` after `setProps` went: `setProps` already waits a tick, and the `[data-other]` text check shows the re-render happened. Arrange/act/assert blocks are separated.

`vue/one-component-per-file` warned twice on the base file (two `defineComponent` hosts), which fails `--max-warnings 0`. It now has the same file-level disable, with its reason, that the sibling `vGTooltip.test.ts` uses.

Every original assertion survives. Null and undefined still each give one `("", "default")` call, now one case each, and each also asserts the rendered `<i>sanitized:</i>` (new). For object, array and number: rendered `<i>sanitized:</i>`, empty sanitizer input, one warning each. Strengthened: each case checks the exact call list `[["", "default"]]`, not `every(html === "")`, which passes on zero calls, and the warning's arguments (`"v-sanitize-html expects a string, got:", value`). Changing the expected warning argument fails all three. The profile, re-sanitize, unrelated re-render, v-if reuse and unmount cases keep their assertions as they were.

Reuse: the global directive registration and the `sanitizeHtml` spy from `tests/vitest/setup.ts` / `directives/__mocks__/sanitizeHtml.ts`, as before. No new helper.

Validation: 11 tests pass shuffled (seed `440101`, `NODE_OPTIONS=--no-webstorage`). Per-file coverage is identical at base and tip (`vSanitizeHtml.ts` 12/12 statements, 10/10 branches). ESLint, Prettier and full client vue-tsc pass. After review, the reuse case moved onto `mountWith` (a `rich` prop switches between same-tag targets), leaving one host component, so no `eslint-disable` is needed.

Guidance: none. The sibling `vNoSanitizeHtml.test.ts` has the same two `one-component-per-file` warnings, so it fails `--max-warnings 0` at base too.
