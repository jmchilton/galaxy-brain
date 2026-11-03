# Screenshot debrief

Screenshots successfully obtained.

No E2E test screenshots cover these fields, so these were taken with an ad-hoc Playwright script. The Tool Shed Vite dev server ran on :4040 with its API proxied to the public toolshed.g2.bx.psu.edu, which is read-only and needs no login. "Before" shots use the origin/dev `shed.css`, swapped in temporarily and then restored. "After" shots use the branch.

Images are in `screenshots/`, which is gitignored. Each pair has a `before_` and an `after_` version:

- `*_login.png`, `*_login_focus.png`: the /login form, the main GFormInput case. The focus shot focuses Username.
- `*_showcase.png`, `*_showcase_focus.png`: /_component_showcase, which has the landing search box and the Quasar outlined select.
- `*_search.png`, `*_search_focus.png`: /repositories_by_search, with its search box.

## Computed border-color

| Element | before (origin/dev) | after |
|---|---|---|
| `.shed-main input.g-form-input` (login) | rgb(187,192,210) #bbc0d2 | rgb(99,101,109) #63656d grey-500 |
| login input :focus | border rgb(37,83,123), outline 2px rgb(37,83,123) | same |
| Quasar `.q-field__control::before` (showcase) | rgb(187,192,210) | rgb(99,101,109) |
| landing/search box inputs | rgb(44,49,67) #2c3143 | same; these use component-scoped styling and are unaffected |

On login, the computed after value is grey-500, so no global reset overrides GFormInput's `:where()` border.
