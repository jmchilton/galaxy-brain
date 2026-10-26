# #24476 — ParsedTool output models drop `<filter>`

- Issue: https://github.com/galaxyproject/galaxy/issues/24476 (filed 2026-10-26, assigned jmchilton)
- [issue_draft.md](issue_draft.md) — original to_file draft
- [proposal.md](proposal.md) — posted text
- [debrief.md](debrief.md) — verification and rewrite notes

## Next

- Red unit test in `test/unit/tool_util/`: `to_model().filters` for `output_filter.xml` (data + collection).
- Add parsed-side-only `filters` field; keep it out of user-defined tool models.
- After release + Tool Shed deploy: resync galaxy-tool-util-ts `ParsedTool` schema, surface in `galaxy-tool-cache summarize`.
