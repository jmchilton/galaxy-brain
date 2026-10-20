# Accessibility followups from browser stories

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:fix_story_a11y_followups?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/fix_story_a11y_followups)

## Status

`branches_ready_for_final_review`: polished on 2026-10-20 and waiting on John's read-through. Head is `fabcc827831`.

No PR opened.

Fork CI on `fabcc827831` has not been assessed. On `94a34cd0b23`, nothing had failed while most checks were still queued.

## Base and scope

John requested `release_26.2` on 2026-10-20: base `1ff2ce4cc513c9923a839fcbaa522e756bd9ab22`. Baseline tests are the leading commit `bb7bfb7703d`. The original-scope alternative is kept as a historical `dev`-based reference.

Names the GalaxyAI send button. Makes the classic Popper's Close a keyboard button, and Close or Escape returns focus to the trigger, for click and hover popovers. Shared tooltip naming stays separate, and story lanes are untouched.

[PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [polish debrief](polish_debrief.md).

[Implementation](implementation_debrief.md), [scope](scope_evaluation.md), [test challenge](test_challenges_debrief.md), [final normal review](subagents/normal_review_final.md), [browser/screenshot verification](screenshot_debrief.md), [original-scope alternative](alts/original_scope.md).
