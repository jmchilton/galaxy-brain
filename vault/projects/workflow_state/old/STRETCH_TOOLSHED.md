# Stretch plan: Tool Shed and adjacent improvements that would help `find-shed-tool`

These are not blockers for the CLI/skill plan in `PLAN_SEARCH_CLI.md` —
each is a multi-week-or-longer effort against a separate codebase
(Galaxy / Tool Shed) or against the search package's still-evolving
surface. Each entry: *what*, *why it helps a discovery skill*,
*rough effort*, *blast radius*.

Source for diagnoses: `vault/research/Component - Tool Shed Search and
Indexing.md`.

---

## A. Tool Shed–side fixes (Galaxy monorepo, `lib/tool_shed/`)

### A1. Carry `version` and `changeset_revision` on tool-search hits

`tool_search.py:74-88` builds the per-hit dict from the Whoosh document
but drops `version` (already in the schema) and never indexes `changeset
_revision`. Result: every search hit needs a follow-up TRS call to
become installable. The search package already declares both fields as
`?optional` with a comment pointing at this patch
(`packages/search/src/models/toolshed-search.ts:27-34`).

- **Help to skill:** removes the Stage-2 `gxwf tool versions` round-trip
  for the common case (top-N hit + take latest version). Two CLI calls
  collapse to one.
- **Effort:** small. Add `version` to the result dict; add
  `changeset_revision` as a `KEYWORD` field, populate during
  `load_one_dir` (pass changeset hash through), include in result dict.
  Bump `tool_schema` version; document a reindex requirement.
- **Blast radius:** index format change → forces full rebuild on
  upstream Tool Shed deploys. Coordinate with Galaxy release.

### A2. Index EDAM operations and topics

Tool XML `<edam_operations>` / `<edam_topics>` are parsed by Galaxy's
metadata pipeline (already in `RepositoryMetadata.metadata["tools"]`) but
never put in the Whoosh `tool_schema`
(`tool_search.py:21-31`). EDAM fields *are* indexed by Galaxy's *internal*
toolbox search; only the Tool Shed's is missing them.

- **Help to skill:** semantic queries ("alignment", "variant calling")
  return relevant hits even when the tool's `name`/`description` doesn't
  contain those literal words. Substantially better recall.
- **Effort:** medium. Schema change, indexer change in
  `shed_index.py:181-198`'s `load_one_dir` to pull EDAM from parsed tool,
  query parser change to weight EDAM. Same reindex obligation as A1.
- **Blast radius:** index format; query semantics shift slightly.

### A3. Auto-reindex on upload

`upload_tar_and_set_metadata` writes `RepositoryMetadata` rows
(`managers/repositories.py:741-803`) but does **not** update the Whoosh
indexes. Freshness depends on cron / a manual `PUT /api/tools/build_search_
index`. Documented in research §6 as a primary rough edge.

- **Help to skill:** newly-published tools are findable immediately.
  Without it, "search for the tool I just published" silently fails for
  hours/days.
- **Effort:** small for the trigger; **the hard part is incremental
  correctness**. The current `build_index` break-loop logic
  (`shed_index.py:65-67`) assumes descending-`update_time` ordering and
  bails at the first match. A per-repo update path needs: lock around
  index writers (Whoosh allows one writer at a time), delete-by-`repo_id`
  + add-tools, debounce/queue for upload bursts.
- **Blast radius:** runtime change in upload path; locking introduces
  contention if writers stack up.

### A4. Implement `GET /api/ga4gh/trs/v2/tools` (currently stubbed `[]`)

`api2/tools.py:116-121` returns an empty list with a TODO. With it
implemented, agents can enumerate the catalog (paginated, filtered) using
a *spec-conforming* protocol — useful for offline indexes and for tools
that cross-reference multiple TRS-compliant registries (Dockstore, BioContainers).

- **Help to skill:** enables an offline build of a local search index
  (Stretch B1) and TRS-compatible cross-registry queries.
- **Effort:** medium. Backed by the same SQL/metadata that `RepoSearch`
  already walks; add pagination headers per TRS spec.
- **Blast radius:** new endpoint; `Link`/`next_page` headers must conform
  to TRS 2.1 to be useful to standard clients.

### A5. Fix the dead `approved` boost (or remove it)

`RepoWeighting.final` doubles BM25 when `approved == "yes"`
(`repo_search.py:66`), but `approved` is always written as `"no"`
(`shed_index.py:161`). The boost is dead code today.

- **Help to skill:** ranking would actually reflect reviewer approval
  once a repository-approval workflow exists. Lowest-priority absent that
  process.
- **Effort:** trivial code change; the *missing piece* is the curation
  workflow that decides `approved=yes`. Without one, just delete the
  boost.

### A6. Lowercase `categories` consistently for filter parity

The repo index lowercases category names at write time
(`shed_index.py:101-105`) but the reserved `category:'Climate Analysis'`
filter passes the user's casing through verbatim
(`repo_search.py:187`). Silent zero-result misses.

- **Help to skill:** category-driven narrowing actually works — useful
  when the user query is generic but the domain is known.
- **Effort:** trivial. Lowercase the filter value in
  `_parse_reserved_filters`. Document the change.

### A7. Stop deduping TRS versions by version string

`get_repository_metadata_by_tool_version` collapses duplicate version
strings across changesets (`managers/trs.py:96`, `versions[v] = metadata`
overwrite). Two changesets can publish the same XML `version` with
different content; only the last wins.

- **Help to skill:** when picking a `(tool_id, version)` to cache, the
  skill at least sees that there *are* multiple changesets behind a
  version string, prompting an explicit choice.
- **Effort:** small. Return a list of `(version, changeset)` tuples or
  add `versions_with_revisions`; bump the response schema or add a new
  field.
