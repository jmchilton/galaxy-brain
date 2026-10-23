# faqs/galaxy/datasets_job_status.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `ff3da7861e7` (`faq_server.sh main`). One history shows
every state: an upload (green), a 404 link (red), a 30s `cat_data_and_sleep` job (yellow) with a
`cat1` job waiting on it (grey). Deleting the waiting job's other input pauses it (light blue), and
**Resume Paused Jobs** turns it green. No tutorial embeds it.

## GTN

- No findings. The colours match 26.2:
  - new and queued are grey (`[data-state]` paints them `$state-default-bg`) with a clock icon;
  - running is yellow/peach with a spinner;
  - ok is green, error red with a warning triangle;
  - paused is light blue with a pause icon.

  `states.ts` maps queued to `alert-warning` (yellow), but the `[data-state]` rule wins; checked on
  screen. 26.1 had no `paused` entry in that map, but `alert-info` gave the same light blue.
- Light blue's advice could add the fix: correct the input, then History options > **Resume Paused
  Jobs**. The item's own text already says so, so I didn't file it.

## Galaxy

- Gap: nothing in the E2E tests paused a job or used Resume Paused Jobs, and the menu item had no test hook.
  Added `test_resume_paused_job` (`ff3da7861e7`) with `data-description="resume paused jobs"` and
  `click_history_option_resume_paused_jobs`. It pauses `cat1` by deleting an input while it waits on
  `cat_data_and_sleep`, as `api/test_jobs.py::test_resume_job` does, then undeletes from the panel
  and resumes from the menu. Green under Playwright and Selenium.
- The FAQ server has no sleep tool, and a Filter upstream finishes before `dataset-delete` lands, so
  the replay raced; `faq_server.sh` now loads Galaxy's `cat_data_and_sleep` (FAQ Replay section).
  The replay passed twice from fresh users.
- gxui: `history-resume-paused` (tip `5d410abf9b8`).
