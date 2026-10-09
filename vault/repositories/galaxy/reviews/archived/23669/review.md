# PR #23669 — Add a Curated workflows tab to surface IWC workflows

Reviewed head: `20e6048cbaf0ddd378477294b9e7fafb8b09423a` against `origin/dev`.

## Summary

This adds an anonymously accessible curated-workflow listing with three configured sources (`iwc`, `local`, and `off`). The IWC path projects the remote manifest into a small, atomically replaced on-disk cache, refreshes it from Celery or a cooldown-guarded background thread, and reports whether this Galaxy has each workflow's tools. The local path lists published workflows belonging to configured owners. The client adds the tab, cards, filters, pagination, run/import actions, and a server-defined recommended sort.

The remote-content path is thoughtfully constrained: request handlers do no network I/O, URLs used for IWC/Dockstore actions have fixed HTTPS origins, annotations are sanitized before reaching `v-html`, refresh publication is atomic and cross-process locked, corrupt/version-mismatched projections trigger replacement, and stale healthy data remains available through refresh failures. The local query limits rows, tags, and annotations to the configured workflow owners. The component and backend test coverage is unusually extensive.

## Findings

### P2 — Local-mode free-text search does not search the descriptions advertised by the API and UI

`CuratedSearchQueryParam` documents free text as searching `name`, `description`, and `tag` (`lib/galaxy/webapps/galaxy/api/workflows.py:917-921`), and the shared curated filter help makes the same promise (`client/src/components/Workflow/List/curatedFilters.ts:27-29`). That is true for the IWC projection, whose `_Searchable.all_text` includes `description`, but not for `curated_workflows_source: local`: `WorkflowsManager.curated_index_query` applies each raw term only to `StoredWorkflow.name` and the owner-scoped tag `EXISTS` expression (`lib/galaxy/managers/workflows.py:343-357`). The owner annotation is loaded and returned as the card's description later, but it is never part of the SQL predicate.

Consequently, a locally curated workflow whose distinguishing text occurs only in its annotation is displayed with that description but disappears when a user searches for the same text. This also makes the same public endpoint and UI behave differently solely because an administrator switched sources. Please add an owner-scoped annotation `EXISTS` predicate to the local raw-text search (taking the same care as the owner-scoped tag predicate), and add a query/integration assertion that a term present only in the curated owner's annotation finds the workflow without matching annotations belonging to other users.

## Test and CI evidence

- Inspected the complete 46-file diff and the surrounding workflow query, annotation/tag ownership, toolbox, TRS import, configuration, Celery, routing, and card abstractions.
- Reviewed the PR description, commit rationale, existing discussion, and review state; there were no prior review comments or reviews at this head.
- `git diff --check origin/dev...HEAD` passed.
- No prepared Python or client dependency environment was present in this worktree, so I did not duplicate the targeted suites locally.
- At review time, CircleCI `get_code_and_test` had passed; the GitHub unit, integration, client, lint, generated-config, OpenAPI, and CodeQL jobs were still pending.

## Recommendation

Request changes for the local-description search mismatch above. I found no other blocking correctness, security, concurrency, permission, pagination, routing, or cache-lifecycle problem in the reviewed head.

## Re-review 2026-09-26 (head c6e70cee06a)

Branch was rebased onto newer dev (base `280eefdce53` → `47c11fe5edb`), so compared by `git range-diff`. Commits 1–12 are unchanged apart from commit 2 (`aef69db4462`), which gained a Python 3.10 `fromisoformat` "Z"-suffix shim in `curated.py`. Nine commits are new (`2900f235aee`..`c6e70cee06a`): the integration fixture and sync script, the collection filter and counts, free text sent to the server, the collection chips, and removal of the client route test.

**Our P2 was never posted.** Both jmchilton reviews on GitHub are body-less and carry only the two inline integration-test comments. The local-description finding from the section above appears only in this note, so the author has not seen it.

### Prior findings status