- **Blast radius:** TRS schema deviation (already non-conforming, see
  research §3) — either move further from spec or pin behind a
  Tool-Shed-specific extension field.

---

## B. New surfaces that would unblock skill quality without changing the Tool Shed

### B1. Local mirror index built from the TRS catalog

If A4 (`GET /tools`) lands, build a local Whoosh-or-MeiliSearch-or-Tantivy
index from the catalog snapshot. Skill queries hit the local index
(milliseconds, fully filterable, EDAM enabled) and only fall through to
the live Tool Shed for installation-time confirmation.

- **Help to skill:** offline operation; richer query syntax (boolean,
  field-scoped, EDAM); avoids the wildcard-wrapping degradation.
- **Effort:** medium-high. Crawler script in TS (or Python — could share
  the existing `shed_index.py` schema decisions), cache invalidation
  policy, schema migration story. Lives in
  `@galaxy-tool-util/search` as a Node-only sub-entry.
- **Blast radius:** new dependency surface; storage cost (~tens of MB).

Falls back gracefully: if the local index is missing or stale,
`gxwf search` calls the live Tool Shed (current Stage-1 behaviour).

### B2. Curated tool catalog with EDAM and signal — independent of Tool Shed

Skip the Tool Shed for discovery entirely; consume an upstream curated
list (the Galaxy training material EDAM annotations, the bio.tools
registry, BioContainers index, IUC's own tools-iuc tree). Cross-reference
to Tool Shed only when a candidate is selected.

- **Help to skill:** EDAM-grade semantic queries, popularity from
  bio.tools/Bioconda download counts, no dependency on Tool Shed
  freshness.
- **Effort:** high. Source-selection, normalization across registries,
  trust model for which source wins on conflict.
- **Blast radius:** new registry surface; need to track upstream
  changes.

### B3. Embedding-based reranker on top of `gxwf search`

The wildcard-wrapped BM25 ordering is coarse. After Stage 1 ships, run a
small embedding model (locally or via the Anthropic API) over hit
`name + description` and the user's query, and rerank.

- **Help to skill:** materially better top-K when the user's intent is
  semantic (e.g. "find me a tool to count k-mers" → top hits become
  jellyfish/khmer instead of literal-substring matches).
- **Effort:** small. A pure `rerank(query, hits)` function (the search
  package CHANGELOG already mentions deferring this until UX testing).
  CLI flag `--rerank` opt-in; skill default-on.
- **Blast radius:** model dependency; cost per query when the API is
  used.

### B4. Galaxy-instance-installed-tools cross-check

Optional, off by default. Given a Galaxy URL, mark each search hit
with whether the *exact* `(tool_id, version)` is installed there. Useful
when the user has a target instance and wants to know what's already
available without leaving the discovery flow.

- **Help to skill:** keeps the discovery surface instance-agnostic
  (matches the user's stated preference) while letting the user opt into
  a single-instance check at the end of triage.
- **Effort:** small. Galaxy's `GET /api/tools?q=` already exists in the
  galaxy-tool-util `core` client; add a presence-only call per hit.
- **Blast radius:** new optional flag; one extra HTTP call per checked
  hit.

### B5. Skill memory of past picks

When the skill picks `iuc/fastqc` over `devteam/fastqc` for a given user
or project, persist that choice to the agent's memory system so future
ambiguous queries default the same way without re-prompting.

- **Help to skill:** reduces repeated "which owner do you want?" prompts.
- **Effort:** small. Memory-write at the end of the skill procedure.
- **Blast radius:** memory only; no code or registry changes.

### B6. Workflow-aware search ranking

When the skill is invoked *inside a workflow-authoring flow* (the parent
skill knows the upstream/downstream tools), bias ranking toward tools
whose declared input/output datatypes are compatible with the
workflow's existing data flow.

- **Help to skill:** "find me an alignment tool that takes the FASTQ
  collection coming out of FastQC" returns BWA/Bowtie2/HISAT2 ahead of
  unrelated `bwa_*` hits.
- **Effort:** medium. Requires Stage 6 enrichment (parsed tool with
  inputs/outputs) and a small datatype-compatibility ranker. Lives in
  the search package as a pure function; the workflow-authoring skill
  passes context.
- **Blast radius:** opt-in; no behaviour change for plain `gxwf search`.

---

## Suggested ordering across all of A and B

If forced to pick a near-term sequence:

1. **A1** (carry `version` on hits) — small change, removes a per-hit
   round-trip from the skill.
2. **A6** (lowercase category filter) — trivial, fixes silent miss.
3. **B3** (embedding reranker) — improves quality without waiting on
   upstream.
4. **A2** (EDAM in shed indexes) — unlocks semantic recall server-side.
5. **A3** (auto-reindex on upload) — freshness; biggest user-visible
   improvement of the cron-driven status quo.
6. **A4** (TRS `GET /tools`) — unlocks B1 / B2.
7. **B1 / B2** (local or curated index) — only worth the effort once A4
   exists, or commit to scraping the SQL backend directly.
8. Everything else as opportunity arises.

## Unresolved questions

- Pursue Tool Shed PRs upstream (A1/A6 first), or fork-and-iterate locally?
- B1 vs B2: build our own mirror, or consume bio.tools/BioContainers?
- Reranker (B3): local model or Anthropic API? Cost vs. latency vs. determinism.
- Should the `find-shed-tool` skill ever cross over to instance-installed checks (B4), or strictly stay registry-only?
- Memory of past picks (B5) — per-project or per-user scope?
- Workflow-aware ranking (B6) — is there a clean API split between the discovery skill and the workflow-authoring skill, or do they merge?
- TRS spec conformance (A7) — extend with our own fields, or stay strict?
