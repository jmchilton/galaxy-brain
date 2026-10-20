# Accessibility followups from browser stories

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:fix_story_a11y_followups?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/fix_story_a11y_followups)

## Status

READY; rebased onto `release_26.2` and pushed to `jmchilton/galaxy` on 2026-10-20.

No PR opened.

74 related tests, full type checking, lint and formatting pass on release; fork CI pending assessment.

## Base and scope

John requested `release_26.2` on 2026-10-20: base `1ff2ce4cc513c9923a839fcbaa522e756bd9ab22`. Head `94a34cd0b2330730145764d74728f07870699e40`; baseline tests remain a separate first commit. The original-scope alternative remains a historical dev-based reference.

Names the GalaxyAI send action and repairs classic Popper keyboard dismissal, including focus return on close and Escape. Shared tooltip name pollution remains separate; story lanes are untouched.

[Implementation](implementation_debrief.md), [scope](scope_evaluation.md), [test challenge](test_challenges_debrief.md), [final normal review](subagents/normal_review_final.md), [browser/screenshot verification](screenshot_debrief.md), [original-scope alternative](alts/original_scope.md).
