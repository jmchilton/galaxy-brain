# Dataset error page shows the Issue Report form when error reporting is off; Report can only fail

On a Galaxy without `error_email_to` (the default, which includes a fresh `run.sh` dev server), a red dataset's error page (`/datasets/{id}/error`) still shows the **Issue Report** form, with a message box and a **Report** button. Submitting it always fails with a red alert:

> An error occurred sending the report by email: Error reporting has been disabled for this Galaxy instance

The user only finds out after writing the report. GTN's "Troubleshooting errors" FAQ (linked from this same page as "My job ended with an error. What can I do?") tells users to click the bug icon and **Report**, so they do. The workflow invocation feedback page (`WorkflowInvocationFeedback.vue`) uses the same `EmailReportForm`, so it likely does the same; not checked.

Found by the playwright FAQ loop (GTN `faqs/galaxy/analysis_troubleshooting.md`), on `release_26.2` (`galaxy_ui_driver` `6379b83d12a`). Repro: stock config, any failing job (e.g. Filter1 with `c9>1` on a 2-column table), bug icon, type a message, **Report**.

## Cause

- `lib/galaxy/tools/error_reports/__init__.py`: with no `error_report.yml`, `DEFAULT_CONFIG` loads a single `email` plugin with `user_submission: True`. So there's always a user-submission plugin, configured or not.
- `lib/galaxy/tools/errors.py` `EmailErrorReporter._send_report`: `assert to, ValueError("Error reporting has been disabled for this Galaxy instance")` when `error_email_to` is unset. `plugins/email.py` `submit_report` catches it and returns `("An error occurred sending the report by email: ...", "danger")`.
- `client/src/components/DatasetInformation/DatasetError.vue` always renders `<EmailReportForm :submit="submit" />`. `client/src/components/Common/EmailReportForm.vue` has no notion of "reporting unavailable"; it only gates on login (`requireLogin`).
- The `/api/configuration` payload doesn't expose `error_email_to` or whether any user-submission error plugin can actually send (nothing about error reports in `lib/galaxy/managers/configuration.py`).

## Likely fix

- Server: expose a boolean in the config API, e.g. `enable_user_error_reports`. It should be true when at least one `user_submission` plugin is usable: the email plugin only if `error_email_to` and `smtp_server` are set; other plugins (github, biostars, ...) when configured. A small `is_configured()`/`can_submit` per plugin would keep that logic in the plugins.
- Client: `DatasetError.vue` (and invocation feedback) hides `EmailReportForm` when it's false, or replaces it with a short note: "This Galaxy isn't set up to receive error reports; ask its administrators" (maybe linking `support_url` / `helpsite_url`).
- Alternatively make the email plugin not load by default without `error_email_to` (the `NullErrorPlugin` message "Error reporting is not configured for this Galaxy instance" already exists). That still lets the user type a report for nothing, though, so the client gate is the real fix.

## Tests

- New E2E on `galaxy_ui_driver` (`d58f510c7c0`, `test/integration_selenium/test_dataset_error_report.py`) covers the configured path: bug icon -> error page -> Report -> "Your error report has been sent" -> mock SMTP mail has the message. It adds `dataset_error` / `email_report` navigation components (with an `email-report-result` class on the result alert). A second test with `error_email_to` unset could assert `email_report._` is absent (red today).
- API: `lib/galaxy_test/api/test_jobs.py` `test_report_error` only asserts a 200, whatever the messages say (`driver_util.py` sets no `error_email_to`, so it probably passes on the "danger" message today).
