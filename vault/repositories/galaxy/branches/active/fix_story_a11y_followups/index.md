# Accessibility followups from browser stories

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:fix_story_a11y_followups?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/fix_story_a11y_followups)

## Status

READY locally; publication awaits explicit approval after automatic review rejected the fork push.

No PR opened.

Local and real Chromium checks pass; fork CI has not run because neither branch was pushed.

## Base and scope

John explicitly requested fresh `dev` on 2026-10-19: base `0de6cc2d7fef75633ea30717162bad53d583d80e`. Head `d843b804a20582bddcf90c2d2277c753a431ad47`; baseline tests are a separate first commit.

Names the GalaxyAI send action and repairs classic Popper keyboard dismissal, including focus return on close and Escape. Shared tooltip name pollution remains separate; story lanes are untouched.

[Implementation](implementation_debrief.md), [scope](scope_evaluation.md), [test challenge](test_challenges_debrief.md), [final normal review](subagents/normal_review_final.md), [browser/screenshot verification](screenshot_debrief.md), [original-scope alternative](alts/original_scope.md).
