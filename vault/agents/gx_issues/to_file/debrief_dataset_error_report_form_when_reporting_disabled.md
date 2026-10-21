# Debrief: dataset_error_report_form_when_reporting_disabled

## Research

- With no `error_report.yml`, `ErrorPlugin.from_file` falls back to `DEFAULT_CONFIG`, a single `email` plugin with `user_submission: True`. The shipped `error_report.yml.sample` is the same, and nothing copies it into place.
- `EmailErrorReporter._send_report` checks `smtp_server` first ("Mail is not configured for this Galaxy instance"), then `error_email_to` ("Error reporting has been disabled ..."). The FAQ loop saw the second because `faq_server.sh` sets a mock SMTP server. A stock `run.sh` would show the first; that comes from reading the code, not from the UI.
- `DatasetError.vue` always renders `EmailReportForm`. `/api/configuration` does expose `server_mail_configured` (`bool(smtp_server)`), which `ToolForm.vue` already uses to gate its email option. Nothing covers `error_email_to` or whether a plugin can actually submit.
- No duplicate. Related: #10707 and PR #20624 (invocation Debug tab).

## Big finding from the review

The invocation feedback page is worse than "probably fails the same way". `InvocationsService.report_error` throws away what `submit_invocation_report` returns, the endpoint returns 204, and `WorkflowInvocationFeedback.vue` shows a hard-coded success message. The Debug tab claims the report was sent even when nothing was, on any configuration, including real SMTP outages. Verified by reading the code; not run in a UI.

## Rewrite

- Title and opener: "without error emails configured", covering both settings.
- Cause bullets: corrected the order of the checks and the `server_mail_configured` claim. Added the invocation false success as its own paragraph, with a details block.
- Proposed approach: an `enable_user_error_reports`-style flag next to `server_mail_configured` (the email plugin needs both `smtp_server` and `error_email_to`). Hide the form behind it on both pages. Make the invocation endpoint return the plugin's messages. Tests: an E2E with reporting off, plus an extension of `test/integration/test_error_report.py`.
- Alternatives: don't load the default plugin; reuse `server_mail_configured` alone; disable after the first failure.

## Left over

- Neither the stock "Mail is not configured" alert nor the invocation false success has been reproduced in a UI.
- The invocation false success could be its own issue: it happens on every configuration and doesn't fit the "can only fail" framing.
