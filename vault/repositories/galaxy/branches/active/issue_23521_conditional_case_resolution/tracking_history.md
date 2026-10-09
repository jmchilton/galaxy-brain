# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- Branch `issue_23521_conditional_case_resolution` (`afdda3538c5`) — Description: Refuses conditional cases that resolve to nothing instead of silently running the last `<when>`, with messages that name the value; blockers: fork CI on `afdda3538c5` red only on the BCO-export tests and openapi mypy already red on `release_26.0`; then John's review, the human-read checklist item and four scope questions in the debrief; targets `release_26.0`. [Description](pr_description.md), [polish debrief](polish_debrief.md), [investigation](23521_current_case_theory.md). [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:issue_23521_conditional_case_resolution?expand=1).
