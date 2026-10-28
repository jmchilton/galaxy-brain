# galaxy#24377 — History item button checks in `test_history_dataset_state.py` are a stub

[Issue](https://github.com/galaxyproject/galaxy/issues/24377) · label `release-testing-26.2` · [proposal](proposal.md) · [debrief](debrief.md) · [source](raw.md)

Closed on GitHub as completed 2026-10-24 (sync 2026-10-26).

Filed 2026-10-22 from 26.2 release testing. `_assert_buttons` has returned without checking anything since 399c6e91948 (2022-09). Restoring it fails on 4 of 5 buttons: `info_button` is `.params-btn` (now `.info-btn`), `edit_button` is gone, and three tooltips are stale.

Next: fix the selectors and `BUTTON_TOOLTIPS`, restore the loop (`assert_tooltip_text_contains` for download), then run under Selenium and Playwright.
