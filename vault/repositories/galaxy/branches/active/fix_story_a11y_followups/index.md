# Accessibility followups from browser stories

- [PR #24285](https://github.com/galaxyproject/galaxy/pull/24285)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/fix_story_a11y_followups)

## Status

`ci_wait`: John approved the branch, and it was opened as a draft at his request on 2026-10-20. Head is `fabcc827831`.

[#24285](https://github.com/galaxyproject/galaxy/pull/24285) is a draft against `release_26.2`, with labels `kind/bug`, `area/accessibility` and `area/UI-UX`. The screenshot is hosted on the fork's `pr-assets-fix_story_a11y_followups` branch.

CI on `fabcc827831` is running.

## Base and scope

John requested `release_26.2` on 2026-10-20: base `1ff2ce4cc513c9923a839fcbaa522e756bd9ab22`. Baseline tests are the leading commit `bb7bfb7703d`. The original-scope alternative is kept as a historical `dev`-based reference.

Names the GalaxyAI send button. Makes the classic Popper's Close a keyboard button, and Close or Escape returns focus to the trigger, for click and hover popovers. Shared tooltip naming stays separate, and story lanes are untouched.

[PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [polish debrief](polish_debrief.md).

[Implementation](implementation_debrief.md), [scope](scope_evaluation.md), [test challenge](test_challenges_debrief.md), [final normal review](subagents/normal_review_final.md), [browser/screenshot verification](screenshot_debrief.md), [original-scope alternative](alts/original_scope.md).
