Run via Claude Opus 5.5 at low effort.

# frame_index_range polish debrief

Polished at `3530ea0` on `origin/main` `d00e1f7`.

- Wrote `pr_description.md` (opener "Follow-up to 🔀 #293", no issue exists), `pr_titles.md`, `pr_tags.md`. TS PR left as `#TS_PR` placeholder. No Claude Code trailer, matching the predecessor.
- Strengthening: no subagent available; did one fresh critical read myself. Resolution order matches conversion, every case red-to-green, fixtures declarative. Nothing to add. No code changes.
- Likely misreadings answered in the description: "does this break digit labels?" (bold sentence, labels win); "is this the nested-pointer/best-practice work?" ("Not in this PR" list).
- Fork CI on `3530ea0`: all green except Python CI 3.13, which fails collecting `iwc/scripts/tests` (no planemo) and missing packaged `schema_rules.yml`. Same red on upstream `main` after #293; fixed by `ci_restrict_pytest_testpaths`. Unrelated.
