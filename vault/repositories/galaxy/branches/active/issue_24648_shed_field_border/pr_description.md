Fix 🎯 #24648 - Tool Shed form fields keep a low-contrast border.

| Before | After |
|---|---|
| ![Tool Shed login form before, with faint field borders](screenshots/crop_before_login_rest.png) | ![Tool Shed login form after, with dark field borders](screenshots/crop_after_login_rest.png) |

Tool Shed fields draw a `#bbc0d2` border, 1.8:1 on white and below the 3:1 WCAG 1.4.11 asks of a field border. `shed.css` overrides the grey-500 border `GFormInput` got in #24569, so the Tool Shed missed that fix. Quasar selects have the same colour.

Border colours measured in a browser, before and after:

| Field state | Input before | Select before | Both after |
|---|---|---|---|
| Rest | `#bbc0d2` (1.8:1) | `#bbc0d2` (1.8:1) | grey-500 `#63656d` (5.8:1) |
| Hover | `#8992b2` | `#bbc0d2`, no change | grey-700 `#35373f` |
| Focus | primary `#25537b` | primary `#25537b` | primary `#25537b` |
| Focused and hovered | primary `#25537b` | outlined select: `::before` transparent, 1px ring remains | primary `#25537b` |

Select values were measured on an outlined select.

***This only changes form field borders in `shed.css`. It isn't a Tool Shed restyle: decorative card and list borders stay as they are, because WCAG 1.4.11 doesn't cover them, and `GFormInput` and Galaxy's client are untouched.***

***Going past the issue's input border is deliberate: fixing inputs alone would leave selects at 1.8:1 beside them, and the old `#8992b2` input hover would lighten a field against grey-500.*** Inputs and selects now share one darker hover colour, which skips focused fields and `GFormInput`'s valid and invalid fields.

<details><summary>Focused and hovered select</summary>

Before, Quasar cleared an outlined select's `::before` border when it was hovered while focused, so its outline thinned from 2px to 1px under the pointer. Now it matches the focused select exactly.

| Before | After |
|---|---|
| ![Focused, hovered select before](screenshots/crop_before_focus_hover_select.png) | ![Focused, hovered select after](screenshots/crop_after_focus_hover_select.png) |

</details>

<details><summary>Commits</summary>

All changes are in `lib/tool_shed/webapp/frontend/src/styles/shed.css`.

1. Drops the `textarea.g-form-input` selector, which matches no element. No visual change.
2. Drops the input border colour so `GFormInput`'s grey-500 applies, and gives Quasar selects grey-500.
3. Adds the shared grey-700 hover border.
4. Limits select hover to outlined and filled fields, and keeps the primary border on a focused, hovered select.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Builds on 🔀 #24569. Targets `dev` because `release_26.2` doesn't have #24569's grey-500 border; a backport would need its own patch. Alternative kept on 🌿[`issue_24648_shed_field_border_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24648_shed_field_border_alt_original_scope) - fixes the same rest colours but adds no shared hover border, leaves the focused, hovered select bug and keeps the unused selector. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the scope as implemented, with no further change.</summary>

The remaining candidates are decorative borders outside WCAG 1.4.11, token-fallback cleanup and a release backport. None fixes a related bug in the touched rules, so they belong in separate work.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24648_shed_field_border/scope_evaluation/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings.</summary>

The review saw the diff and style excerpts inline. It did not inspect Quasar's own styles or the rendered page.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24648_shed_field_border/codex_review/). Run via gpt-6.1-sol (Codex reported reasoning effort "none").

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>One behaviour-neutral commit drops an unused selector ahead of the fix.</summary>

No Tool Shed `.vue` file renders a `textarea` with `g-form-input`. Everything else in the diff is the fix itself.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24648_shed_field_border/baseline_refactor/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All items pass.</summary>

- [x] What does the user see when it fails? Tool Shed fields fall back to a lighter or inconsistent border, or lose the darker hover or brand focus border; cosmetic only, no functional impact.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A, CSS-only change with no tests.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A, no tests; the unused-selector cleanup is its own leading commit.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24648_shed_field_border/pr_checklist/). Run via Claude Sonnet 5.5 at medium effort.

</details>

## How to test the changes?
- [x] Instructions for manual testing are as follows:
  1. Start the Tool Shed frontend and open `/login`. Field borders should be dark grey at rest, darker on hover and primary blue on focus.
  2. Open `/_component_showcase` and repeat on the OverviewTab revision selector. Hover it while focused: the blue border should not thin.

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
