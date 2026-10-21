# Accessibility followups

Status: READY; published to `jmchilton/galaxy` on 2026-10-20 after explicit user approval. Fresh dev base explicitly requested by John: `0de6cc2d7fef75633ea30717162bad53d583d80e`. Implementation head `d843b804a20582bddcf90c2d2277c753a431ad47`; worktree `/Users/jxc755/projects/worktrees/galaxy/branch/fix_story_a11y_followups`.

The GalaxyAI icon-only send action now has the stable accessible name “Send message” in ready, empty, busy and disabled states. The optional classic Popper header close control is a named native non-submit button, with a visible keyboard outline and reset styles preserving its icon appearance under Bootstrap. Close activation and Escape within the popup restore focus to its invoking control only when focus belonged to the popup. Wrapped triggers and external `referenceEl` controls are covered, as is preserving focus elsewhere.

## Validation and review

- Separate baseline commit `a2166f2c585` passed 36 tests before implementation.
- The five original accessibility regressions failed on unchanged components at their name assertions; then passed with the fixes.
- Final related unit check: 5 files / 74 tests pass, including chat, Popper, its controller, Markdown CellAdd and GButton. Log: `/private/tmp/a11y-followups-escape-unit.log`.
- Fresh independent test challenge: 2 files / 43 tests pass. Logs and details in [test challenge](test_challenges_debrief.md).
- Full client type check passes (`/private/tmp/a11y-followups-types-escape.log`). ESLint has zero errors and two existing warnings; Prettier passes (`/private/tmp/a11y-followups-eslint-final.log`, `/private/tmp/a11y-followups-format-final.log`). Diff whitespace and commit hooks pass.
- Fresh independent normal review, code-quality review and baseline evaluation approved. Final scope review accepts the Escape refinement and recommends no further scope change. The pre-Escape alternative is preserved; [scope history](implementation_rescope_debrief.md).
- Real Chromium checks pass with production CSS: Enter/Space close, Escape from nested content, focus return, no containing-form submissions, preserved active styles, named chat controls in four states, and exactly one keyboard submission. Four screenshots inspected; [browser debrief](screenshot_debrief.md).

## Limits and handoff

No server behavior changes; no server-backed E2E tests added. Production consumers currently omit the built-in Popper title, so its close API is exercised with component/browser fixtures. This branch does not implement broader hover/focus opening policy or shared GButton/GLink tooltip DOM changes. No assertions were weakened, no story branch rewritten, and no PR opened. Fork CI has not been assessed yet.

## Publication

John explicitly approved publishing all work on 2026-10-20. Both branches were pushed normally to `jmchilton/galaxy` and their exact remote heads verified:

- `fix_story_a11y_followups`: `d843b804a20582bddcf90c2d2277c753a431ad47`.
- `fix_story_a11y_followups_alt_original_scope`: `d318dfd5ee3655f7d292896b6ec50dd077d9ff6c`.

Both local branches now track their fork counterparts; the Galaxy worktree is clean. The prior automatic approval rejection was resolved by explicit user authorization. No PR was opened; fork CI has not yet been assessed.

Vault validation passes with zero errors. Tracking updates are published to galaxy-brain under the user's instruction to make sure everything is pushed; unrelated working changes are preserved.