| Finding | By | Status | Evidence |
|---|---|---|---|
| P2 local free text ignores annotations | us (unposted) | **Not addressed.** Scope has widened: the help text now also promises "collections" | `lib/galaxy/managers/workflows.py:359` still searches `[StoredWorkflow.name, w_tag_exists]` only. `api/workflows.py:921` advertises `description` and `collection`. `curatedFilters.ts:31`. Scratch probe: owner annotation "unique-zebrafish description", search `zebrafish` → `([], 0)` (red) |
| Client-route integration test doesn't test what it documents | us (inline) | Addressed (test dropped) | `91337064d53`. Author confirmed no other `add_client_route` test exists. Coverage loss is intentional and acceptable; the Vue route is still in `router.js` |
| Build catalog fixtures as files and add a sync script | us (inline) | Addressed for IWC; local fixtures stay in code (DB rows, reasonable) | `test/integration/curated_workflows/iwc_catalog/iwc_workflows.json` + `sync_iwc_catalog.py`. Test constants are now derived from the fixture (`test_curated_workflows.py:59-77`) |
| CodeQL incomplete URL substring sanitization | bot | Addressed | The `"iwc.galaxyproject.org" in message` assert was replaced by `== UNAVAILABLE_MESSAGE` |
| Flat list overwhelming; wants a native collection view | mvdbeek | Partial, deferred by agreement | Chips + `collection:` filter + clickable card badges. Author offers a per-collection view as a follow-up |

### New code since last review

- **Free text to server** (`839c1d7e17f`, `CuratedWorkflowList.vue:163`): correct. The old path rebuilt the query from parsed filters, and curated `Filtering` has no `autoFilterKey`, so `flye name:assembly` lost `flye`. Invalid filters still never reach the server (`hasInvalidFilters` gate), and the server re-parses with the shared `parse_curated_search`. Side note: `WorkflowList.vue:223` `validatedFilterText()` has the same text-dropping shape on dev. That is outside this PR, but worth a follow-up issue.
- **Collection filter/counts** (`acad21b70b8`): clean. Reuses the `CURATED_SEARCH_FILTERS`/`_Searchable` path. Quoted means exact and unquoted means substring, matching `tag`. `count_collections` uses `Counter` (imported at module top). In local mode `collection:` → `false()` (`workflows.py:354`), which is consistent. Pydantic `CuratedWorkflowCollection` follows the existing `CuratedWorkflow` pattern, and the schema.ts regen is included.
- **Chips** (`5854269ceed`, `94bfb2babfe`): the one-row fold with "+N more" is hand-measured layout (`offsetTop` rows, a resize observer, and a watch on `hiddenCount`/`moreWidth` at `CuratedCollectionChips.vue:80`). It works, but it is bespoke. `StatelessTags` already does count-based `maxVisibleTags` + "show more". A count cap would be simpler, at the cost of a less exact fit. This is a nit, not a blocker. The watch on its own measured outputs could oscillate at a border width ("+9 more" vs "+10 more" changes `moreWidth`), but it should settle. `toggleCollection` edits the text with a regex (`CuratedWorkflowList.vue:73,183`) instead of `Filtering.setFilterValue`. The comment explains why (setFilterValue drops raw text). That is justified given the Filtering limitation.
- **Tests**: good. The unit tests for exact vs substring collection matching and whole-catalog counts are not trivial. The vitest cases cover keeping free text and other filters on toggle, the `c:` alias, card badge click, and no chips in local mode. The integration test asserts that counts stay independent of the search. The fixture-derived assertions (`test_catalog_reports_missing_tools`) are looser than the old hand-built ones (`missing_tools` ⊆ `tool_ids` rather than an exact value), which is acceptable for real data. The "runnable" entries are faked to `upload1` by the sync script, and that is documented.
- The sync script's `sys.path.insert` before imports is standard for Galaxy scripts. Lint passes.
- Nits: help text lists `collection:` even in local mode, where it always matches nothing. `count_collections` counts "Proteomics" and "proteomics" separately while the active-chip comparison is case-folded (cosmetic).

### Tests run

- `PYTHONPATH=lib <18467 venv>/pytest test/unit/workflow/test_curated.py test_curated_query.py test_curated_toolbox.py` → 109 passed.
- Scratch red probe (not committed): owner-annotation-only term via `curated_index_query` → 0 matches. This confirms the P2.
- Vitest skipped (no `client/node_modules`). Integration and selenium tests assessed by reading only.
- CI: everything green except Converter tests / Test (3.10). The only failure is `CONVERTER_interval_to_bed12_0` (a bx-python container job). The PR touches no datatypes or converters, and the last several dev runs of that workflow are green. Unrelated.

