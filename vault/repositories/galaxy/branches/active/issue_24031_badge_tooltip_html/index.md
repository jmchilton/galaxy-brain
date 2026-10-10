# issue_24031_badge_tooltip_html

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Polish debrief](polish_debrief.md)

Issue: [24031 — Storage badge tooltips show administrator messages as literal HTML](https://github.com/galaxyproject/galaxy/issues/24031).

- [Initial implementation](initial_implementation_debrief.md)
- [Normal review](subagents/normal_review.md)
- [Test challenges](test_challenges_debrief.md)
- [Code quality review](thermo_nuclear_review.md)
- [Scope evaluation](scope_evaluation.md)
- [Screenshots](screenshot_debrief.md)
- [Implementation handoff](implementation_debrief.md)

Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24031_badge_tooltip_html`.
Branch: `issue_24031_badge_tooltip_html`, based on upstream dev `20f365a2654`.
Status: `branches_need_polish`. Pushed commit: `1a0b0fa24e6`. No PR opened.

Back in polish 2026-10-10: John approved three scope additions after the first polish. (1) Sanitize badge messages with the `links` profile. (2) Make admin links clickable again with a popover, as before 25.0. (3) Add a hover check to `test_objectstore_selection.py`. The description and screenshots predate these and need redoing.
