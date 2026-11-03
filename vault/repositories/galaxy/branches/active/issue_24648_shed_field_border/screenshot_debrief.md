# Screenshot debrief

Screenshots successfully obtained.

No E2E tests cover these styles, so the shots come from a headless Chromium script (cached Playwright chromium_headless_shell-1248). It drives the frontend's Vite dev server on :4040. The API was proxied to toolshed.g2.bx.psu.edu, and the browser aborted every request that wasn't a GET. For the "before" shots, origin/dev's `shed.css` was swapped in and then restored, and the worktree was clean afterwards.

## Computed border colours

The select colour is the `.q-field__control::before` border-top-color of the first outlined/filled Quasar field on /_component_showcase (the OverviewTab revision selector).

| Element / state | before (origin/dev) | after (branch) |
|---|---|---|
| input rest (/login) | #bbc0d2 ebony-clay-200 | #63656d grey-500 |
| input hover | #8992b2 ebony-clay-400 | #35373f grey-700 |
| input focus | #25537b primary | #25537b primary |
| select rest | #bbc0d2 | #63656d grey-500 |
| select hover | #bbc0d2 (unchanged) | #35373f grey-700 |
| select focus | #25537b | #25537b |
| select focused + hovered | transparent (border lost) | #25537b primary |

Note: the only `g-form-input` on /_component_showcase is the landing search box. LandingSearchBox.vue styles it separately (#2c3143 at rest), and the change leaves that colour alone. Its hover and focus rows match the /login input's.

## Files (`screenshots/`, gitignored)

- `{before,after}_login_{rest,hover_input,focus_input}.png`
- `{before,after}_showcase_{rest (full page),hover_input,focus_input,hover_select,focus_select,focus_hover_select}.png`