### Suggested verdict

Request changes, lightly. It is a single contained fix: add an owner-scoped annotation `EXISTS` to local raw-text search, plus a query test. As a fallback, narrow the advertised free-text fields and help text for local mode. Everything else is in good shape; approve once that lands.

### Draft GitHub review

```markdown
*Posted by Claude (AI assistant) on behalf of @jmchilton — not authored by them personally.*

Thanks for the fixture + sync script and the collection chips, both read well. The free-text-alongside-filters fix is a nice catch too.

One remaining issue, which I should have raised in the first round:

**Local-mode free text doesn't search descriptions.** The endpoint advertises free text over `name`, `description`, `tag`, `collection` (`api/workflows.py` `CuratedSearchQueryParam`), and the tab's help text says the same. In `curated_workflows_source: local`, though, `curated_index_query` applies raw terms only to `StoredWorkflow.name` and the owner-scoped tag `EXISTS` (`managers/workflows.py` ~L359). The owner's annotation is shown as the card description but is never searched. So a locally curated workflow disappears when you search for words from its own description. A quick check against `test_curated_query.py` fixtures: an owner annotation containing "zebrafish", searched with `zebrafish`, returns 0 matches.

Suggested fix: add an owner-scoped annotation `EXISTS` (`StoredWorkflowAnnotationAssociation.user_id == StoredWorkflow.user_id`, same reasoning as the tag predicate) to the raw-text `raw_text_column_filter` list. It could sit next to `tag_exists_filter` in `index_filter_util` so other index queries can reuse it. Add a query test showing an owner-annotation term matches and another user's annotation on the same published workflow does not. Alternatively, if that's out of scope, narrow the advertised free-text fields and help text for local mode.

Minor, take or leave:
- The help text lists `collection:` in local mode, where it always matches nothing.
- `CuratedCollectionChips` hand-measures rows to fold to one line. A count cap like `StatelessTags`' `maxVisibleTags` would be simpler, if exact fit isn't essential.

The Converter tests failure (`CONVERTER_interval_to_bed12_0`) looks unrelated to this PR.
```

**Follow-up branch 2026-09-26:** `jmchilton:curated_workflows_followups` (stacked on `c6e70cee06a`): `4a5ba39e0a5` owner-annotation free-text search in local mode (+ `owner_annotation_exists_filter` in `index_filter_util`, 2 query tests), `08805dbacbe` collection help only in IWC mode, `d9d795974cd` collection advanced-menu item only in IWC mode (help + menu keyed off configured source), `6a79e6b0e65` Selenium integration tests for iwc + local modes (7 tests; network guard moved to `integration_setup.CuratedWorkflowsNetworkGuard`) — committed unrun, then run and polished: `e648c684f6d` moves the duplicated raw-annotation write beside the
network guard as `integration_setup.store_raw_annotation`, `da9c8282ca4` fixes the one real failure. Head `da9c8282ca4`.
Not yet a PR. Option: merge #23669 as-is, open this as follow-up.

The failure: `navigation.yml` declared `curated_advanced_search_submit: '#curated-workflows-advanced-filter-submit'`,
but `FilterMenu.vue:337` renders that button only under `v-if="props.view !== 'compact'"` and `CuratedWorkflowList.vue:240`
passes `view="compact"` — the id never exists, so the test could only time out. Fields submit the menu on enter, and
`SmartTarget.wait_for_and_send_enter` already covers that. Verified: iwc 4/4 (36s), local 3/3 (30s), API suite 25/25.

Found while fixing it, worth a line in the review if this reopens: the chip and the advanced menu write different filter
text for the same filter — `collection:'Genome assembly'` vs `collection:Genome assembly`. `curatedWorkflowFilters` builds
`new Filtering({...}, undefined, false)`, so `quoteStrings` is off and a value runs to the next `key:` token; the menu
follows that, and the chip's hardcoded `collection:'${name}'` (`CuratedWorkflowList.vue:187`) is the outlier. Both reach
the same workflows, so it is cosmetic — but a chip click leaves text in the box the user could not have typed.
