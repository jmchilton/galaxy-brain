# Plan: wire `@galaxy-tool-util/search` into the gxwf CLI for a `find-shed-tool` skill

## Goal

Expose the new `@galaxy-tool-util/search` package via CLI so an agent skill
can do **instance-agnostic** Tool Shed tool discovery: text → candidate
tools → enough metadata to pick one → cache + retrieve the parsed tool
definition for use in a Format-2 workflow.

The CLI is the *only* surface a skill needs to depend on. The skill never
imports the package directly; it shells out to commands that emit JSON.

## What's already in place

`packages/search/src/`:
- `searchTools(toolshedUrl, query, opts)` — single-page HTTP client with `ToolFetchError`, 30s timeout, 404→empty.
- `iterateToolSearchPages(...)` — async generator paginator.
- `ToolSearchService` — multi-source fan-out, `(owner, repo, toolId)` dedupe (first source wins), score sort, optional `ParsedTool` enrichment via shared `ToolInfoService`.
- `getTRSToolVersions(toolshedUrl, trsToolId)` / `getLatestTRSToolVersion(...)` — re-exported from core, walks `/api/ga4gh/trs/v2/tools/{owner~repo~toolId}/versions`.
- `NormalizedToolHit` — camelCase, with derived `trsToolId` (`owner~repo~toolId`) and `fullToolId` (`<host>/repos/<owner>/<repo>/<toolId>[/<version>]`).

`packages/cli/src/bin/`:
- `gxwf.ts` — workflow ops (validate/clean/lint/convert/roundtrip/mermaid).
- `galaxy-tool-cache.ts` — tool cache ops (add/list/info/clear/schema/populate-workflow/structural-schema).

Already wired: `ToolSource[]` config (core `config.ts`, `galaxy.workflows.toolSources`), `ToolInfoService` with caching, `DEFAULT_TOOLSHED_URL = https://toolshed.g2.bx.psu.edu`.

## What's missing (and constrains design)

From the Tool Shed research (`Component - Tool Shed Search and Indexing.md`):

- Tool search hits **don't carry version or changeset_revision**. The search package types them as `version?` / `changeset_revision?` with a comment pointing at an upstream patch (`TS_SEARCH_OVERHAUL_ISSUE.md`, doesn't exist yet). Until that lands, every search result requires a follow-up TRS or `get_ordered_installable_revisions` call to pin a version.
- Tool index is **not auto-rebuilt** on upload. Hits can lag by hours/days behind reality.
- No EDAM, no stem analyzer, wildcard `*term*` wrapping, case asymmetry tool vs. repo search.
- `/api/ga4gh/trs/v2/tools` (bulk listing) is a stub returning `[]`.
- Same XML `tool_id` can exist in multiple repos under multiple owners — hits are not deduped server-side.
- The "approved" boost is dead code; only `times_downloaded` shifts ranking.

A skill that calls into this needs to **expect noisy results and a multi-call dance** (search → versions → metadata) per candidate.

## Iterative CLI plan

Each stage is a shippable increment. Stages 1–3 are the minimum viable
surface for a `find-shed-tool` skill; later stages improve quality of
selection, batch use, and offline workflow authoring.

**Status (2026-04-25):** Stages 1, 2, 3, 7 are **shipped**. Stage 5 removed
by decision. Stages 4 (QoL filters, `repo-search`) and 6 (`--enrich`) remain
as optional follow-ups, deferred until skill testing demonstrates need. The
minimum viable CLI surface for `find-shed-tool` is complete.

### Stage 1 — `gxwf tool-search` (single-shot text search, JSON-first) ✅ shipped

New file: `packages/cli/src/commands/tool-search.ts`. New subcommand on `gxwf`.
Flat-verb naming (`tool-search`, `tool-versions`, `tool-revisions`) matches
the existing `validate-tree`/`lint-tree`/`clean-tree` style in the same bin
rather than introducing the first noun-namespace.

```
gxwf tool-search <query>
  --page-size <n>             # default 20
  --max-results <n>           # default 50
  --json                      # machine-readable
  [--cache-dir <dir>]         # for any future cache reuse; ignored at this stage
```

The CLI targets a single Tool Shed (`DEFAULT_TOOLSHED_URL =
https://toolshed.g2.bx.psu.edu`). No `--toolshed` flag, no multi-source
config. The package's `ToolSearchService` retains its multi-source
capability for other consumers; the CLI just doesn't expose it.

- Calls `ToolSearchService.searchTools(query, { pageSize, maxResults })` against the single hardcoded Tool Shed.
- Default human output: tabular `score | owner/repo | tool_id | name | description`.
- `--json`: array of `NormalizedToolHit` verbatim. Skill always uses this.
- Exit codes:
  - `0` — at least one hit.
  - `2` — zero hits (distinct from network/HTTP failure).
  - `3` — `ToolFetchError`.
- JSON envelope (so we can grow without breaking the skill):
  ```json
  { "query": "...", "hits": [...] }
  ```

