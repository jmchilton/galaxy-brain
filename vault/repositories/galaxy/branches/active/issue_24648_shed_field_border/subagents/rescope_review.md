# Rescope review: issue_24648_shed_field_border

Acted on all three findings in `50e41129faa`: the select hover is now limited to outlined and filled fields, it skips `.q-field--error`, and a focused, hovered select keeps its primary `::before` border (`.q-field` added so it outranks Quasar's 0,4,0 rule). Nothing left unaddressed.

## Findings

No blocking issues. The diff is CSS-only and the rules do what the commit messages say. Measured in the browser, the inputs and selects match.

1. **Minor, existing before this branch: a focused select loses its border while hovered.** Quasar's `.q-field--outlined.q-field--highlighted .q-field__control:hover:before { border-color: transparent }` (QField.sass, around line 285) outranks `.shed-main .q-field--focused .q-field__control::before`. Quasar does this because it draws the focus border on `::after`, but `shed.css` hides `::after`. The result is a focused, hovered select with no `::before` border, held up only by the 1px `box-shadow` ring. That ring is the same colour, so the visible change is small. The hover rule in this branch skips focused fields, so it neither causes nor fixes this. A possible follow-up is `.shed-main .q-field--focused .q-field__control:hover::before` with the primary colour.
2. **Nit: the select hover rule is broader than the rest rule.** `.shed-main .q-field:not(.q-field--focused):hover .q-field__control::before` matches every q-field, but the rest-state border only targets `--filled` and `--outlined`. A standard (underline) or borderless q-field would get its underline recoloured to grey-700 on hover. The showcase has only outlined selects, so nothing is visibly wrong. Adding `--outlined`/`--filled` to the selector would make the two rules consistent.
3. **Nit: select error state.** The input hover skips `.g-valid` and `.g-invalid`, but the select hover does not skip `.q-field--error`. No select in the shed currently uses `error`, so this is not a problem today.

The `textarea.g-form-input` selector was correctly dropped (it matched nothing). Grey-500 (#63656d) on white is about 5.9:1, which clears the 3:1 WCAG 1.4.11 needs. The comments are accurate.

## Browser verification

The Vite dev server ran on :4040 with `TOOL_SHED_URL=https://toolshed.g2.bx.psu.edu`, driven by a headless Chromium (Playwright). The server was stopped afterwards.

| Element | Rest | Hover | Focus | Focus + hover |
|---|---|---|---|---|
| `/login` first `input.g-form-input` | rgb(99,101,109) grey-500 | rgb(53,55,63) grey-700 | rgb(37,83,123) primary | rgb(37,83,123) primary |
| `/_component_showcase` first `.q-field--outlined` (`::before`) | rgb(99,101,109) grey-500 | rgb(53,55,63) grey-700 | rgb(37,83,123) primary (after the pointer leaves) | rgba(0,0,0,0) transparent (finding 1) |

## Details

- The review covered `git diff origin/dev...HEAD`, with commits 132b1ec8a9c and 91906239662.
- The hover rule `:hover:not(:focus, .g-valid, .g-invalid)` uses a selector-list `:not()`, which is supported by all evergreen browsers.
- The focus rule (0,3,1 plus a pseudo-class) beats the hover rule only because hover excludes `:focus`, so their order is safe.
- The select's `opacity: 1` override keeps the border visible at rest, which was confirmed by the measured grey-500.
- Nothing in this review is security-sensitive.
