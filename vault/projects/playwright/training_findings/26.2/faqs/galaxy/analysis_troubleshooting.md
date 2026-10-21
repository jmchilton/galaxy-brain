# faqs/galaxy/analysis_troubleshooting.md — 26.2, UI run

GTN `e2d1765205`, Galaxy `galaxy_ui_driver` `6379b83d12a` (`faq_server.sh main`, plus
`error_email_to`). Red dataset: **Filter** (`Filter1`) with `c9>1` on a 2-column table.
Used by data-manipulation-olympics, galaxy-reproduce and 7 single-cell tutorials (`sc` variant), and
linked from Galaxy's own error page ("My job ended with an error. What can I do?").

## GTN

- Steps 1, 2 and 4 hold: the expanded item shows the error text, the bug icon (tooltip "Error")
  opens **Dataset Error Report** with stderr, and **Report** sends it.
- **Step 3: "Job Information" is now "Job Execution Details".** The two log labels are unchanged.
  The details icon's tooltip is "Dataset Details".
- Step 4 could say the report goes to the server's admins, and only if the server set up error
  reports.
- Step 5: "GTN Matrix Channel" and "Galaxy Matrix Channel" link `gitter.im` (it redirects).

## Galaxy

- No E2E reached the error page from the history item, or submitted a report: API
  `test_report_error` only checks the backend, and `test_galaxy_wizard.py` goes in through the
  dataset view's Error tab and skips without agents. Added `test_dataset_error_report.py`
  (integration, mock SMTP + `error_email_to`): bug icon, tool id, stderr, Report, and the mail
  (`d58f510c7c0`). Components: `history_panel.content_item.error_button`, `dataset_error`,
  `email_report` (shared with invocation feedback; new `email-report-result` class on its result
  alert). Helpers `history_panel_item_show_error`, `submit_email_report`; `navigate_to_dataset_error`
  uses the `dataset_error.tab` component. Green under Playwright.
- **Without `error_email_to` the Report form still shows**, and submitting fails with "Error
  reporting has been disabled for this Galaxy instance". Filed [galaxy#24315](https://github.com/galaxyproject/galaxy/issues/24315).
- Filter1 reports a missing column as a Python traceback (`IndexError`), not a message. Filed [galaxy#24316](https://github.com/galaxyproject/galaxy/issues/24316).
- navigation.yml selectors go through `string.Template`, so `$=` breaks them ("Invalid placeholder");
  use `*=` or `$$`.
- gxui (tip): `dataset-peek` waited for `ok` and timed out on a red item; it now prints the error
  text. New `dataset-error HID [--report MESSAGE]`.
- `faq_server.sh` now sets `error_email_to`, so reports land in `$FAQ_MAIL`.