**Why a wrapper envelope:** Stage 1 ships an array of hits only; later stages may add `truncated`/`nextPage`. Lock the envelope shape now.

**Tests** (mirror existing CLI test pattern): `test/commands.test.ts` style — run the binary against a recorded ToolShed response (`test/helpers` already has fixtures). Use a stub `fetcher` injected through a small test-only flag, OR — simpler — record a fixture and serve it via vitest mock.

**Skill consumption pattern after Stage 1:**
```
gxwf tool-search "fastqc" --json
→ pick hit by inspection of name/description/owner/repo
```

### Stage 2 — `gxwf tool-versions` (resolve picks to installable versions) ✅ shipped

Search hits don't carry versions. Skill needs a way to ask "what versions
of this tool exist?" The search package already wraps `getTRSToolVersions`.

```
gxwf tool-versions <trs-id|owner/repo/tool_id>
  --json
  --latest                    # only print the latest version
```

- Accepts both wire forms — `owner~repo~tool_id` (TRS) and `owner/repo/tool_id` (pretty).
- Output: ordered list of versions, newest last (TRS dedupes by version string; document this caveat in the help text).
- `--latest`: prints one version string and exits `0`, or exits `2` if none.
- JSON shape:
  ```json
  { "trsToolId": "...", "versions": ["1.0.0", "1.1.0"] }
  ```

**Why a separate command, not flags on `tool-search`:** `getTRSToolVersions` is one HTTP call per hit. Putting it on `tool-search` would either (a) be N+1 over every result (slow, often wasteful) or (b) require a `--resolve-versions` flag that complicates the JSON shape. Skills can call `tool-versions` selectively for the candidate(s) they care about.

### Stage 3 — `galaxy-tool-cache add` already covers fetch, but expose a thin discovery→cache shortcut ✅ shipped (no new code; documented loop)

Once the skill has picked `(trsToolId, version)`, it needs the parsed tool
to wire it into a workflow. That's already what `galaxy-tool-cache add`
does — and it lands the result in the same on-disk cache that
`gxwf validate`/`lint`/`convert --stateful` consult. **Don't duplicate.**

Skill loop, end-to-end:
```
gxwf tool-search "<query>" --json                     → hits
gxwf tool-versions <trsId> --latest --json            → version
galaxy-tool-cache add <trsId> --version <v>           → cached ParsedTool
galaxy-tool-cache info <trsId>                        → for show-user step
galaxy-tool-cache schema <trsId> --representation workflow_step
                                                      → JSON Schema for editing the workflow
```

The only new piece in Stage 3 is documentation tying these together
(skill-side, see `find-shed-tool` skeleton below).

**Optional convenience** if testing shows the four-step dance is awkward:
add `gxwf tool-fetch <query>` that searches → picks top-1 → resolves
latest → adds to cache, returning the cache key. Defer this until skill
testing demonstrates need; it muddies the responsibility split.

### Stage 4 — `gxwf tool-search` quality-of-life: filtering, repo search, paging — *deferred*

Once Stages 1–3 are in use and skill testing reveals where ranking falls
short, layer on:

- `--owner <user>` — pre-filter hits client-side (server tool-search has no `owner:` reserved filter; only the *repository* search does).
- `--match-name` — filter to hits where the query appears as a token in `name` (tightens noisy `*term*` hits).
- `--page <n>` — explicit page paging for the rare query that exceeds `maxResults`.
- New sibling **`gxwf repo-search <query>`** — `/api/repositories?q=` instead of `/api/tools?q=` (different schema, popularity-boosted ranking, supports `category:` and `owner:` reserved filters server-side). New `searchRepositories(...)` HTTP client in the search package mirroring `searchTools`. Separate command rather than a `--repo` flag because the response shape differs materially (RepositorySearchResults vs. tool hits) and conflating them complicates the JSON envelope.

Repo search is materially better for "find me a *package* about X" queries
(richer fields, popularity boost). Tool search is better for "find me a
specific tool by exact name." A skill can branch on whether the user said
"I want a tool that does X" (tool search) vs. "I want the X package"
(repo search).

### Stage 5 — (removed) multi-toolshed config

Decision: there is only one Tool Shed. The CLI does not expose a
`--toolshed` flag and does not read `galaxy.workflows.toolSources`. The
`find-shed-tool` skill never prompts the agent to consider mirrors or
alternative sheds. The package's `ToolSearchService` retains its
multi-source capability for non-CLI consumers.

### Stage 6 — search-time enrichment for skill latency — *deferred*

`ToolSearchService.searchTools(..., { enrich: true })` resolves each
hit's `ParsedTool` via `ToolInfoService` (and caches it). Surface as
`--enrich` on `gxwf tool-search`. Off by default (cost: one fetch per hit).

When the skill knows it'll only pick the top 1–3 results, enriching
saves a follow-up `galaxy-tool-cache add`. JSON output gains a
`parsedTool` field per hit when enriched.

