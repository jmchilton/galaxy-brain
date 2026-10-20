# PR #24261 initial review (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: claude-opus-5-5, effort: medium
- Reviewed commit: `4d7934dc99c31b83d7c165be76a2187e2fde5a29` (diffed against `git merge-base origin/dev HEAD` = `7c86d742327`)

## Summary

Solid, well-scoped PR. It makes `GFormInput` a full-width field box built from new `--field-*` geometry tokens, and adds `size`, `state` and a focus ring. The tokens sit in `tokens.css` and in the client's mirror, which the contract test keeps in step. `GSelect` moves onto the same tokens, keeping its fallbacks. The `:where()` zero-specificity baseline follows the package README rule, and the `INSTANCE_LISTENERS: false` opt-out follows the `GCheckbox`/`GRadio` precedent.

Checks run:
- `GFormInput.test.ts` and `tokensContract.test.ts` pass (11 tests).
- Red check: removing `INSTANCE_LISTENERS: false` makes "passes undeclared listeners through to the input" fail, so the test covers the compat fix. Vitest runs under `@vue/compat` MODE 2. The probe was reverted.
- I walked all 11 client consumers and the Tool Shed consumers. No layout breakage found. `.form-row input[type="text"] { max-width: 90% }` would now match, but no consumer sits in a `.form-row`. `WorkflowExtractionForm` already forces `input { width: 100% }` in its flex row.

No P1 or P2 findings. Every finding below is minor.

## Findings

### P3 1: Field tokens cover geometry only, so GFormInput and GSelect still disagree on field chrome

The PR's goal is that fields match each other. `GFormInput` and `GSelect` now share height, padding and medium radius. The rest of their field chrome still differs, and these two controls sit next to each other in the same forms:

| | GFormInput (this PR) | GSelect |
|---|---|---|
| border | `--color-grey-400` | `--color-grey-500`, with the comment "grey-500 keeps the border >= 3:1 against the page (WCAG 1.4.11)" |
| focus ring | 2px `blue-600`, offset 2px, plus a 2px background box-shadow gap | 2px `blue-500`, offset 1px |
| disabled | `grey-200` background | `grey-100` background, `grey-600` text, `cursor: not-allowed` |
| small/large radius | `--field-radius-small` / `--field-radius-large` | always `--field-radius-medium` (the PR leaves GSelect's output unchanged on purpose) |

grey-400 (`#8f9199`) on white works out to about 3.14:1, so it still passes 3:1. Even so, GSelect's own comment argues for grey-500, and this PR is the one that sets the field's contrast story.

Suggested fix: align the two now, or name it as follow-up scope. The PR already adds `--field-*` tokens, so adding field-chrome tokens (border, focus ring, disabled background) would make `GSelect` and `GFormInput` one abstraction rather than two copies drifting apart. At minimum, use `grey-500` for the input border and give `GSelect` the same focus ring and small/large radius tokens.

### P3 2: Tool Shed fields now get a double focus ring

The PR says the Tool Shed's "`shed.css` overrides still win for padding, font and border". That holds, but `shed.css` also draws its own focus ring:

```css
.shed-main input.g-form-input:focus { border-color: …; box-shadow: 0 0 0 1px var(--color-galaxy-primary, #25537b); }
```

- Its specificity is (0,3,1). That beats GFormInput's scoped `.g-form-input:focus-visible[data-v]` at (0,3,0), so shed's 1px box-shadow replaces the background-gap box-shadow.
- `shed.css` never sets `outline`, so the new `outline: 2px solid blue-600; outline-offset: 2px` still applies.
- Result: a focused shed field (login, register, repository filter) shows a 1px navy ring on the border, a 1px gap, then a 2px navy outline. Both are `#25537b`.

Suggested fix: pick one ring. Either `shed.css` drops its `box-shadow` ring and adopts the package outline (simplest, and both are the same colour), or `shed.css` sets `outline: none` on `:focus-visible`. Also update the PR description's Tool Shed sentence.

### P3 3: The ":focus" glow rules almost never apply, and mouse focus also gets the new ring

Browsers match `:focus-visible` on every focus of a text-entry `<input>` (text, password, email, search, number), mouse clicks included. So for every type `GFormInput` is actually used with, the `:focus-visible` rule always wins, and these never show:

- the `:focus` glow `box-shadow: 0 0 0 0.2rem rgb(... / 0.33)`
- its `g-valid` and `g-invalid` `:focus` variants

They only show for non-text types such as `range` focused by mouse. Two consequences:

- The description and screenshots call the new style the "keyboard focus ring". Clicking into any `GFormInput` now shows the 2px navy outline too. That is fine, and arguably better, but it is a visible change for every user, not just keyboard users. The description should say so.
- About 12 lines of state-specific glow CSS are effectively dead.

Suggested fix: drop the `:focus` glow box-shadows, including the valid and invalid variants. Keep `outline: none` on `:focus` only if `range` needs it. The valid and invalid blocks then reduce to `border-color` plus `outline-color`.

### P3 4: Input-group font sizes use magic multipliers instead of the font tokens, and one comment overstates specificity

- `.input-group-sm > .g-form-input { font-size: calc(var(--font-size-medium) * 0.875) }` gives 0.744rem. `.g-small` uses `var(--font-size-small)`, which is 0.75rem. `-lg` likewise gives `calc(medium * 1.25)` = 1.0625rem against `--font-size-large` = 1rem. That makes two definitions of the "small" and "large" field. Using `--font-size-small` and `--font-size-large`, or a `--field-font-size-*` token next to the new geometry tokens, would keep one source.
  - The comment says this matches the group's buttons. If that is the reason for the 0.875 and 1.25 factors, they deserve a token, not a literal.
- The comment "Font stays at class specificity: page-level font rules on input elements would beat :where()" suggests class specificity is enough to win. It isn't: `client/src/style/scss/overrides.scss` has `input[type="text"], input[type="password"] { font-size: $font-size-base; line-height: $line-height-base }` at (0,1,1), which still beats `.g-form-input` at (0,1,0). That matters more now that `type="text"` is the default. It is harmless only because `$font-size-base` (0.85rem) and `$line-height-base` (1.5) equal the token values. Reword the comment, or drop the claim.

## Non-findings / notes

- `type="text"` default: consumer `type` overrides it as expected (tested). Fallthrough attrs win over template attrs on the root.
- `state` used to fall through as a literal `state="false"` HTML attribute on `CopyModal` and `UserDeletion`. As a prop it now fixes those, with `aria-invalid` matching `GSelect`.
- Removing `z-index: 999`, and raising focus to 3 only inside `.input-group`, matches Bootstrap and helps overlaid icons (for example the Tool Shed grid filter icon).
- Tests: the class-name assertions are implementation-shaped but reasonable for a library component. The listener test is a real regression guard (red-checked).
- No security concerns.
