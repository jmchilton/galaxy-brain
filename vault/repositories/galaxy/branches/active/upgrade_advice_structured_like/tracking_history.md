# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- Branch `upgrade_advice_structured_like` (`051335c00d1`, rebased onto dev 2026-10-05, no conflicts) — Description: Moves `structured_like` qualification upgrade advice from 18.01 to a new 26.0 migration (fixes #23884); blockers: rebase conflict, left alone 2026-10-07 — dev's output-reference linter rework (`e395ae0d83c`..`4634154aa27`) rewrote `OutputsStructuredLikeReference`/`OutputsFormatSourceReference` in `linters/output.py` (plus `galaxy.xsd`); the 18.01 upgrade code is still on dev, so the branch is still needed but must be redone on the new linter; then polish (fork CI on `051335c00d1` green except the fork-only release script and cache-evicted E2E); [debrief](implementation_debrief.md). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:upgrade_advice_structured_like?expand=1).
