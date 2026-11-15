Run via Claude Opus 5.5 at high effort.

# Performance challenges debrief: wes_api_fixes_26_0 (re-scope pass)

Process: `vault/agents/_shared/GX_PROCESS_CHALLENGE_PERFORMANCE.md` with a BRANCH_DIRECTORY, run fresh against `63bb73b0cf6` on `release_26.0` (`9ae7ab9c1df`). Scope: what the branch changes, in `lib/galaxy/webapps/galaxy/services/wes.py` and `WorkflowInvocation.to_dict` in `lib/galaxy/model/__init__.py`. The first pass's debrief, which covers the five original fixes, is in [earlier_drafts/1/performance_challenges_debrief.md](earlier_drafts/1/performance_challenges_debrief.md).

## Summary

Nothing needed fixing, so no code changed. Head is still `63bb73b0cf6`. The re-scope adds no queries, no loops over rows, no endpoints and no response fields. The empty-token change doesn't add a real load risk. Most of this is reasoned from the code. The one piece of data is a survey of how real WES clients page, using the stage 7 client captures in `~/projects/repositories/galaxy-wes-tes`. Nothing was timed or query-counted, because the diff makes the before/after obvious and a measurement wouldn't change the decision.

## Re-scope changes

### Empty `next_page_token` (`e49a657a63b`)

The question is whether a client that echoes `""` back, which decodes as "no cursor" (`KeysetPagination.decode_token` returns `None` for any falsy token), could re-fetch page 1 forever.

- **Which clients would loop.** Only a client whose stop test is `token is not None` loops on `""`. Before the branch, a spec-following client whose stop test is `token != ""` would have looped on `null` the same way. Galaxy's own schema (`RunListResponse.next_page_token`) and the WES spec both say `""` means the end. So the change moves the hazard from clients that follow the spec to clients that don't. That's a net improvement, not a new risk.
- **Data: real clients.** Every client in the project's tooling and stage 7 survey stops on either value or doesn't auto-page. `scripts/wes_client.py` (`task_pages`), `runs/stage7/wes-clients/conformance/capture.py` and `scripts/wes-probes.sh` stop on a falsy token, and `capture.py` also caps itself at 50 pages. The wes-service CLI prints only the first page, and the sapporo CLI `list` prints the token without following it. The ELIXIR web component pages only when the user clicks Next. None tests `is not None`. Stage 7 conformance and schemathesis flagged the old `null` as a schema violation.
- **Cost if a client did loop.** Each page-1 request is bounded. `list_runs` runs one keyset `SELECT` joined to `History` on `user_id`, with `ORDER BY id DESC LIMIT page_size + 1` (`page_size` ≤ 100 at the API layer). `_invocation_to_run_summary` reads only columns that are already loaded, so there are no per-row queries. `get_run_tasks` page 1 is the same `LIMIT`ed UNION plus the batch load it already did on every page. A runaway loop costs what any tight polling loop on these endpoints costs. Defending against it is the rate limiter's job, not this endpoint's.
- **Why not reject an incoming `""`.** Rejecting it would break clients that send an empty `page_token=` as their "first page" default. That pattern is common in form-encoded and generated clients, and it's what the branch's docs and pagination test already cover. The docs now say to stop paging on an empty token.

Verdict: no change.

### `NoReplacement` → `null` in `WorkflowInvocation.to_dict` (`1cc7902ccd1`)

The native invocations API reaches this mapping, so it gets a closer look. The mapping lives in the `view == "element"` branch, inside a loop over `self.output_values` that already existed. It adds one `isinstance` check and one `dict.get` per workflow parameter output, usually a handful, with no queries. The `collection` view that list endpoints use doesn't reach it. `null` is a little smaller than the two-key marker dict. Storage, `serialize()` for model-store export and workflow recovery don't go through `to_dict` and are unchanged.

### `_require_user` and auth before token decode (`f60452053c8`)

`_require_user` is an attribute read. Moving the check ahead of `decode_token` in `list_runs` means an anonymous request with a junk token now skips a base64 and JSON decode. Authenticated requests do the same work as before. `_get_invocation` still checks before its lookup, so anonymous run-scoped requests run no query, as in the first pass. Encoding ids for the error messages only happens on error paths.

### `auth_instructions_url` (`63bb73b0cf6`)

`trans.url_builder("/", qualified=True)` is string building on `GET /service-info`, with no I/O. It's negligible.

### The five original fixes

Their non-test code hasn't changed since the first pass, apart from the `_require_user` fold above. The first pass's conclusions still hold. Validation before import and the terminal-state cancel early return remove work. `_discard_rejected_submission` adds one rollback and at most two small `UPDATE`s, and only on a request that is already failing.

## Out of scope (pre-existing, not made worse)

- `_get_invocation` checks ownership through `invocation.history.user_id`, which lazy-loads the history: two queries where one join would do.
- `to_dict(view="element")` lazy-loads `workflow_output` per output value, dataset and collection association (N+1). It also serializes the whole invocation on every `GET /runs/{id}`, so the cost grows with workflow size.
- The `list_runs` query plan for users with very many invocations (a backward walk of `workflow_invocation.id` filtered through the `History` join) hasn't been checked against a production-size database. The branch doesn't change the query.

## Tests run

None. No code changed. The test-challenge pass ran every affected WES test and the native `test_workflow_omitted_optional_parameter_output_is_null` green at `63bb73b0cf6` ([test_challenges_debrief.md](test_challenges_debrief.md)). The worktree is clean on `wes_api_fixes_26_0` at `63bb73b0cf6`.
