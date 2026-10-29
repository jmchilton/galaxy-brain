# Initial review: galaxyproject/galaxy#24269

- Profile: default (+ shared, REVIEW_FOCUS)
- Model: claude-opus-5-5, medium effort
- Reviewed commit: `bb9621184d6f58668bc485d127a2c06528c7d57b` (merge-base `d57ebf638ac`)
- PR: "Make GButton and GLink focus rings and pressed state accessible" by itisAliRH

## Summary

Small, well-scoped a11y PR. The `aria-pressed` logic is sound. `withDefaults({ pressed: undefined })` correctly gets past Boolean casting, and the attrs-based disclosure check is reactive (the PR's own test proves it). The new focus ring meets its stated contrast: blue-600 `#25537b` on white is about 8.1:1. I ran `GButton.test.ts`, `tokensContract.test.ts`, `ListHeader.test.ts` and the `FormSelectMany` tests under node 22.20.0: 53 passed.

I also checked whether real call sites end up with both `aria-pressed` and an `aria-expanded` set by GPopover. GPopover only sets `aria-expanded` in dialog mode, and `FormDataExtensions` (hover) and `WorkflowAttributes` (manual) are not in dialog mode, so no conflict there today.

The main concerns are both CSS:
- the new group border rule comes out the wrong colour for outline and transparent pressed buttons;
- the lighter pressed grey now looks lighter than an unpressed grey button that has focus.

## Findings

### P2 1: Pressed outline/transparent buttons in a GButtonGroup get a `currentcolor` border edge

`GButtonGroup` hides inner borders with the shorthand `border-right: 0` (vertical groups: `border-bottom: 0`). That shorthand also resets `border-right-color` to `currentcolor`. The new pressed rule puts back only `border-right-style` and `border-right-width`.

Here is the specificity:
- The group's compiled selector `.g-button-group:not(.g-vertical)[data-v] > .g-button:not(:last-child)` is (0,5,0).
- A colored pressed outline or pressed transparent button gets its border colour only from the base `.g-button.g-<color>[data-v]` rule, which is (0,3,0). (`.g-outline:not(.g-pressed)` and `.g-transparent:not(.g-pressed)` don't match a pressed button.)
- So the group rule's `currentcolor` wins. For blue that is the text colour, blue-100 `#f1f9fe`: a near-white 1px line on a blue-600 fill, drawn over the next button.

Call sites hit:
- `PageRevisionView.vue`: blue outline toggles in a horizontal group.
- `CellWrapper.vue`: blue transparent toggles in a vertical group, so the bottom edge.

Grey outline pressed (`ListHeader.vue` view-mode toggle) ties at (0,5,0), so its result depends on stylesheet order. Only solid pressed (`:not(.g-outline):not(.g-transparent)`, (0,6,0)) is safe.

Verified by reading the cascade and specificity, not in a rendered browser.

Suggested fix: change the base rules to `border-right-width: 0` and `border-bottom-width: 0` (horizontal and vertical) so the colour isn't reset. The pressed override then needs only `border-right-width: 1px` / `border-bottom-width: 1px`, plus the negative margin. About 4 lines.

### P2 2: A focused unpressed grey button now looks darker than a focused pressed one

The PR lightens the solid grey pressed state from grey-400 to the new grey-250 and removes the darkening on `:focus-visible`. The unpressed grey button still darkens on `:hover, :focus-visible` to grey-300 with a grey-600 border (`&.g-grey &:focus-visible { border-color: grey-600 }`).

Under keyboard focus the two states now look like this:

| Grey button | Fill | Border |
|---|---|---|
| Unpressed, focused | grey-300 `#aab0b4` | grey-600 |
| Pressed, focused | grey-250 `#c1c8d0` | grey-600 |

The borders match. The fills differ by about 1.3:1, and the pressed one is the *lighter* of the two. On hover, both fills are grey-300 and only the border differs (grey-400 vs grey-600).

Before this PR, pressed was darker than every unpressed state (rest grey-400, focus grey-500). A keyboard user tabbing through a toggle group such as `JobStep` or the dataset type buttons now struggles to tell the focused button's state from its look.

Suggested fix: the ring now marks focus, so drop `:focus-visible` from the grey fill/border darkening as well, so focus doesn't change the fill in either state. Or keep pressed+focus visibly darker than unpressed+focus.

### P3 1: `CellAdd` is a popup trigger but is opted into `aria-pressed`

The PR changes `CellAdd.vue` to `:pressed="popperRef?.visible ?? false"`, so this button now always announces pressed/not pressed. It opens a click-triggered `Popper` menu, and Popper sets no ARIA. By the PR's own rule ("disclosures keep the pressed styling only") it should expose `aria-haspopup` / `aria-expanded`. GButton's disclosure check would then suppress `aria-pressed` automatically.

### P3 2: Redundant explicit `aria-pressed` in `FormSelectMany`, and the override path is untested

`FormSelectMany.vue` still passes `:aria-pressed="`${caseSensitive}`"` and `` `${useRegex}` `` beside `v-model:pressed`. GButton now derives the same value, so these can be dropped.

The PR description says "an explicit `aria-pressed` from a consumer still wins" (because `$attrs` is spread after `:aria-pressed`). No test covers that. Add one case to the new `GButton.vue pressed` describe block.

### P3 3: The colored pressed block's comment is stale, and colored and grey pressed now behave differently

The colored `@each` pressed block says "See the grey block above: restate the hover / focus-visible feedback". The grey block now restates hover only, and deliberately leaves focus alone. The colored pressed button still darkens to `-900` on `:focus-visible`.

Either apply the same "ring marks focus, fill doesn't change" rule to the colored variants, or reword the comment so it doesn't point at the grey block.

### P3 4: Focus-ring declarations are copied, not shared (REVIEW_FOCUS reuse)

GButton and GLink now carry the same three-line ring (`outline: 2px solid var(--color-blue-600); outline-offset: 2px; box-shadow: 0 0 0 2px var(--background-color)`). `GDropdown.vue` has the same outline without the gap. `GCheckbox`, `GRadio` and `GSelect` use blue-500 with different offsets.

The package has a single shared stylesheet, `packages/ui/src/styles/tokens.css`. A `--focus-ring-color` / `--focus-ring-offset` token pair, or a small shared partial, would leave something reusable behind for the rest of #23812 instead of a fourth copy. This fits a follow-up if #23812 already plans a shared ring.

## Non-findings / checked

- **White halo on dark surfaces.** Called out in the PR description, so not raised.
- **`pressed` call sites that might pass `undefined`.** Optional Boolean props in parent components are cast to `false`, and the toolbar store defaults `bold`/`italic` to `false`. The PR fixed the only nested-field cases (`TextComment`), plus `CellAdd`.
- **Group z-index rules.** `:not(:focus)` on the pressed lift correctly avoids out-ranking GButton's `:focus`/`:focus-visible` `z-index: 999`. The wrapper `:has()` lifts are sound.
- **Grouped toggles in other variants.** Layout doesn't shift between pressed and unpressed (the extra 1px border is cancelled by the -1px margin).
- **Tests.** The new GButton tests are behavioural and not trivial. The CSS changes have no automated coverage, which is expected for this layer.
