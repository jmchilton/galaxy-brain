# faqs/galaxy/analysis_jobs_not_running.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `ef6f75182e7` (`faq_server.sh accounts`,
activation on). Replay: `analysis_jobs_not_running.gxui.sh`.

- **Step 1: "a section labeled User ... If you see Login/Register".** 26.2's masthead has no
  "User" section. Logged out, it shows separate **Login** and **Register** buttons; logged in, a
  menu named after your username. Also: on servers that allow it (the local FAQ server
  does), anonymous users can upload and run jobs, so being logged out doesn't stop jobs everywhere.
- **Step 2: activation.** Correct, but the symptom changed. An inactive user sees a banner ("Your
  account has not been activated yet ... you won't be able to upload data or run jobs"), and an
  upload fails at once with "Action requires account activation." Nothing waits in a queue.
  Suggest: "if you see a yellow banner saying your account isn't activated, open the link in
  the activation email (check spam) or click **Resend Verification**".
- Steps 3-4 fine; the support link resolves.

Galaxy findings from this run:
- Coverage: the activation E2E never tried an upload. Added `test_inactive_user_cannot_upload` and
  `upload_activity.progress_row_error(row)` (`a67081d346c`).
- gxui: `upload-paste` waited 60s, then reported "hids did not appear", because the server's
  message replaced the "Upload request failed" text gxui looked for. It now fails at once with
  the row's error, checking only this upload's rows (earlier rows stay listed).
