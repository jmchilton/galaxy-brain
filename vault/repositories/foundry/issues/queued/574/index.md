# #574 `gxwf tool-search` returns zero hits for a literal Tool Shed repo slug

[Issue](https://github.com/galaxyproject/foundry/issues/574), opened by scottcain's AI assistant, currently only `needs-triage`. No comments; no PR or branch addresses it.

## Proposed labels

- `roadmap/off`: a discovery-quality bug. The closest `roadmap/main` is #318 (deterministic draft coordination; discovery outcomes feed it), but the fit is loose.
- `priority/v2`: it didn't block the reporting run. The tool was already pinned, and `owner + word` or display-name queries find it. It misleads a cold slug-first search, but `discover-shed-tool` retries with other queries.
- `agent/implement`: both fixes below are small, and we can make both.
- Blocker: none for now. Add `upstream/tool-shed` only if we choose the Galaxy-side fix and are waiting on merge and deployment (see the question below).

## Derived status

`queued` (rule 4).

## Findings

Verified (2026-11-01):

- Reproduced against the live Tool Shed `/api/tools`: `collapse_collections` → 0 hits, `collapse collections` → 0, `nml collapse` → rank 3/5, `Collapse Collection` → rank 1/6, and `collapse` → rank 39/95. `/api/repositories?q=collapse_collections` → 1 hit, `nml/collapse_collections`.
- gxwf is not at fault. `packages/search/src/client/toolshed.ts` (jmchilton/galaxy-tool-util-ts, cli 1.15.0) passes the query to `/api/tools` unchanged; ranking is entirely server-side.
- Root cause is in the Tool Shed (Galaxy repo): `lib/tool_shed/webapp/search/tool_search.py:37-46` indexes `repo_name` and `id`, but the `MultifieldParser` at :80 searches only `name`, `description`, `help` and `repo_owner_username`. The repo slug, and the tool id (`collapse_dataset` here), are never matched.
- The space-joined form fails for a second reason: the terms are ANDed, and `collections` doesn't match the display name `Collapse Collection` (singular).
- Docs already route package-level lookups elsewhere: `content/cli/gxwf/tool-search.md:75` and `content/molds/discover-shed-tool/index.md:172` both mention `gxwf repo-search`. Neither tells an agent to use it when the query is shaped like a slug.

Not verified: the Tool Shed release that would carry a parser change, or how often slug-first searches occur in real runs.

## Fix options

1. **Tool Shed (Galaxy PR):** add `repo_name` and `id` to the `MultifieldParser` fields, with boosts. This is the root fix, but it reaches agents only when toolshed.g2.bx.psu.edu deploys it.
2. **gxwf (ours):** when a query is shaped like a slug (no spaces, `_`, or matches `owner/repo`) and `tool-search` finds nothing, fall back to `repo-search` and list that repository's tools. Agents get it at the next pin bump.
3. **Mold text (Foundry):** in `discover-shed-tool`, if a slug returns zero tool hits, try `gxwf repo-search` before declaring `miss`. Cheapest, and it helps right away.

Recommendation: 3 now (Foundry PR), and 1 upstream. Skip 2 unless 1 stalls.

## Next

Add the slug → `repo-search` retry to `discover-shed-tool` (plus an eval property), and draft the Galaxy Tool Shed parser change.

## Questions for John

- Should a Galaxy Tool Shed PR count as "work we can do" like Planemo, gxformat2 and gxwf, or is it `upstream/tool-shed`? TRIAGE_ISSUE.md doesn't say.
