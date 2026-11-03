# Test challenges review — PR #24650

Profile: gx_test_challenger. Model: claude-opus-5-5. Effort: low. Reviewed commit: `6655fd8ef10`.

Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

Overall: tests are well targeted. The regression test uses real collaborators and asserts the visible outcome; no layer change or E2E needed.

### P3 1: Use a real install-DB row instead of a MagicMock in the precedence test

`test_materializing_shed_tool_keeps_install_database_repository` builds the "installed" repository as a `MagicMock` and appends it into `ToolShedRepositoryCache.repos_by_tuple`, a private structure. `_materializing_box()` already creates a real in-memory install database; add a `ToolShedRepository` row (tool_shed/owner/name/installed_changeset_revision) to `app.install_model.context`, commit, and rebuild the cache, then assert `tool.tool_shed_repository` is that row and `local_repositories == []`. Removes the mock and the coupling to cache internals.
