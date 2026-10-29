Looks good to me and the requested review changes below seem reasonable to me. -John

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

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

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24269_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24269_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24269_review_0) starts from the reviewed commit `bb962118`. It fixes the review's two CSS problems: grouped pressed buttons now keep their own border colour, and focus no longer darkens an unpressed grey button. It moves `CellAdd` from `aria-pressed` to `aria-expanded`, adds a test for the consumer `aria-pressed` override, drops `FormSelectMany`'s redundant bindings, rewords the stale comment, and adds `aria-pressed` assertions to the existing workflow editor comments Selenium test. Vitest passes for `GButton.test.ts` (32), `CellAdd.test.js` (6, and the new case fails at `bb962118`) and `FormSelectMany.test.ts` (9). I checked the CSS fixes by computed style in Chromium. I haven't run the Selenium assertions.

- [`b09afaf1d74`](https://github.com/jmchilton/galaxy/commit/b09afaf1d74) Keep pressed GButton border colour in a GButtonGroup: the group rules set only the border width, so they no longer reset the colour to `currentcolor`.
- [`dd489a4ee52`](https://github.com/jmchilton/galaxy/commit/dd489a4ee52) Stop darkening a focused unpressed grey GButton: removes `:focus-visible` from the grey fill and border rules, and keeps `:active` reachable from hover and keyboard focus.
- [`9da47952f84`](https://github.com/jmchilton/galaxy/commit/9da47952f84) Announce CellAdd's popup with aria-expanded, not aria-pressed: binds a string `aria-expanded` from the popper's visibility and adds a `CellAdd.test.js` case.
- [`3b67427d22b`](https://github.com/jmchilton/galaxy/commit/3b67427d22b) Test that a consumer aria-pressed overrides GButton's: adds a `GButton.vue pressed` case and removes FormSelectMany's two redundant `aria-pressed` bindings.
- [`6357fbeb10c`](https://github.com/jmchilton/galaxy/commit/6357fbeb10c) Reword the coloured pressed GButton comment: describes the block on its own terms instead of pointing at the grey block.
- [`32ecf691d43`](https://github.com/jmchilton/galaxy/commit/32ecf691d43) Assert the comment toolbar toggles announce aria-pressed: `test_editor_place_comments` checks `"false"`, then `"true"`, around each bold and italic click (unrun).

</details>

</details>

### P2 1: Pressed outline and transparent buttons in a GButtonGroup get a text-coloured border edge (implementation verified)

`GButtonGroup` hides inner borders with the shorthand `border-right: 0` (`border-bottom: 0` in vertical groups). The shorthand also resets the colour to `currentcolor`. The new pressed rule restores only the style and width. At (0,5,0) the group rule beats the (0,3,0) `.g-button.g-<color>` rule, which is the only rule colouring a pressed outline or transparent button's border. The pressed button's restored edge therefore takes its text colour: a near-white line on the blue fill.

<details><summary>Details</summary>

Call sites hit:
- `PageRevisionView.vue`: blue outline toggles, horizontal group, so the right edge.
- `CellWrapper.vue`: blue transparent toggles, vertical group, so the bottom edge.
- `ListHeader.vue`: grey outline toggle. This one ties at (0,5,0), so the result depends on stylesheet order.

Solid pressed buttons are unaffected: their `:not(.g-outline):not(.g-transparent)` rule is (0,6,0).

</details>

<details><summary>Evidence</summary>

I compiled `GButton.vue` and `GButtonGroup.vue` with `@vue/compiler-sfc` and rendered them in Chromium, checking computed styles with each stylesheet loaded first.

At `bb962118`:

| Button | Edge | Colour |
|---|---|---|
| Pressed blue outline | right | `rgb(241, 249, 254)` (blue-100, the text colour) |
| Pressed blue transparent | bottom | `rgb(241, 249, 254)` |
| Pressed grey outline, GButton CSS first | right | `rgb(248, 249, 250)` (grey-100, the text colour) |
| Pressed grey outline, group CSS first | right | `rgb(35, 38, 47)` (grey-800) |

With the fix, both orders give blue-600 `rgb(37, 83, 123)` on the pressed blue edges and grey-800 on the grey outline. Unpressed non-last buttons still have a 0px right/bottom border. Transparent unpressed buttons keep their `!important` 1px transparent border, as before.

</details>

Set only the width in the group rules (`border-right-width: 0` / `border-bottom-width: 0`). The pressed override then needs only `border-right-width: 1px` / `border-bottom-width: 1px` and the negative margin.

Fixed in [`b09afaf1d74`](https://github.com/jmchilton/galaxy/commit/b09afaf1d74).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 2: A focused unpressed grey button now looks darker than a focused pressed one (implementation verified)

The PR keeps a pressed solid grey button at its light grey-250 fill under keyboard focus. The unpressed grey button still darkens on `:focus-visible`, to a grey-300 fill and a grey-600 border. Under focus, both now have the same border, and the unpressed one has the darker fill. A keyboard user tabbing through a toggle group (dataset type buttons, `JobStep`) reads the focused unpressed button as pressed.

<details><summary>Evidence</summary>

Computed styles in Chromium after `:focus-visible` with the transition settled, at `bb962118`:

| Grey button | Fill | Border |
|---|---|---|
| Unpressed, focused | `#aab0b4` (grey-300) | grey-600 |
| Pressed, focused | `#c1c8d0` (grey-250) | grey-600 |

After the fix:

| Grey button | Fill | Border |
|---|---|---|
| Unpressed, focused | grey-200 | grey-300 (its rest look) |
| Pressed, focused | grey-250 | grey-600 |

</details>

Apply the PR's own rule ("the ring shows focus") to the unpressed grey button too, so that focus doesn't change its fill or border. Hover is unchanged. The `:active` feedback stays reachable from both hover and keyboard focus.

Fixed in [`dd489a4ee52`](https://github.com/jmchilton/galaxy/commit/dd489a4ee52).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: `CellAdd` opens a popup but now announces itself as a toggle (implementation verified)

The PR changes `CellAdd.vue` to `:pressed="popperRef?.visible ?? false"`, so the button now always carries `aria-pressed`. It actually opens a click-triggered `Popper` panel, and Popper sets no ARIA. By the PR's own rule ("disclosures keep the pressed styling only"), this button should announce expanded or collapsed instead. Nothing tests the change either.

Bind `:aria-expanded="String(popperRef?.visible ?? false)"`. Use a string because compat drops a boolean `false`. GButton's disclosure check then drops `aria-pressed` on its own, and the pressed styling stays. A new `CellAdd.test.js` case checks that `aria-expanded` goes from `"false"` to `"true"` on click, with no `aria-pressed`. The case fails at `bb962118` and passes with the fix.

Fixed in [`9da47952f84`](https://github.com/jmchilton/galaxy/commit/9da47952f84).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Nothing tests that a consumer's `aria-pressed` wins, and `FormSelectMany` still sets its own (implementation verified)

The PR description promises that an explicit `aria-pressed` from a consumer still wins. That holds only because `:aria-pressed` comes before the `$attrs` spread in GButton's template, and no test covers it. Separately, `FormSelectMany.vue` still binds `` :aria-pressed="`${caseSensitive}`" `` and `` `${useRegex}` `` beside `v-model:pressed`. GButton now derives the same value, so these bindings are redundant.

Add a `GButton.vue pressed` case: `mountGButton({ pressed: true, "aria-pressed": "mixed" })` should render `"mixed"`. Drop the two redundant bindings. The `FormSelectMany` tests still pass with them removed.

Fixed in [`3b67427d22b`](https://github.com/jmchilton/galaxy/commit/3b67427d22b).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: The coloured pressed block's comment points at the grey block, which no longer matches (implementation verified)

The coloured `@each` pressed block says "See the grey block above: restate the hover / focus-visible feedback". The grey block now restates hover only, on purpose. The coloured pressed button still darkens to -900 on focus, which is fine because -900 stays darker than a focused unpressed -700. Only the comment is misleading.

Reword the comment to describe this block on its own terms and to say why colour and grey differ.

Fixed in [`6357fbeb10c`](https://github.com/jmchilton/galaxy/commit/6357fbeb10c).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: The focus-ring declarations are copied, not shared

GButton and GLink now carry the same three-line ring:

```
outline: 2px solid var(--color-blue-600);
outline-offset: 2px;
box-shadow: 0 0 0 2px var(--background-color);
```

`GDropdown.vue` has the same outline without the gap. `GCheckbox`, `GRadio` and `GSelect` use blue-500 with other offsets. The package has one shared stylesheet, `packages/ui/src/styles/tokens.css`. Ring tokens there would leave something reusable for the rest of #23812 instead of another copy. Examples are `--focus-ring-color`, `--focus-ring-width` and `--focus-ring-offset`. Adding them extends the package's public token contract (`NON_PALETTE_TOKENS` in `tokensContract.test.ts`), so this fits a follow-up if #23812 already plans a shared ring.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort.

</details>

### P3 5: No end-to-end check of the headline `aria-pressed` claim

`test_editor_place_comments` (`lib/galaxy_test/selenium/test_workflow_editor.py`) already clicks the workflow editor's bold and italic toggles, which are `v-model:pressed` GButtons. Add assertions there, with no new test or selectors: `aria-pressed` is `"false"` before each click and `"true"` after. The toolbar's `commentOptions` are an in-memory store default (`false`), not user-persisted, so the starting value is stable. The review branch adds these assertions, but I haven't run them: that needs a Galaxy server.

Fixed in [`32ecf691d43`](https://github.com/jmchilton/galaxy/commit/32ecf691d43).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort.

</details>
