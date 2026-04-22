# Tool Shed Search Overhaul — GitHub Issue

## Title

Tool Shed search overhaul: index EDAM + version, fix query wrapping, auto-reindex on upload

## Body

The Tool Shed's Whoosh-backed search (`/api/repositories?q=`, `/api/tools?q=`) has several long-standing rough edges that limit its usefulness for programmatic consumers (IDEs, workflow editors, `planemo`/`ephemeris` discovery flows) and for humans using the web UI. Most of the fixes are small and local to `lib/tool_shed/webapp/search/` and `lib/tool_shed/util/shed_index.py`. Filing as a single umbrella issue; happy to split into PRs.

Code references below are against `lib/tool_shed/`.

### Prioritized list

#### P0 — Index EDAM operations/topics and tool version in the tool search index

The tool-search Whoosh schema (`webapp/search/tool_search.py:21-31`) indexes only `name, description, owner, id, help, version, repo_name, repo_owner_username, repo_id`. Tool XML `<edam_operations>` and `<edam_topics>` are already parsed and stored in `RepositoryMetadata.metadata["tools"][i]` — they just aren't pulled into the Whoosh index. `load_one_dir` (`util/shed_index.py:181-198`) reads only `help/description/id/name/version`.

Users discover tools by function ("trim adapters", "variant calling", "peak calling"). Without EDAM as a searchable field, the index falls back to free-text `help`, which is inconsistent across wrappers. Adding EDAM closes most of the semantic gap between Tool Shed search and Galaxy's own tool-panel search (which already indexes EDAM — see `lib/galaxy/tools/search/__init__.py:144-199`).

Related: the hit payload from `ToolSearch.search` (`webapp/search/tool_search.py:74-88`) omits `version` (and `changeset_revision`) even though `version` is indexed. Consumers currently need a follow-up call to `get_ordered_installable_revisions` just to show a version string. Add `version` and `changeset_revision` to the serialized hit.

**Proposed changes**
- Add `edam_operations` and `edam_topics` (TEXT or KEYWORD, consider stemming analyzer) to `tool_schema`.
- Populate them in `load_one_dir` from the metadata dict.
- Include `version`, `edam_operations`, `edam_topics`, and `changeset_revision` in the result-hit dict.
- Add `edam_operations`, `edam_topics` to the `MultifieldParser` field list (`tool_search.py:62`) with sensible boosts.

#### P1 — Stop wrapping queries as `*term*`

Both `RepoSearch.search` (`webapp/search/repo_search.py:87,130`) and `ToolSearch.search` (`webapp/search/tool_search.py:64`) rewrite user input as `*term*`. This:
- disables analyzer-based stemming on the user's term,
- breaks phrase queries (multi-word input silently stops working as users expect),
- prevents boolean syntax from surviving,
- makes very short terms scan the full vocabulary.

**Proposed change** — parse the query with the multifield parser directly and rely on analyzers + fielded defaults. If a substring-match affordance is genuinely wanted, expose it as an optional flag (`&substring=true`) or as an explicit `*…*` syntax passthrough rather than silently rewriting every query.

Sub-issue: `RepoSearch` lowercases input (`repo_search.py:87`) but `ToolSearch` does not (`tool_search.py:61-64`). Same endpoint family, different case behavior — pick one.

#### P2 — Rebuild the index on upload

`upload_tar_and_set_metadata` (`managers/repositories.py:741-803`) regenerates `RepositoryMetadata` but does not touch the Whoosh index. The docstring at `managers/repositories.py:113-115` openly says "you have to pre-create with scripts/tool_shed/build_ts_whoosh_index.sh manually". Result: newly uploaded revisions are invisible to search until cron runs.

`build_index` (`util/shed_index.py:40-91`) already supports per-repo incremental updates (`delete_by_term("repo_id", repo_id)` then add). The hook needed is a call to an `index_repository(repo_id)` helper at the end of upload and at the end of deprecate/undeprecate.

Also: the incremental loop in `build_index` (`shed_index.py:65-67`) `break`s on the first matching `full_last_updated` and relies on `update_time DESC` ordering; one anomaly and the crawler silently stops. Worth a defensive rewrite to `continue` with an explicit "unchanged" skip and a completeness pass at the end.

#### P3 — Fix `approved` boost (currently dead code)

`shed_index.py:161` always stores `approved = "no"`; `repo_search.py:66` doubles the score when `approved == "yes"`. No repository is ever scored as approved. Either populate it from the real field (`Repository.marked_approved` / certification state if one exists) or drop the branch. Today's ranking is effectively BM25F × `times_downloaded/100`, which over-rewards old popular tools and gives no weight to curator signal.

#### P4 — Implement (or explicitly deprecate) the TRS list endpoint

`GET /api/ga4gh/trs/v2/tools` returns a hardcoded `[]` (`webapp/api2/tools.py:116-121`) with a TODO comment. This breaks bulk-enumeration use cases (mirror tooling, catalog exports) and silently violates the TRS 2.1 spec. Either implement pagination over installable tools or document the stub and drop the route from the advertised `service-info`.

Related, lower priority: TRS `ToolVersion.url` is the same string as `Tool.url` (explicit TODO at `managers/trs.py:134`). Should point at a version-specific resource (e.g. `.../repos/<owner>/<repo>/archive/<changeset>`). TRS `ToolVersion.author` is the repository owner username, not the tool author.

#### P5 — TRS version dedup across revisions

`get_repository_metadata_by_tool_version` at `managers/trs.py:87-97` keys versions by the XML `version` string and silently overwrites duplicates. If the same `version` appears in multiple changesets (which happens — there is no invariant that `version` must bump), only the last-seen entry is reflected in the TRS response. At minimum this should be surfaced to callers (distinct changesets per version, or a warning in the payload) rather than quietly collapsed.

#### P6 — Category handling

Categories are stored in the repo index as a lowercased comma-joined KEYWORD field (`shed_index.py:101-105`). The reserved filter `category:'Climate Analysis'` in user-facing docs (see doctest at `repo_search.py:187`) queries with the exact cased string and silently misses. Either normalize the filter value to lowercase before querying or switch to a proper multi-valued field.

#### P7 — Empty-page behavior

`search_page` raises `404 ObjectNotFound` when the requested page is past the end (`repo_search.py:138-139`, `tool_search.py:67-69`). For a client that wants to page through results until exhausted, an empty `hits: []` with the real `total_results` is more ergonomic than a 404. Pagination headers (`Link: next`) would also help.

### Non-goals / out of scope for this issue

- Rewriting on top of a non-Whoosh backend (Elasticsearch, Meilisearch, SQLite FTS). Worth a separate discussion, but the above can all be delivered incrementally on the existing Whoosh code.
- Changes to Galaxy's installed-tool search (`lib/galaxy/tools/search/`). Only the Tool Shed server is in scope.
- New endpoints for tool descriptors/tests/containerfiles under TRS. Those are real gaps but are a separate effort.

### Context for reviewers

A companion document with full code references is available on request; the findings summarized above come from a survey of `lib/tool_shed/webapp/search/`, `lib/tool_shed/util/shed_index.py`, `lib/tool_shed/managers/{repositories,tools,trs}.py`, and the TRS route module. Happy to land P0 as a standalone PR first to validate the approach before tackling the rest.
