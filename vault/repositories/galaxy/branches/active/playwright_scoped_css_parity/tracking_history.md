# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- Branch `playwright_scoped_css_parity` (`095a548a273`, stacked on `playwright_text_table_parity`) — Description: Fixes `test_tags`' tag editor selectors (drops the self-repeating `.stateless-tags` scope, names toggle/input) so it runs under Playwright; blockers: fork CI on `095a548a273` (final selectors not run locally, shared Vite was broken); parent PR opens first; John's read-through incl. the human-read item. [Description](pr_description.md), [titles](pr_titles.md), [polish debrief](polish_debrief.md). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:playwright_scoped_css_parity?expand=1).
- 2026-10-09 — Parent #24009 merged; rebased own 2 commits onto dev (`095a548a273` → `a4bd44ebb2c`), force-pushed to fork. Context line updated (no longer stacked; #24010 sibling). John checked the human-read item. Opened draft [#24020](https://github.com/galaxyproject/galaxy/pull/24020) per John's request; moved to `ci_wait`.
