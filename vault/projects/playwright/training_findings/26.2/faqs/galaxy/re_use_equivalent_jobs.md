# faqs/galaxy/re_use_equivalent_jobs.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `7ecf397f044`, `faq_server.sh main`. Replay: `re_use_equivalent_jobs.gxui.sh` (passes fresh).

- `job-cache-preference-removed`: Manage Information has no re-use switch (removed by `907d405a9ba`, in 25.0+). The tool form always shows **Attempt to re-use jobs with identical parameters?** under **Additional Options**; button is **Run Tool**. Also typo "user-references".
- Coverage: none for the switch. Added `test_run_reuses_equivalent_job` (`fff4be834ab`): second cat1 run with the switch on has `copied_from_job_id` = first job; red without the switch, green on Playwright and Selenium. gxui: `tool-run --reuse`.
