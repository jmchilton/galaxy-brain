Opening the Workflow Invocations list fires 165 `/api/` requests, and the workflow list fires one extra request per card, so a single page load can trip a server's API rate limit.

Browser requests logged over the Chrome DevTools Protocol while loading pages on test.galaxyproject.org (one logged-in browser, nothing else on the account, pages 30 s apart):

| Page | `/api/` requests | Peak in 1 s | 429s |
|---|---|---|---|
| home | 24 | 24 | 0 |
| workflow list (~25 workflows) | 48 | 48 | 1 |
| workflow editor | 21 | 21 | 0 |
| workflow run form | 32 | 32 | 0 |
| **Workflow Invocations list** | **165** | **84** | **96** |
| tool form | 28 | 27 | 0 |

test.galaxyproject.org's nginx allows `/api/` 4 r/s with a burst of 40 per API key / session cookie. Opening Workflow Invocations once gets **96 requests rejected**, and the workflow list hits the limit with no other activity. The rate limit lives in deployment config, not here. Galaxy's part is that its own client sends far more requests than these pages need. Most of them repeat a request that is already in flight.

| Cause | Where | Seen as |
|---|---|---|
| 🔁 Every invocation row's state badge loads the full datatype list, with no in-flight dedupe | `stores/helpTermsStore.ts`, `components/Upload/utils.js` | `/api/datatypes?extension_only=false` ×62 on the invocations list |
| 🔢 Every workflow card fetches its own invocation count | `components/Workflow/List/useWorkflowCardBadges.ts` → `stores/invocationStore.ts` | `/api/workflows/{id}/counts` per card |
| ♻️ Keyed-cache stores retry a 429 right away, without backoff | `composables/keyedCache.ts`, `utils/simple-error.ts` | up to 4 attempts per item while already rate limited |
| ❓ `workflows/{id}?instance=true` repeats per workflow | `components/Grid/configs/invocations.ts` → `stores/workflowStore.ts` | ~4× per workflow on the invocations list |

🔁 duplicate in-flight request · 🔢 N+1 · ♻️ amplifies under 429 · ❓ cause not yet pinned down

<details><summary>The datatypes fan-out, as a call tree</summary>

```text
GridInvocation → GridList (25 rows)
  per row: state column, type "helptext" (configs/invocations.ts)
    <HelpText>                      mounts <HelpPopover> once its span ref is set
      <HelpPopover> → <Popper>      slot is rendered eagerly (v-show), not on hover
        <HelpTerm term="galaxy.invocations.states.<state>">
          useHelpForTerm()
            helpTermsStore.ensureInitialized()      guarded only by `initialized`, set after await
              datatypeStore.fetchUploadDatatypes()
                Upload/utils.loadUploadDatatypes()  guarded only by `_cachedDatatypes`, set after await
                  GET /api/datatypes?extension_only=false
```

All 25 rows mount before the first response arrives, so both guards are still empty and every row sends its own request. The terms are `galaxy.invocations.states.*`, which come from the bundled help YAML. They never needed datatypes. The full datatype list is only used for `galaxy.datatypes.extensions.*` terms. The 25 rows explain 25 of the 62 requests. Where the other 37 come from (re-renders re-mounting `HelpTerm` is the likely source) isn't pinned down. Either way, nothing coalesces concurrent calls.

</details>

<details><summary>The workflow-list N+1</summary>

`useWorkflowCardBadges` reads `invocationStore.getInvocationCountByWorkflowId(workflow.id)` per card. That is a `useKeyedCache` over `fetchInvocationCount`, which calls `GET /api/workflows/{workflow_id}/counts` and sums the per-state counts into one number. A page of ~25 cards means ~25 extra requests on top of the page's ~24 base requests (48 total, all within one second).

If those count requests get a 429, `useKeyedCache.getItemById` re-fires the fetch on each re-evaluation while `retryCounts[id] <= MAX_RETRIES` (3). 429 is in `RETRYABLE_STATUSES`, and there is no delay or `Retry-After` handling, so a rate-limited page sends more requests.

</details>

<details><summary>Rate-limit config on test.galaxyproject.org (galaxyproject/infrastructure-playbook, <code>templates/nginx/galaxy_test.j2</code> at <code>8e96583</code>)</summary>

```nginx
limit_req_zone $rate_limit_key zone=relaxed:10m rate=8r/s;
limit_req_zone $rate_limit_key zone=strict:10m rate=4r/s;
...
location /api/ {
    limit_req zone=crawler burst=10 nodelay;
    limit_req zone=strict burst=40 nodelay;
    limit_req_status 429;
```

