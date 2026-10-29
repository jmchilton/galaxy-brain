Profile: gx_risk_assessment, via claude-opus-5-5 at low effort. Reviewed commit bb9621184d6f58668bc485d127a2c06528c7d57b.

Risks are minimal. This client-only styling and ARIA change doesn't commit Galaxy to choices that are hard to reverse (a two-way door).

<details><summary>Risk Details</summary>

- Every GButton and GLink gets a new focus ring (a 2px blue-600 outline with a background-colored gap), so the visual change reaches the whole app. The `--background-color` gap may look wrong on colored or dark surfaces, such as `g-dark` links and buttons inside panels.
- The solid pressed-state fill changes from grey-400 to a new `--color-grey-250` token, which adds a new public token to the UI package's palette.
- `pressed` now defaults to `undefined` instead of `false`. A caller that passes a possibly-undefined value without `?? false` silently loses `aria-pressed`. This PR fixes two such callers, but others may exist.
- `aria-pressed` is now emitted on many existing toggle buttons, which can change how screen readers announce them. Any test or selector that matches on attributes may see new output.
- The GButtonGroup `:has()` selectors and the -1px margin and border tweaks can shift grouped-button layout by a pixel. Older browsers without `:has()` support lose only the z-index lift.

</details>

<details><summary>Risk Review Advice</summary>

Spot-check the focus ring and pressed state in light and dark contexts, on solid, outline, and transparent variants, and in button groups (including the pixel-level border overlap). Check that the `pressed: undefined` default is the intended contract, and look for other callers that pass an optional boolean to `:pressed`.

</details>
