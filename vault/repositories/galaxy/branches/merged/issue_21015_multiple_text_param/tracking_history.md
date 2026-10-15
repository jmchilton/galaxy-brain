# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- [#23992](https://github.com/galaxyproject/galaxy/pull/23992) — branch `issue_21015_multiple_text_param` — Description: Multiple text workflow parameters work end to end like multiple integers (fixes #21015); list values, per-entry validation, `FormValueList` rows; blockers: opened as draft by John's request 2026-10-08 at `c8f9c40bae0`; PR CI on `c8f9c40bae0` (no E2E had run in fork CI — cache eviction; passed locally under Playwright), then undraft; screenshots hosted on fork branch `pr-assets-issue_21015_multiple_text_param`. [Description](pr_description.md), [titles](pr_titles.md), [polish debrief](polish_debrief.md), [screenshots](screenshot_debrief.md).

## Approved review split — 2026-10-12

John approved moving text fixes into PR #23992 and retaining float support on a stacked branch. Original head advanced normally from `c8f9c40bae0` to `299a5936747`; float follow-up rebased to `67c40364984` on that head, using an exact lease and retaining the old combined commit locally. PR description updated and verified as explicitly requested. Local text checks pass (191 backend/doctests,1 skip;4 API;22 client;hooks); new original-head CI is queued/running and GitHub reports mergeable. Current implementation, review and screenshot evidence are linked from [index.md](index.md).