The key is `X-API-Key` if present, otherwise the session cookie, so the browser's requests all share one bucket. Other public servers may be tuned differently. Any deployment that follows a similar recommendation (see #20017) will see the same thing.

</details>

<details><summary>Measurement notes</summary>

- Noticed while driving test.galaxyproject.org (26.2, commit `67c3f964d355`) with a browser automation tool. The table counts only the browser's own requests, and the tool's own API calls were logged separately. Plain page loads include none of them.
- An idle page sends nothing. All the bursts happen at page load.
- Counts are browser requests whose path starts with `/api/`, on any host. Test's Sentry DSN points at `sentry.galaxyproject.org` and the client sets no Sentry `tunnel`, so Sentry's `/api/2/envelope/` posts match the filter but go to another host. A few of those may be in the counts. None of them use test's bucket.
- The code paths above were checked at both `67c3f964d355` and current `dev`. The help-term, datatype, keyed-cache and invocation-count code is the same in both.

</details>

## Context

Same class of problem as 🎯 #19876 (invocation step view fired 188 requests). Related to 🎯 #20017 (formalizing API rate-limit recommendations) and 🎯 #21886 (retry handling in `useKeyedCache` stores; its fix, 🔀 #21920, made 429 retryable but added no backoff).

## Proposed Approach

Make each page's request count independent of row count. Have one shared in-flight promise for the datatype list in `loadUploadDatatypes` / `helpTermsStore.ensureInitialized`, and only load datatypes for `galaxy.datatypes.extensions.*` terms. Have the workflow list get invocation counts in its index request instead of per card. Have `useKeyedCache` back off on 429 and honor `Retry-After` instead of retrying immediately.

<details><summary>Checklist</summary>

- [ ] `Upload/utils.js`: cache the in-flight promise, not only the result, in `loadUploadDatatypes` (and `loadDbKeys`, same pattern).
- [ ] `helpTermsStore.ts`: dedupe `ensureInitialized` with a promise. Don't load datatypes at all for YAML terms. Load lazily when a datatype term is looked up.
- [ ] Optionally have `HelpPopover` mount `HelpTerm` on first show instead of eagerly for every `HelpText` on the page.
- [ ] Workflow list: return invocation counts from `GET /api/workflows` (opt-in, like `skip_step_counts`) or from one batch endpoint keyed by workflow ids. Seed `invocationStore` from that.
- [ ] `keyedCache.ts`: on 429, wait before retrying (exponential, or `Retry-After`). Don't retry on every getter re-evaluation.
- [ ] Find why `workflows/{id}?instance=true` repeats on the invocations list even though `fetchWorkflowForInstanceId` dedupes in-flight. It may be a failed fetch that is never recorded (it throws before clearing `workflowDetailPromises`), followed by re-asks.
- [ ] A regression check: request count for the invocations list and the workflow list does not grow with page size.

</details>

## Alternative Approaches

Raising or exempting the nginx limits would hide the symptom for one server, but every deployment would still pay for the extra requests. Retrying 429s globally in the API client keeps the page working, but under load it sends even more requests. A client-wide concurrency limiter would smooth the bursts, but each page would still send 165 requests. Removing the duplicates fixes the cause, and it helps every server whether or not it rate-limits.

<details><summary>Alternatives In Detail</summary>

### Alternative: Raise or exempt the rate limit in deployment config

<details><summary>Description</summary>

#### Details

Raise the `/api/` burst on test (and other servers) above the biggest page burst, or exempt the endpoints that fan out.

#### Why the proposed approach is preferred

It belongs to the infrastructure repo, not Galaxy, and it only fixes the servers that change. The burst grows with page size (rows × requests), so any fixed limit can be exceeded again. The server still does the duplicate work.

</details>

### Alternative: Generic 429 retry/backoff in `GalaxyApi()`

<details><summary>Description</summary>

#### Details

Wrap the openapi-fetch client so any 429 is retried with backoff.

#### Why the proposed approach is preferred

Worth doing as a safety net, but it only spreads 165 requests out over time. Page loads get slower instead of failing, and the redundant requests remain. It complements the dedupe and doesn't replace it.

</details>

### Alternative: Client-wide request concurrency limiter

<details><summary>Description</summary>

#### Details

Queue all `/api/` requests behind a small concurrency cap.

#### Why the proposed approach is preferred

It hides N+1 patterns instead of removing them, and it slows down requests that matter (the grid data) behind ones that don't (62 copies of the datatype list).

</details>

</details>
