# Tool discovery API gaps for agent / skill consumers

## Context

Building a CLI-driven skill that performs instance-agnostic tool discovery against the Tool Shed for authoring Format-2 Galaxy workflows. The pattern: `search(text) → pick hit → resolve to (tool_id, version, changeset_revision) → cache ParsedTool → emit workflow step`.

Everything is already buildable with today's API, but it takes 3–4 HTTP calls per candidate hit to pin information the Tool Shed's own indexes already hold. The requests below would shrink that to one.

## Requests

### 1. Include `version` and `changeset_revision` in tool-search hits (P0)

`GET /api/tools?q=<term>` currently returns:

```json
{ "tool": { "id", "name", "description", "repo_name", "repo_owner_username" }, "score", "matched_terms" }
```

The Whoosh tool index already stores `version` (`tool_search.py:21-31`) but the hit dict in `repo_search.py` drops it. A consumer with a search hit cannot tell which version or revision the hit refers to and must follow up with:

- `GET /api/ga4gh/trs/v2/tools/{owner~repo~tool_id}/versions` (to learn any version), and/or
- `GET /api/repositories/{id}/metadata?downloadable_only=true` (to find revisions).

Proposed hit shape:

```json
{
  "tool": {
    "id", "name", "description", "repo_name", "repo_owner_username",
    "version": "1.0.0",
    "changeset_revision": "abc123…"
  },
  "score", "matched_terms"
}
```

Both fields should be optional to preserve compatibility with existing clients; consumers that do not care about pinning can ignore them.

### 2. Add `GET /api/tools/{owner}/{repo}/{tool_id}/revisions` (P1)

Given `(owner, repo, tool_id)`, return the installable changesets that contain that tool, with the tool's per-revision version:

```json
[
  { "changeset_revision": "abc123", "tool_version": "1.0.0", "numeric_revision": 12 },
  { "changeset_revision": "def456", "tool_version": "1.1.0", "numeric_revision": 17 }
]
```

Optional query: `?version=<v>` filters to revisions containing that specific tool version.

Today this requires a two-call dance:

1. `GET /api/repositories?owner=<O>&name=<R>` → encoded repo id.
2. `GET /api/repositories/{id}/metadata?downloadable_only=true` → full per-revision metadata blob, which the client then scans for the tool.

The data is already in `RepositoryMetadata.metadata["tools"]` — exposing this view is a SELECT, not a computation. A workflow-authoring loop calls this exactly once per candidate tool; the workaround scales the payload by all tools × all revisions in the repo just to read one slice.

### 3. Stop deduplicating versions across changesets in the TRS response (P2)

`managers/trs.py:87-97` builds TRS `ToolVersion` entries by iterating installable revisions and assigning into a dict keyed by tool version string:

```python
versions[tool_metadata["version"]] = metadata   # last one wins
```

If the same version string appears in multiple changesets (which is permitted — the XML `version=` attribute is author-controlled and not enforced to bump), the TRS response silently hides all but one. For any consumer trying to reproducibly pin a workflow to `(name, owner, changeset_revision)`, TRS is actively misleading on this point.

Minimum fix: change the accumulator to a list per version. `ToolVersion` could gain a `changeset_revisions: list[str]` field (TRS extension fields are permitted), or the endpoint could return one `ToolVersion` per changeset with the changeset hash encoded into `ToolVersion.id` somehow.

### 4. Populate `ToolVersion.url` with a revision-specific URL (P3)

`trs.py:134` has an explicit `TODO` comment that `ToolVersion.url` reuses the repo URL rather than pointing at the specific revision. A TRS-only client cannot materialize the correct content from the TRS response alone today. Changing this to `<host>/repos/<owner>/<repo>/archive/<changeset>.tar.gz` (or the equivalent hg URL) closes the loop.

### 5. Implement `GET /api/ga4gh/trs/v2/tools` (P4)

Currently stubbed to `[]`. Needed for TRS 2.1 compliance and for the "enumerate the catalog" case that any third-party indexer or mirror needs.

### 6. Auto-rebuild the tool search index on upload (P5)

`lib/tool_shed/managers/repositories.py:113-115`:

> you have to pre-create with scripts/tool_shed/build_ts_whoosh_index.sh manually

`upload_tar_and_set_metadata` does not hook into the index rebuild. Freshly-uploaded tools are invisible to `/api/tools?q=` until cron runs. For automated / agent consumers this is observable noise: a tool exists in `RepositoryMetadata` but search can't find it. Hooking the index rebuild into the upload + metadata path (or at least into `set_repository_metadata_due_to_new_tip`) aligns the search surface with reality.

### 7. Index EDAM terms in the tool search schema (P6)

Tool XML `<edam_operations>` / `<edam_topics>` are parsed into `RepositoryMetadata.metadata["tools"][i]` but not added to the Whoosh tool schema in `lib/tool_shed/webapp/search/tool_search.py:21-31`. Galaxy's own toolbox search indexes these fields and benefits substantially from them; the Tool Shed lacks semantic discovery as a result. For agents trying "find me a tool that does sequence alignment" rather than "find me a tool literally named bwa," this is the gap.

## Summary of impact on a skill loop

Today, picking one tool and pinning it for a workflow takes roughly:

```
1× /api/tools?q=                (search)
1× /api/ga4gh/trs/.../versions   (resolve version)
1× /api/repositories?owner=...   (get repo id)
1× /api/repositories/{id}/metadata?downloadable_only=true   (find revision)
1× /api/tools/{id}/versions/{v}  (cache ParsedTool)
```

With P0 + P1 (or P0 alone, for tools where the latest version is good enough):

```
1× /api/tools?q=                 (search, includes version + revision)
1× /api/tools/{id}/versions/{v}  (cache ParsedTool)
```

The common case drops from 5 calls to 2.
