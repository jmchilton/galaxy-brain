# FormCardSticky

Selected originator: `client/src/components/Form/FormCardSticky.test.js`. Baseline and final: **8 tests**.

The props and mount factory move out of the `describe` to module level (`DEFAULT_PROPS`, `mountFormCardSticky(props, slots)`), the describe is named `FormCardSticky`, and the selectors gather in a `SELECTORS` constant keyed on the component's own markers (`itemprop`, `data-description`, `#tool-card-body`). The mount no longer registers `Heading` and `LoadingSpan` as global components: the SFC imports both locally, so the registration did nothing (no Vue warnings before or after, and `findComponent(LoadingSpan)` still matches). `mount` stays, so the heading, icon, badge and alert all render for real. The README cites this file as its "Multiple slots" example; the slot case keeps its shape and name.

Strengthened: the error message is asserted inside the alert instead of anywhere in the wrapper, and the description and version are read from their own elements with exact text (`[itemprop='description']`, `[data-description='galaxy tool version']`) instead of `wrapper.text()` containment. Every other assertion is unchanged, including the logo `src`, the icon fallback's `fa-fw` class and missing logo, every newer-version badge attribute, its click emission, its absence by default and the three slot contents.

Reuse: none needed; no new helper.

Validation: 8 tests pass shuffled (seed `420101`, `NODE_OPTIONS=--no-webstorage`). ESLint, Prettier and full client vue-tsc pass.

Guidance: none.
