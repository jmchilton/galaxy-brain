# Rescope debrief

Pass-1 scope evaluation recommended a modest expansion: move the last two hand-rolled `mock_emails_to_path` integration tests onto the new `ConfiguresMockEmails` mixin so it's the one way integration tests configure and read mock email.

- Original scope kept as `user_activation_register_masthead_alt_original_scope` (`f93600ecf44`); see [alts/original_scope.md](alts/original_scope.md).
- Expansion folded into the bottom refactor commit `0331d0f29c1`: `TestToolInstallationRequestFormEmailContentIntegration` and `TestErrorEmailReportIntegration` now call `_configure_mock_emails` / `_read_mock_email`. Side effects: tool-install sender `galaxy-no-reply@` → `galaxy-noreply@example.com`, error-report now sets `email_from`, error-report `email.json` moves to its own temp dir. No test asserts on any of these.
- Head `62e9674de53`. Final tree identical to the pre-rebuild commit.
- Tests: both migrated classes pass (`TestErrorEmailReportIntegration`, `TestToolInstallationRequestFormEmailContentIntegration`). Later commits unchanged.
- [Post-rescope review](subagents/rescope_review_debrief.md): no must/should-fix.

Pass-1 hardening debriefs moved to `earlier_drafts/1/`; re-hardening follows.
