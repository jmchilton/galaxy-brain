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
