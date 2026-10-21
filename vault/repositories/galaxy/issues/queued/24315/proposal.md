**Title:** Error report forms are always shown, but can only fail when error emails aren't configured

On a Galaxy without error emails configured, the dataset error page still asks users to write an error report and rejects it only after they press **Report**.

1. Run any job that fails, for example Filter with `c9>1` on a 2-column table.
2. Click the bug icon on the red dataset. The error page shows the **Issue Report** form with a message box and a **Report** button.
3. Write a message and click **Report**. A red alert appears:

> An error occurred sending the report by email: Error reporting has been disabled for this Galaxy instance

That is with `smtp_server` set and `error_email_to` unset. With neither set (the default), the code path gives "...: Mail is not configured for this Galaxy instance" instead.

Users only learn that reporting is off after they've written the report. The page links GTN's "My job ended with an error. What can I do?" FAQ, which tells them to do exactly this: click the bug icon and **Report**. This happens on every fresh `run.sh` server and on any instance whose admins haven't set up error emails.

The workflow invocation **Debug** tab uses the same form, and following the code it is worse: it shows "Your email has been sent successfully. Thank you for your report." whether or not anything was sent. The server drops the plugin's messages and returns 204, so this also hides real failures, such as an SMTP outage, on servers that are configured.

<details><summary>Why the form is always shown</summary>

- `lib/galaxy/tools/error_reports/__init__.py`: when `error_report.yml` doesn't exist, `ErrorPlugin.from_file` falls back to `DEFAULT_CONFIG`, a single `email` plugin with `user_submission: True`. So there is always a plugin that accepts user reports, whether or not it can send them. (The shipped `error_report.yml.sample` holds the same single plugin, so copying it changes nothing.)
- `lib/galaxy/tools/errors.py` `EmailErrorReporter._send_report` asserts `smtp_server` ("Mail is not configured ...") and then `error_email_to` ("Error reporting has been disabled ..."). `plugins/email.py` `submit_report` catches the exception and returns it as a `danger` message in the `/api/jobs/{job_id}/error` response.
- `client/src/components/DatasetInformation/DatasetError.vue` always renders `EmailReportForm`. `EmailReportForm.vue` can only gate on login (`requireLogin`).
- `/api/configuration` has `server_mail_configured` (`bool(smtp_server)`) but nothing about `error_email_to` or whether any user-submission error plugin can submit.

</details>

<details><summary>Why the invocation page reports success</summary>

- `WorkflowInvocationFeedback.vue` renders the same `EmailReportForm` and posts to `/api/invocations/{invocation_id}/error`.
- `services/invocations.py` `report_error` calls `submit_invocation_report`, which goes through `WorkflowEmailErrorReporter` with the same two asserts, but it discards the returned messages. The endpoint answers 204 No Content.
- Without an HTTP error, the client shows its hard-coded success message.

</details>

## Context

Found while adding an E2E test for the working error-report path (bug icon → Report → "Your error report has been sent", with mock SMTP) on 🌿 [`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver). The API test `test_jobs.py::test_report_error` asserts only a 200 status, so it passes when the report fails. There is no API test for `/api/invocations/{invocation_id}/error`.

## Proposed Approach

Add a boolean such as `enable_user_error_reports` to the configuration API. It is true when at least one `user_submission` plugin can actually submit; for the email plugin that means `smtp_server` and `error_email_to` are both set. When it's false, `DatasetError.vue` and `WorkflowInvocationFeedback.vue` hide `EmailReportForm` and show a short note asking the user to contact the instance's administrators (linking `support_url` if it's set). Separately, the invocation endpoint should return the plugin messages like the job endpoint does, so a failure is shown as a failure. Test with an E2E test that runs with reporting off and asserts the form is absent. Extend `test/integration/test_error_report.py`, which already configures mock SMTP, to check the flag both ways and to cover the invocation endpoint's messages.

<details><summary>Details</summary>

- Give each plugin a small `can_submit`/`is_configured` check so this logic stays in the plugins, rather than the config manager having to know about `error_email_to` and every other plugin's settings (GitHub, GitLab, Biostars, ...). The email plugin's check builds on the same `smtp_server` test as `server_mail_configured`.
- `ErrorPlugin` combines those checks across its `user_submission` plugins (`NullErrorPlugin` is always false), and `managers/configuration.py` exposes the result next to `server_mail_configured`. `ToolForm.vue` already gates its email option on `server_mail_configured`, so the client pattern exists.
- `report_error` in `services/invocations.py` returns the messages, and the endpoint returns them in a body like `JobErrorSummary`.

</details>

## Alternative Approaches

The smallest change on the server would be to stop loading the default email plugin when mail or `error_email_to` is unset, so that `NullErrorPlugin` answers "Error reporting is not configured for this Galaxy instance". That clearer message still arrives only after the user has written the report. Gating the form on the client is what fixes the experience, and it needs the server to say whether reporting works.

<details><summary>Alternatives In Detail</summary>

### Alternative: Don't load the default email plugin without mail settings

<details><summary>Description</summary>

#### Details

In `ErrorPlugin.from_file`, return `NULL_ERROR_PLUGIN` instead of using `DEFAULT_CONFIG` when `smtp_server` or `error_email_to` is unset.

#### Why the proposed approach is preferred

The message improves, but the user still writes a report for nothing, and the invocation page still claims success. It is a reasonable server-side cleanup alongside the flag, not instead of it.

</details>

### Alternative: Reuse `server_mail_configured`

<details><summary>Description</summary>

#### Details

Gate the form on the existing flag instead of adding one.

#### Why the proposed approach is preferred

It covers only `smtp_server`. A server with SMTP but no `error_email_to` still shows a form that fails, and reports sent through non-email plugins (GitHub, GitLab, ...) would be hidden on servers without SMTP.

</details>

### Alternative: Disable the Report button after the first failure

<details><summary>Description</summary>

#### Details

The client remembers a failed submission and shows the note the next time.

#### Why the proposed approach is preferred

Every user still hits the failure once, and a failure caused by an SMTP outage looks the same as reporting being switched off.

</details>

</details>
