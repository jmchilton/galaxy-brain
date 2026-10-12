# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- Branch `script_setup_polling_unmount` (approved SHA `26da6bc30bd`, John 2026-10-07; title: "Stop Tool Shed install and download polling for good on unmount") — Description: Install Monitor and StsDownloadButton stop polling for good on unmount, even with a request in flight; blockers: fork CI on `26da6bc30bd` green except E2E/startup, all "Restore client cache" (fork cache eviction) — waits, since `genericTaskMonitor` backs export downloads that Selenium exercises; open when greenish; use `pr_description.md` verbatim, no agent marker; [description](pr_description.md), [titles](pr_titles.md), [polish debrief](polish_debrief.md). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:script_setup_polling_unmount?expand=1).

- 2026-10-11 TICK — prior green relevant CI plus diagnosed unrelated reds allowed opening. Clean rebase carries approval to `2aea857fc59061ee15d8881fb8fb1effcc149cef`; 19 lifecycle tests pass. Opened regular #24054 with the chosen title and saved description verbatim; fresh CI pending.
