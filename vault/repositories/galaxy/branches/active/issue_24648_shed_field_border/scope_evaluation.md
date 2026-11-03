Run via Claude Opus 5.5 at high effort.

**Recommendation: keep the scope as implemented (the re-scoped Scope B), with no further change.** The branch already took the modest expansion. It fixes the issue's input border, gives Quasar selects the same grey-500 3:1 border, adds a consistent hover state, and fixes the focused-and-hovered select border that the review found. All of this stays inside the form-field rules of `shed.css` that the branch touches. The remaining candidates are decorative borders that WCAG 1.4.11 does not cover, the token-fallback cleanup, and a release backport. None of them fixes a related bug in the touched code, so they belong in separate work. The diff is 12 added and 7 removed lines of CSS, so no decomposition section is needed.

## As implemented (Scope B, re-scoped)

The input rule in `shed.css` no longer sets a border colour, so GFormInput's grey-500 applies again, along with its valid/invalid colours. The Quasar outlined/filled `::before` border uses grey-500. Inputs and selects get a grey-700 hover border that skips focused, valid/invalid and error fields. A focused, hovered select keeps its primary border. The unused textarea selector is gone.

| Pros | Cons |
|---|---|
| - Covers every Tool Shed form field, not only the issue's input<br>- Fixes the related focused-and-hovered select bug in the same rules<br>- Restores GFormInput's valid/invalid colours, which shed.css had overridden<br>- Colours measured in a browser; CSS-only and easy to review | - Slightly more than the issue literally asks (the hover and select changes)<br>- Targets dev only |

## Original scope (alt `issue_24648_shed_field_border_alt_original_scope`)

Drop the ebony-clay-200 border colour from the input rule, and nothing more.

| Pros | Cons |
|---|---|
| - Smallest possible fix for the reported symptom | - Selects keep the same ~1.8:1 border, so the bug is only half fixed<br>- Removes input hover feedback with nothing to replace it<br>- Leaves the existing focused-and-hovered select bug in place |

## Scope C: shed-wide contrast/token sweep

Also revisit the other low-contrast borders (`--shed-border` ebony-clay-100, and grey-200/300 card and list borders in RevisionsTab, ResetMetadataTab, ToolHistoryTab and ComponentShowcase), and possibly the `--color-ebony-clay-*` fallbacks used throughout the shed.

| Pros | Cons |
|---|---|
| - One pass over Tool Shed colour hygiene | - These are decorative container borders, which 1.4.11 does not cover, so they are not the same bug<br>- Touches many components unrelated to form fields; design decisions, not fixes<br>- Turns a crisp a11y fix into a restyle |

<details>
The ebony-clay uses outside the form rules are text colours on dark landing/header backgrounds and code-block backgrounds, not field borders. RevisionSelect's green/orange pill borders should be checked only if the pills carry state. A separate audit issue fits this better than this PR.
</details>

## Scope D: release backport

Also target `release_26.2`.

| Pros | Cons |
|---|---|
| - Users of the release would get the a11y fix | - The earlier re-scope found it would need a different patch (the shed frontend has diverged)<br>- GFormInput's grey-500 fix (#24569) is in dev; a backport depends on what that release ships<br>- Better done as a follow-up backport PR once this lands |
