# galaxy_ui_driver_followups implementation debrief

2026-10-07. Published tip `b71d51ffc34`, based on the testing session's
`galaxy_ui_driver` snapshot `f561c00528d`. Worktree:
`~/projects/worktrees/galaxy/branch/galaxy_ui_driver_followups`.

Moves reusable upload helpers, the workflow output UI wait, and gxui into
`galaxy.selenium` / `galaxy-selenium`, with compatibility imports and launchers.
Keeps test-populator fixture staging in the test framework. Separately splits a
pre-existing mixed core/test-framework context test so the standalone core suite
collects without `galaxy_test`.

Adds gxui named profiles, uniform CLI/environment defaults, offline configuration
commands, masked login prompts, optional keyring reads, saved authentication, and
headed browser login. Credentials and state bind to the full Galaxy base URL.
Configuration and saved-state writes are atomic and owner-only. Legacy config
files remain readable. Details and examples are in the package README.

**Integration branch — do not PR or polish independently.** The testing session
should keep helper/context-test commits below its final gxui commit and fold the
package relocation plus configuration/login implementation into that tip.
Claude's worktree has advanced since the fork; reconcile newer edits in its old
gxui namespace when integrating. Its worktree and running sessions were not
edited. No CI or live Galaxy-wide E2E verdict is claimed for this branch.

Validation: **93 checkout tests pass**, **90 installed-wheel tests pass** without
`galaxy_test`, six gxui modules pass mypy, and all repository commit hooks pass.
Browser fixture checks cover password login, state reuse across daemon restarts,
URL/profile binding, and actual headed-browser interactive login. OS keyrings were
mocked and institutional SSO was not exercised.

[Package move handoff: commits, dependency decisions and integration notes](../../../../../projects/playwright/GXUI_PACKAGE_MOVE_HANDOFF.md).

[Configuration/login handoff: behavior, examples, verification and integration](../../../../../projects/playwright/GXUI_CONFIG_LOGIN_HANDOFF.md).
