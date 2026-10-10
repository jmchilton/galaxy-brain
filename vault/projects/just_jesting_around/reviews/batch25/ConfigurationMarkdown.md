# ConfigurationMarkdown

Selected originator: `client/src/components/ObjectStore/ConfigurationMarkdown.test.ts`. Baseline and final: **4 tests**.

The shared mutable `let wrapper` is gone. One local `mountConfigurationMarkdown(markdown, admin)` replaces two mount styles: three cases used `props`/`global` and the sanitizer case used `propsData`/`localVue`. Each case's markdown and admin flag stay visible at the call. The sanitizer spy is cleared in `beforeEach` instead of inside that one case (vitest is not configured to clear mocks globally). Case names are now behavioural rather than "should …". The `ConfigurationMarkdown as object` casts are removed, and vue-tsc accepts that.

Preserved: emphasis rendered as `<em>content</em>`; admin HTML kept as `<b>content</b>`; the non-admin `not.toContain("<b>content</b>")`; and the exact `sanitizeHtml(html, "links")` call. Strengthening: the non-admin case also asserts `text()` is exactly `the <b>content</b>`, so the tag must appear as escaped literal text. The negative check alone would also pass if nothing rendered. With `admin: true`, the new assertion fails on its own (`expected 'the content' to be 'the <b>content</b>'`).

Reuse: `getLocalVue` and the global pass-through `sanitizeHtml` mock from `tests/vitest/setup.ts`. No other suite mounts ConfigurationMarkdown, so the helper stays local. `shallowMount` stays, since there are no children.

Validation: 4 tests pass shuffled (seed 250101). ESLint, Prettier and full `vue-tsc --noEmit` are clean.

Guidance: none.
