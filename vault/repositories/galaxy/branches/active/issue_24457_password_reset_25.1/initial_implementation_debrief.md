# Initial implementation: password-reset session refresh

The fix and both password-change flows pass real Selenium testing on `release_25.1`; implementation is ready for normal review and hardening.

Base: `origin/release_25.1` at `bd2cb474a8d` (25.1.0 released 2025-12-17, making 25.1 the oldest release within the one-year support window). Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24457_password_reset_25.1`.

The first commit, `0e56f4e9a3a` (`Baseline tests for emailed and expired password forms`), pins both existing forms before the behavior change and adds stable navigation targets. Its Selenium tests passed before the fix (2 passed, 70.32s); the later amendment only declares the mock-email fixture's `ClassVar[str]` for independent type checking.

The implementation adapts `galaxy_ui_driver` commit `76c58d2fb7f` to the older client/framework. A successful ChangePassword save now navigates home with a full reload and `withPrefix`, matching normal login behavior. The same component serves expired passwords. Testing revealed its older LoginForm still redirected to `/root/login?expired_user=...`, which discarded the query and returned to ordinary Login; the fix also directs that transition to `/login/start?expired_user=...`.

The browser tests read the mock email and open its real reset link, or expire an account in the integration database and perform the real login/alert flow. Both then save a new password, check the logged-in masthead and API identity, log out, and successfully log in with the new password. Shared navigation helpers cover request, reset-link save, and the common password form. The mock-email reader accepts 25.1's schemeless host/path format. No newer test-framework or API backport was needed; 25.1 uses Selenium and Jest, rather than the newer dual Selenium/Playwright and Vitest stack.

Validation:

- Freshly built baseline client: 2 Selenium baseline cases passed (70.32s).
- Same unfixed built client, with the new save/session regression assertion: reset case failed at the intended masthead assertion (59.51s); server identity was authenticated while the browser still showed Login/Register.
- Rebuilt fixed client: both complete Selenium flows passed (65.83s), including the real expired-password login transition.
- Existing ChangePassword and LoginForm Jest suites: 7 passed, Node `22.13.0` from the release's `.node_version`.
- Both webpack development builds succeeded; the fixed build had 57 existing warnings. No lockfile changes.
- Pinned ruff and commit hooks passed; `git diff --check` passed.
- Mypy with both changed Python entry points reports 54 transitive base/stub errors in 44 files. An isolated release checkout plus the passing baseline scaffolding reports the identical diagnostics (output ordering differs); no branch-specific diagnostics remain. The untouched release's navigation-only check reports 12 existing errors in four files.

Four current screenshots are in `screenshots/`: the reset/expired forms and the logged-in state after each save. Earlier baseline/red-run form images are retained under `earlier_drafts/1/screenshots/`. Integration test servers stop with pytest; no persistent servers were started.

The newer source commit's reload-call unit test was not ported: the real browser tests exercise the resulting UI/session behavior, and the hardening test guidance asks to prefer that layer over a duplicate mocked unit assertion. Existing Jest tests were preserved and pass.

Remaining: normal review, mandatory hardening processes, remote push, queue/handoff, and the issue implementation update are the coordinating agent's next steps. No PR was opened.
