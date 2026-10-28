# galaxy#24315 — Error report forms are always shown, but can only fail when error emails aren't configured

[Issue](https://github.com/galaxyproject/galaxy/issues/24315) · [proposal](proposal.md) · [debrief](debrief.md) · [source draft](raw.md)

Filed 2026-10-21, unassigned (John asked not to be assigned). Found by the 26.2 Playwright FAQ loop (`faqs/galaxy/analysis_troubleshooting`) on `galaxy_ui_driver`.

With no `error_report.yml`, Galaxy always loads an email plugin that accepts user reports. Without `smtp_server` or `error_email_to` it fails every report. `DatasetError.vue` always shows the form; `/api/configuration` exposes only `server_mail_configured`. The invocation feedback page always shows success, because the API throws away the plugin messages and returns 204.

Open: the stock-server "Mail is not configured" alert and the invocation false success come from reading the code; neither has been seen in a UI. The E2E for the working path is on `galaxy_ui_driver` (`d58f510c7c0`).

Next: reproduce both in a UI, then a branch adding the config flag, gating the forms, and returning the invocation messages.
