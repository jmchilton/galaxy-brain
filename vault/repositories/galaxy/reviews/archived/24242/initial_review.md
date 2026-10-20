# Initial review: #24242 Name tool form radio groups by their parameter title

Profile `default`, Opus 5.5 (claude-opus-5-5), low effort. Reviewed commit `ea131e56e92b7695b7d3b6bf40704b43761d2937` (diffed against merge-base with `origin/dev`). Static review; vitest not run (no `client/node_modules` in worktree).

## Summary

`FormSelection` already receives `aria-labelledby` from `FormElement` (`props.title ? titleId : undefined`, FormElement.vue:454) and, since #24187, forwards it to `FormCheck`. This PR forwards the same prop to `FormRadio`, which binds it on `GRadioGroup` (the fieldset). It is a line-for-line mirror of the checkbox fix (commit `fc85cdddcf8`, `FormCheck` -> `GCheckboxGroup`).

## Findings

None at P1/P2/P3.

Checked:

- **Reuse / sibling consistency** — reuses the existing `titleId` label and the `ariaLabelledby` prop already on `FormSelection`; no new id scheme or `aria-label` string. Matches `FormCheck` exactly.
- **Empty title** — `FormElement` passes `undefined` when there is no title, so no dangling `aria-labelledby`; the new FormElement test covers this.
- **Other callers** — `Form/Elements/FormRadio.vue` is imported only by `FormSelection.vue`; the prop defaults to `undefined`, so no change elsewhere.
- **Selenium/Playwright** — no `navigation.yml` selector depends on the radio fieldset attributes; additive attribute only.
- **Tests** — the FormElement test asserts the id resolves to the rendered title text and the no-title case, which is the meaningful end-to-end check. The FormRadio unit test overlaps it but follows the same pattern as the FormCheck sibling test; cheap, not worth asking to drop.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).
