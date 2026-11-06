# Initial review: #24696 Share one focus ring across galaxy-ui controls

- Profile: `_shared/reviewers/default.md`
- Model: Opus 5.5 (`claude-opus-5-5`)
- Effort: set by coordinator; value not visible to this agent
- Reviewed commit: `b26614f7c11` (merge base `66760b89`; `origin/dev` at `78816c01d93` also checked)

## Verdict

Good to merge after one small update. No bugs found. The mixin is the right abstraction and the visible changes match the description. The one real item is that the PR's stated follow-up is already due: #23964 merged on 2026-11-04, so the mixin can use `--color-ring` now. The other two findings are minor reuse and cleanup points.

## Bugs

None.

## Findings

### P2 1: Move the mixin default to `--color-ring` now; #23964 has merged

The description defers this "once #23964 lands". #23964 merged on 2026-11-04, and `origin/dev` already has `--color-ring: var(--color-blue-600)` in `theme.css` and the generated `tokens.css` (commit `f772795af5e`, which sets it to blue-600 to match these rings). Both consumers load `tokens.css`, and `@galaxyproject/brand-tokens`, which the Tool Shed also loads, doesn't define `--color-ring`. If this merges as is, the semantic token and the shared ring are two separate sources for the same colour, and the follow-up has no tracked owner.

Suggested fix: merge `dev`, then change one line in `_focus-ring.scss` and drop the follow-up from the description. The rendered colour stays the same.

```scss
$focus-ring-color: var(--color-ring, #25537b);
```

### P3 1: The inset ring stays duplicated outside the partial

`GDropdownItem.vue` and `GDropdownItemButton.vue` carry the same three-declaration inset ring, with blue-600 hard-coded. Keeping the inset shape is a decision the PR explains, and this doesn't question it. The copies are still a second source for the ring colour, and they won't follow the default once P2 1 lands.

Suggested fix: add a `focus-ring-inset` mixin to the partial, which already describes itself as "mixins only", and include it from both items. Both `<style scoped>` blocks need `lang="scss"`. The inset colour should use the same `$focus-ring-color`.

### P3 2: The mixin's `$color` parameter has no caller

No `@include` passes `$color`. Stated `GFormInput` and `GSelect` fields tint through `outline-color`, and the `GAlert` close button stays outside the mixin because of its `-2px` offset. The README snippet still advertises `$color: ...`.

Suggested fix: remove the parameter and the README mention, and use `$focus-ring-color` directly. It is easy to add back when a caller needs it.

## Description claims checked

| Claim | Result | How |
|---|---|---|
| No visual change: `GFormInput`, `GButton`, `GLink`, `GPagination`, `GRadio`, `GCheckbox` | Confirmed | Compiled every SCSS block in these components at base and head with sass 1.101.0 and diffed the `:focus-visible` rules. The only differences are added `var()` fallbacks. `GRadio` and `GCheckbox` are byte-identical. |
| `GSelect` gets the shared ring and state tints | Confirmed | Same diff. |
| `GDropdown` toggle gains the halo | Confirmed | Same diff. By specificity, the scoped rule (0,3,0) beats Bootstrap's `.btn-*:focus` (0,2,0). Not checked in a running client. |
| Tool Shed frontend path resolution | Confirmed | Ran `pnpm install --frozen-lockfile` and `vite build` on an archive of the PR head. The `file:` copy of galaxy-ui includes `_focus-ring.scss`, and the built CSS contains the expected `GSelect` and `GDropdown` rules. The PR's "Toolshed tests" run, which builds the frontend with `make client`, also passed. |
| `@use` emits no CSS | Confirmed | The partial has only variables and a mixin. |
| Stated `GFormLabel`: field shows halo plus tinted ring | Confirmed by reading code | The only two stated uses, `CopyModal.vue` and `UserDeletion.vue`, both forward `state` to a nested `GFormInput`. No stated `GFormLabel` wraps a raw input, so removing the shadow rules loses no ring. |
| Contrast figures, blue-600 and blue-500 on white, grey-100, grey-200 | Confirmed | Recomputed from the token values: 8.07 / 7.66 / 6.20 and 4.33 / 4.10 / 3.32. |
| Eight of nine replaced rings used blue-600 | Confirmed | Only `GSelect` used blue-500. |
| Chrome matches `:focus-visible` on a mouse click into a `<select>` | Confirmed | Playwright on Chromium 157: `input` and `select` match, `button` does not. |
| Merges cleanly with dev, including the #24568 fix | Confirmed | `git merge-tree` against `78816c01d93` reports no conflicts. In the merged tree, `GButton` and `GRadio` draw their rings only through the mixin; dev's changes there touch fills, borders and text colour. |
| #24584 `GBadge` | Still open | `GBadge` isn't on `dev`, so this PR doesn't need to change it. |

## Other checks, no action needed

- **Other ring copies on `dev`:** none in `client/packages/ui` beyond those in this PR and its documented exceptions.
- **`GSelect` clipping:** no file using `GSelect` also uses an input group or `overflow: hidden`, so the larger ring needs no `z-index` lift like `GFormInput`'s. This was a per-file grep, so an ancestor in another component could still clip it.
- **Masthead:** `MastheadDropdown` uses `BNavItemDropdown`, not `GDropdown`, so no page-colour halo lands on the dark masthead.
- **Open dropdowns:** Bootstrap's `.show > .btn-*.dropdown-toggle:focus` outranks the halo, but keyboard opening moves focus to a menu item, so this shouldn't show in normal use.
- **`GDropdown` split action button:** it has no `.dropdown-toggle` class and so no shared ring, but no application code uses `split`.
- **Tests:** none are needed for this CSS-only change. A test asserting these rules would only restate the stylesheet.

Not visually tested in a running Galaxy or Tool Shed; the PR's screenshots were not independently reproduced.
