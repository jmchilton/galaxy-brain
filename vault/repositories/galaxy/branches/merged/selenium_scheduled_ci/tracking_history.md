# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- Branch `selenium_scheduled_ci` (`e43796a64cf` on the fork, pushed by another session — tip "Close every open Selenium tracking issue when the run passes"; was stacked on `remove_selenium_ci`) — Description: Brings back `selenium.yaml` as weekly cron + `workflow_dispatch`; failed runs on dev open/comment on an `area/testing/selenium` issue, next green dev run closes it (mvdbeek's suggestion on #23976); blockers: parent #23976 merged 2026-10-08, so rebase onto dev; fork CI on `e43796a64cf` queued; can't run until on default branch (dispatch on dev to smoke-test after merge); decisions for John: cadence, assignee. [Implementation debrief](implementation_debrief.md). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:selenium_scheduled_ci?expand=1).
