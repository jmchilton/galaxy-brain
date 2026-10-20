# Controlled checkbox client tests

- Branch: `form_checkbox_controlled_tests`
- Base: `dev` at `5ff1e46b8c38c704be8da75b4db05b3d56f93f3d` (explicit user request)
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/form_checkbox_controlled_tests`
- Status: merged as [#24198](https://github.com/galaxyproject/galaxy/pull/24198) ("Fix Client Test CI on dev") 2026-10-17 at `7db3ecd6783`; worktree removed 2026-10-20
- Commit: `7db3ecd6783`
- Remote: [jmchilton/galaxy branch](https://github.com/jmchilton/galaxy/tree/form_checkbox_controlled_tests)

Fix the three inherited upstream CI failures in FormBoolean, FormCheck and FormOptionalText tests after the GCheckbox migration. Tests must feed emitted values back through their controlled value prop before another toggle or checking rendered state. Keep this independent from invocation selection preparation and feature branches.

[Implementation debrief](implementation_debrief.md)

[Initial implementation](initial_implementation_debrief.md) · [Test challenge](test_challenges_debrief.md) · [Normal review](subagents/normal_review.md) · [Scope](scope_evaluation.md) · [Screenshot assessment](screenshot_debrief.md)

## TICK — 2026-10-20

Fork CI on `7db3ecd6783` all green: Client Unit Testing, Client linting, Playwright, Integration Selenium, Tool form harness, Toolshed, first/macOS startup. It had already merged as #24198, so the record was archived instead. The same three controlled-checkbox failures still redden Client Unit Testing on the `issue_24178` stack.
