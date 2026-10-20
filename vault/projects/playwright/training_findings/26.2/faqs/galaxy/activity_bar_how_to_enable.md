# faqs/galaxy/activity_bar_how_to_enable.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `e273c4f3502` (`faq_server.sh main`, stock config).

## GTN

- **The whole FAQ is obsolete.** 26.2 has no **Manage Activity Bar** preference and no **Enable
  Activity Bar** switch; the bar is always on. The SVG shows the old flow.
- **It is embedded in `galaxy-intro-101`** (`{% snippet faqs/galaxy/activity_bar_how_to_enable.md %}`),
  so the flagship intro tutorial sends new users looking for a setting that doesn't exist.
- Suggest retiring it from `galaxy-intro-101` and rewriting it as "Customize the Activity Bar":
  click **More** at the bottom of the bar to open **Additional Activities**; the star on each
  activity shows or hides it in the bar (kept across reloads); **Reset** restores the defaults.

## Galaxy

- No E2E coverage for the More panel's star/unstar (vitest only). Added
  `test_activity_bar.py` and `activity_bar` components (`item(id)`, `more`, `settings.hide(title)`,
  `settings.show(title)`) in `8d36a3bd9f3`.
- `GButton` with `tooltip` renders `data-title`, not `title`; selectors must use `@data-title`.
- `preferences.activity` is the More button (`#activity-settings`) under an old name; existing
  tests use it, so it is left and `activity_bar.more` duplicates it.
- gxui: `gxui components activity` (a selector, not a component) raises a bare `AttributeError`.