Defer until the skill is exercised against real workflows — premature for
Stage 1.

### Stage 7 — repo→installable-revisions resolution for compose-time correctness ✅ shipped

The `(owner, repo, tool_id)` from a search hit doesn't tell you which
*changeset_revisions* of the repo actually contain that tool. Galaxy
installs at `(name, owner, changeset_revision)` granularity. To produce
a workflow that's portably reinstallable, the skill needs the changeset.

**Shipped form:** `gxwf tool-revisions <tool-id> [--tool-version <v>] [--latest] [--json]`

The flag is `--tool-version` rather than `--version` because commander's
program-level `--version` flag intercepts. Implementation lives in
`packages/search/src/client/revisions.ts` (`getToolRevisions`) and uses
the 3-call workaround documented in `PLAN_SEARCH_CLI_STAGE7.md`:
`/api/repositories?owner=&name=` → encoded repo id →
`/api/repositories/{id}/metadata?downloadable_only=true` +
`get_ordered_installable_revisions` (in parallel) → filter + sort.

Output JSON envelope: `{ trsToolId, version?, revisions: [{ changesetRevision, toolVersion }] }`.
Exit codes: `0` hits, `2` empty, `3` fetch error.

Tests: 6 search-client tests + 7 CLI tests, mock-fetcher style with real
ToolShed fixtures captured by `scripts/regen-toolshed-fixtures.mjs`.

Tool Shed enhancement requests (P0–P6 in `PLAN_SEARCH_CLI_STAGE7.md`) are
**tabled** — the workaround is good enough for the skill loop. Revisit if
the metadata-blob fetch becomes a real latency problem.

## `find-shed-tool` skill skeleton (informs the CLI design)

Single-skill, no router. Lives at `skills/find-shed-tool/`.

```
SKILL.md          # procedure: parse intent → search → narrow → resolve → cache
README.md         # quick start
references/
  toolshed-fields.md   # what name/description/help mean, what they don't
  ranking-caveats.md   # wildcard wrapping, case asymmetry, dead approved boost
examples/
  fastqc-pick.md       # walked example: query "fastq quality control"
  ambiguous-bwa.md     # walked example: same tool_id in multiple repos
```

Procedure (pseudocode):
```
1. From user prose, extract a search term (1–4 words; concrete tool name preferred).
2. Run `gxwf tool-search "<term>" --json` (Stage 1).
3. Triage hits:
   - Discard hits whose name/description don't plausibly match.
   - When multiple owners publish the same tool_id, prefer iuc/devteam/bgruening
     (configurable allowlist, mirror nf-to-galaxy convention).
   - Surface ambiguity to the user when no clear winner.
4. For the chosen hit, run `gxwf tool-versions <trsId> --latest --json` (Stage 2).
5. `galaxy-tool-cache add <trsId> --version <v>` (Stage 3).
6. Confirm: `galaxy-tool-cache info <trsId>` — show name/version/description to user.
7. (Workflow-authoring follow-up, owned by other skills:)
   `galaxy-tool-cache schema <trsId> --representation workflow_step`
   → JSON Schema the workflow-authoring skill uses to fill `tool_state`.
```

The skill is **CLI-only**, machine-readable JSON, no MCP/instance
dependence. It is instance-agnostic: a Tool Shed is the registry; whether
any *Galaxy server* has the tool installed is a separate question handled
elsewhere.

## Surfaces shared by both CLIs

- Both binaries already live in `@galaxy-tool-util/cli`; reuse
  `addStrictOptions` patterns and the existing JSON-output convention.
- Cache directory flag is consistent (`--cache-dir`) across both bins; new
  commands inherit it where caching applies.
- Errors → stderr, structured output → stdout; exit codes documented per
  command.

## Test strategy

- Unit tests already exist for `ToolSearchService` and HTTP client in the
  search package.
- New CLI command tests follow `test/commands.test.ts` patterns: spawn the
  binary, mock fetch via a fixture-backed `fetcher` (the search package
  already accepts an injected `fetcher`).
- One end-to-end test against `https://toolshed.g2.bx.psu.edu` for a
  stable query (`fastqc`), gated behind an env var so CI doesn't depend on
  the public server.

## Versioning

Each stage = one Changesets minor on `@galaxy-tool-util/cli` and (when
new exports are added) on `@galaxy-tool-util/search`. The empty
`.changeset/violet-bags-search.md` already in the worktree is the
placeholder for Stage 1.

## Unresolved questions

- Cache directory default for `gxwf tool-search` when `--enrich` is added — share `galaxy-tool-cache`'s default?
- Allowlist of preferred owners (iuc/devteam/bgruening): hardcode in skill, in CLI default, or surface as a flag only?
- Repo-search reserved filters (`category:`, `owner:`) — surface as CLI flags or pass-through query?
- `--exit-zero-on-empty` for pipeline-friendly scripting, or keep `2` as the empty signal?
- `gxwf tool-fetch` (Stage 3 optional) — ship preemptively or wait for skill testing?
