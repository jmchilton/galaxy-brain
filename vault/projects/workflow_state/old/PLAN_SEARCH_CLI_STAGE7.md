# Stage 7 — tool → changeset_revision resolution: current workarounds + proposed Tool Shed extensions

**Status (2026-04-25):** Shipped via the workaround below. Tool Shed
enhancements (P0–P6) tabled for now — revisit if the metadata payload becomes
a latency problem.

- Client: `packages/search/src/client/revisions.ts` — `getToolRevisions(toolshedUrl, { owner, repo, toolId, version? })`
- CLI: `gxwf tool-revisions <tool-id> [--tool-version <v>] [--latest] [--json]` (flag is `--tool-version` because commander's program-level `--version` intercepts)
- Fixtures: `packages/search/test/fixtures/toolshed-revisions/` regenerable via `scripts/regen-toolshed-fixtures.mjs` (also covers existing search/TRS fixtures)
- JSON envelope: `{ trsToolId, version?, revisions: [{ changesetRevision, toolVersion }] }`; exit codes `0`/`2`/`3`

Context: `PLAN_SEARCH_CLI.md` Stage 7 needs, given `(owner, repo, tool_id[, version])`, the list of changeset_revisions that contain that tool. The goal is emitting a workflow that pins `(name, owner, changeset_revision)` for reproducible reinstall.

## What's possible with the current API

Stage 7 is buildable **without** any Tool Shed change. Two calls per repo:

### Algorithm

```
1. repoId ← GET /api/repositories?owner=<O>&name=<R>
             → list[Repository]; take repos[0].id
   (this is the SQL-filter form, not the `q=` search form)

2. byRev  ← GET /api/repositories/{repoId}/metadata?downloadable_only=true
             → { "<revNum>:<hash>": { tools: [{id, version, ...}], ... }, ... }

3. matches = [
     changesetHash
     for "<revNum>:<changesetHash>", meta in byRev.items()
     if any(t.id == <tool_id> and (version is None or t.version == <version>)
            for t in meta.tools or [])
   ]

4. (optional ordering)
   ordered ← GET /api/repositories/get_ordered_installable_revisions?owner=<O>&name=<R>
   matches.sort(key=ordered.index)   # filter/order into the canonical list
```

Output: the ordered list of changeset hashes that contain the tool (at the specific version if asked).

### Why this beats the TRS route for Stage 7's question

The TRS `/api/ga4gh/trs/v2/tools/{owner~repo~tool_id}/versions` endpoint collapses versions by string — if `1.0.0` exists in 3 changesets, you see it once and the dict-overwrite loop silently keeps the last-iterated revision (`managers/trs.py:87-97` in the Tool Shed). For the Stage 7 question ("which changesets publish tool X at version Y?") TRS actively hides information. `/api/repositories/{id}/metadata?downloadable_only=true` walks every installable revision individually, so every changeset that contains the tool is visible.

### Caveats / sharp edges

- **Repo-id lookup is a plain SQL listing**, not `q=` search. `/api/repositories?owner=X&name=Y` returns repos matching both filters via SQL `ILIKE` — when a repo exists it'll be first (and usually only) result. `q` and the name/owner filters are mutually exclusive (`api2/repositories.py:150-153`), so don't try to pass both.
- **Encoded repo id**, not numeric. `repos[0].id` is already the encoded form the metadata endpoint wants.
- **`metadata` endpoint dict key is `"<revNum>:<hash>"`**; split on `:` to get the changeset hash.
- **Same tool XML id in multiple repos**. Search hits don't disambiguate when `tool_id` exists under multiple `(owner, repo)`. Stage 7 operates per-repo and inherits whichever `(owner, repo)` the caller already picked in Stage 1.
- **Version strings aren't monotonically increasing**. Two changesets can legally publish the same `version=` string with different content. For reproducible pins, prefer the newest changeset in `get_ordered_installable_revisions` order when disambiguating.
- **Metadata blob size**. A repo with hundreds of revisions returns a non-trivial payload. Cache per-repo at least for the duration of a skill session.

### Proposed CLI shape (fits existing Stage 7 in PLAN_SEARCH_CLI.md)

```
gxwf tool-revisions <trs-id|owner/repo/tool_id>
  --version <v>        # filter to revisions containing this tool version
  --latest             # return only the newest matching revision (per get_ordered_installable_revisions)
  --json               # { trsToolId, version?, revisions: [hash, ...] }
```

Exit codes mirror `tool-search` / `tool-versions`: `0` hits, `2` empty (tool not found in any revision / repo missing), `3` fetch error.

Implementation lives in `packages/search/` (one new function `getToolRevisions`) + `packages/cli/src/commands/tool-revisions.ts`. No Tool Shed change required.

## What a Tool Shed extension would improve

Ranked by impact on the `find-shed-tool` skill loop:

### P0 — `version` + `changeset_revision` in tool-search hits

This is the big one, already tracked as `TS_SEARCH_OVERHAUL_ISSUE.md` in the plan. If `/api/tools?q=` hits carried `version` and `changeset_revision` (or `changeset_revisions: [...]`) directly, the **entire** Stage 2/3/7 follow-up dance collapses for the common case. The skill would go: search → pick → done. Today every hit requires 2–3 follow-up HTTP calls per candidate just to pin what the index already knows.

### P1 — direct tool→revisions endpoint

Something like:

```
GET /api/tools/{owner}/{repo}/{tool_id}/revisions?version=<v>
  → [{ changeset_revision: "abc123", tool_version: "1.0.0" }, ...]
```

Would replace the 2-call workaround with one call, no client-side scanning of a full metadata blob. Server already has all this in `RepositoryMetadata` rows; exposing it is a SELECT, not a computation.

### P2 — fix TRS version dedup

`managers/trs.py:87-97` — the accumulator is `versions[tool_metadata["version"]] = metadata`, overwriting across changesets. At minimum, change to a list per version so `/api/ga4gh/trs/v2/tools/{id}/versions` can surface the full set of revisions that publish each version. Tiny change, makes TRS honest about the underlying data.

### P3 — populate TRS `ToolVersion.url` per-revision

There's an explicit `TODO` in `trs.py:134` noting that `ToolVersion.url` is the repo URL, not a version-specific URL. Pointing to `/<owner>/<repo>/{changeset}` would let a TRS-only client materialize the right revision without a second round trip through the `/api/repositories/...` endpoints.

### P4 — bulk TRS listing `GET /api/ga4gh/trs/v2/tools`

Currently stubbed to `[]`. Useful for offline indexers and for the "I want to enumerate everything" case. Not load-bearing for Stage 7 but removes a compliance gap with the TRS 2.1 spec.

### P5 — auto-refresh tool search index on upload

`lib/tool_shed/managers/repositories.py:113-115` docstring literally says indexes have to be pre-created manually. The `upload_tar_and_set_metadata` path doesn't re-index. Result: search hits can lag reality by hours/days. For agent skills this is observable noise (a freshly-uploaded tool can't be found). Hook the index rebuild into the upload/metadata path.

### P6 — EDAM in tool index

Tool XML `<edam_operations>`/`<edam_topics>` are parsed into `RepositoryMetadata.metadata["tools"][i]` but not indexed by the Whoosh tool schema (`tool_search.py:21-31`). EDAM-driven discovery works on Galaxy's own toolbox search but not on the Tool Shed — a gap worth closing for semantic queries like "find me any tool classified as sequence alignment."

## Summary

- **Stage 7 shipped** with the 3-call workaround (repo lookup → metadata + ordered-revisions in parallel). No Tool Shed change required.
- **P0–P6 enhancement requests are tabled.** Skill loop is functional today; if the metadata-blob fetch shows up as a latency hotspot during real skill use, file the upstream issues then.
- Wishlist remains documented above so we don't lose the analysis.
