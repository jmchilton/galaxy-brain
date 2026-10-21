# Accessibility followups from browser stories

- [PR #24285](https://github.com/galaxyproject/galaxy/pull/24285)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/fix_story_a11y_followups)

## Status

`attention`: mvdbeek approved `fabcc827831` on 2026-10-21; the inline edge case and two nits are fixed in `bec70dfdd80`, and replies await John ([review response](review_response_mvdbeek.md)).

[#24285](https://github.com/galaxyproject/galaxy/pull/24285) is open, not draft, against `release_26.2`, with labels `kind/bug`, `area/accessibility` and `area/UI-UX`. The screenshot is hosted on the fork's `pr-assets-fix_story_a11y_followups` branch. Live PR body predates the `pr_description.md` review update.

CI on `fabcc827831` was green; CI on `bec70dfdd80` is running.

## Base and scope

John requested `release_26.2` on 2026-10-20: base `1ff2ce4cc513c9923a839fcbaa522e756bd9ab22`. Baseline tests are the leading commit `bb7bfb7703d`. The original-scope alternative is kept as a historical `dev`-based reference.

Names the GalaxyAI send button. Makes the classic Popper's Close a keyboard button, and Close or Escape returns focus to the trigger, for click and hover popovers. Shared tooltip naming stays separate, and story lanes are untouched.

[PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [polish debrief](polish_debrief.md).

[Implementation](implementation_debrief.md), [scope](scope_evaluation.md), [test challenge](test_challenges_debrief.md), [final normal review](subagents/normal_review_final.md), [browser/screenshot verification](screenshot_debrief.md), [original-scope alternative](alts/original_scope.md).
