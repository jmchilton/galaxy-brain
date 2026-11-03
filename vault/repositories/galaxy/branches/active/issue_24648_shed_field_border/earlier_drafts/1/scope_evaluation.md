Run via Claude Opus 5.5 at high effort.

**Recommendation: modest expansion (Scope B).** Keep the grey-500 border fix and the `dev` target. Also clean up the rest of the shed.css form-field block it touches: settle whether the brand focus border actually applies (the implementer and the reviewer disagree on specificity), and either make it apply or delete it and fix the "brand focus border" comments. Add one darker hover border (for example grey-700) shared by the inputs and the Quasar selects, drop the dead `textarea.g-form-input` selector, and check all of this in a browser. The diff stays small (about 20 lines of CSS, under the 100-line threshold, so there is no decomposition section). It turns "one wrong colour" into "a coherent, verified field-state block," and Galaxy reviewers usually ask for that.

## A. As implemented

Removes the 1.81:1 `#bbc0d2` input border override and the `#8992b2` hover rule, so GFormInput's grey-500 border and its valid/invalid colours apply. Gives the Quasar select `::before` border grey-500 too.

| Pros | Cons |
|---|---|
| - Fixes the 1.4.11 failure the issue describes, for inputs and selects<br>- Restores valid/invalid border colours, which the shed rule had been overriding<br>- 9-line, low-risk diff | - Leaves a focus rule whose effect is disputed: the review calls it dead at (0,2,2) vs (0,3,0); the debrief says it applies at (0,3,1)<br>- Section comments still promise a "brand focus border" that may never render<br>- Removes hover feedback on inputs. Selects already had none, so the two stay inconsistent in a way nobody designed<br>- Keeps a `textarea` selector that matches nothing, under a comment that would be wrong for it<br>- Not rendered. Whether a Quasar global reset beats the `:where` border was never checked |

## B. Modest expansion: coherent form-field states (recommended)

A, plus: resolve the focus-rule question in a browser and make the rule effective (raise its specificity) or delete it, and update both section comments to match. Add a darker-than-grey-500 hover border for inputs and selects alike. Drop the `textarea.g-form-input` selector.

| Pros | Cons |
|---|---|
| - Handles every review finding about the touched block, not just the issue's symptom<br>- Hover feedback goes darker instead of disappearing, as the issue's own plan proposed ("Adjust the hover rule")<br>- Inputs and selects behave the same at rest, on hover and on focus<br>- Still a single small CSS commit | - Adds a little design judgement (the hover colour, keeping or dropping the brand focus colour) that a reviewer could bikeshed<br>- Needs a browser check, which A was going to defer to screenshots anyway |

<details>
The specificity disagreement is the key open fact. `.shed-main input.g-form-input:focus` counts two classes, one pseudo-class and one type, which is (0,3,1). Scoped GFormInput `:focus` is `.g-form-input:focus[data-v-x]`, which is (0,3,0). On that count the debrief is right and the rule applies. Even so, the reviewer's note about the misleading comment holds for the Quasar section, and a computed-style check settles both. Hover is not required by WCAG. The reason to restore it is that the issue's planned fix promised it, and selects and inputs should match.
</details>

## C. Wider expansion: Tool Shed contrast/token sweep

B, plus: replace or define the undefined `--color-ebony-clay-*` tokens (17 uses in the shed frontend, all rendering their fallbacks), and audit the other shed borders: RevisionSelect pills, grey-200/300 card borders in MetadataInspector tabs and ComponentShowcase, and bay-of-many-200 chips.

| Pros | Cons |
|---|---|
| - Fixes the root cause that let `#bbc0d2` slip in: tokens that silently fall back<br>- Catches any state-conveying borders (pills) that also fail 1.4.11 | - Most of those borders are decorative containers that 1.4.11 does not cover, so most of the sweep is churn<br>- Defining ebony-clay tokens in galaxy-ui `tokens.css` is a design-system change with its own reviewers<br>- Much harder to verify visually; better as a follow-up issue |

## D. Backport to release_26.2

A or B on `release_26.2`, with an explicit grey-500 border colour, because 26.2 lacks #24569's GFormInput border.

| Pros | Cons |
|---|---|
| - The bug exists on 26.2 | - Needs a divergent patch: removing the override there leaves a currentColor border<br>- The fix depends on #24569, so targeting dev is the clean choice. If wanted, backport later as its own small PR |

## E. Contraction: inputs only

Fix only the GFormInput border and leave the Quasar selects.

| Pros | Cons |
|---|---|
| - Smallest possible diff | - The issue names the selects explicitly; leaving them would ship a known 1.4.11 failure next to the fix. Not recommended |
