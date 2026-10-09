Toward 🎯 #23977 - space out the client's 429/5xx retries and stop fetching data pages don't show.

On a server that rate-limits `/api/` (test.galaxyproject.org: 4 r/s, burst 40), opening the Workflow Invocations list sent 165 requests and got 96 × 429 (#23977). Galaxy's client made that worse in two places. The `GalaxyApi` 429 middleware retried every rejected GET after exactly 1 s, three times, so a burst that tripped the limit came back as the same burst 1 s, 2 s and 3 s later; this is where the issue's `workflows/{id}?instance=true` ×4 per workflow comes from. On top of that, the keyed-cache, history and collection stores retried a failed item on every getter re-evaluation with no delay. While those retries were going on, views showed an error that was still being retried, a blank rerun form or a missing dataset attribute instead of a spinner.

| Behaviour (vitest, fake timers) | `release_26.1` | This branch |
|---|---|---|
| 3 concurrent GETs get 429; when do they retry? | 1000 / 1000 / 1000 ms (lockstep) | 500 / 750 / 1000 ms (jittered) |
| One GET keeps getting 429; retry times | 0, 1, 2, 3 s | 0, 1, 3, 7 s (exponential) |
| `Retry-After` longer than 5 s (middleware) | waits it out, then retries | returns the 429 |
| Keyed-cache item fails with 429, getter re-read | refetches at once (up to 4×) | waits a jittered 1–2 s, 2–4 s, … backoff |
| Invocations grid reloads while histories fail | 4 history requests | 2 |
| Invocation view while a 429/5xx is being retried | error alert at once, retries continue behind it | "Loading invocation" until retries run out |
| Workflow panel / others' (shared, published) / anonymous / step-count cards | one `/counts` per card | none |

Every row is a test on this branch that fails on `release_26.1` at that assertion.

***This is the retry half of #23977. The per-row `/api/datatypes` requests are fixed in the sibling 🔀 #23995, and the two merge in either order. Owned cards on "My workflows" still fetch `/counts` one by one; batching those needs a new API field, so it's a separate `dev` change, and #23977 stays open until then.***

***Two retry layers on purpose: the middleware retries a 429 GET up to 3 times over ~3.5–7 s, then the gated stores retry the item up to 3 more times after 1–2, 2–4 and 4–8 s. A persistently rate-limited item still costs at most 16 requests, as on `release_26.1`, but spread over ~20–40 s instead of ~12 s, jittered so concurrent items don't retry together, and respecting `Retry-After`. Dropping 429 from the store layer would undo #21920's fix for #21886.***

***Client-only, with no API or backend change. `useRetryGate` replaces three hand-copied `retryCounts` blocks rather than adding a new mechanism.***

***`ObjectPermissions`, `HistoryExport` and `DatasetPopoverLink` change only because store behaviour they rely on changed: concurrent `fetchWorkflowForInstanceId` callers now all reject on failure, `getHistoryLoadError` hides an error while its retry is pending, and the popover reads through the getter so it refetches after backoff.***

***Nothing was re-measured against a rate-limited server; the numbers above come from the unit tests, not a live page.***

<details><summary>What changed</summary>

- **Rate-limiter middleware** (`api/client/rateLimiter.ts`): jittered exponential backoff (base 1 s, ×2 per retry, cap `maxRetryDelay` 5 s); honors a numeric `Retry-After` and gives up when it exceeds the cap; an HTTP-date `Retry-After` no longer retries instantly; returns the last 429 when retries run out, keeping its `Retry-After`.
- **`useRetryGate`** (`composables/retryGate.ts`, new): per-id failure counts plus a scheduled jittered backoff (base 2 s, cap 30 s). It reports loading while a retry is pending and hides an error until it's final. It replaces three hand-copied `retryCounts` blocks in `useKeyedCache`, `historyStore` and `collectionElementsStore`.
- **`simple-error.ts`**: shared `parseRetryAfterMs` / `retryBackoffMs`, and `apiErrorFromResponse` so `ApiError` keeps `Retry-After` (used by the history and collection services).
- **Loading instead of blank / not found** while a retry is pending: `WorkflowInvocationState`, `WorkflowRerun` (which also renders the form after failing to switch history, with the existing "Unable to switch" toast), markdown `HistoryDatasetDetails`, `DatasetPopoverLink` (reads the dataset through the store getter while shown and drops a history preload nothing used). `HistoryExport` uses the error `loadHistoryById` now returns, so a 503 still shows its error.
- **Workflow instance fetches** (`workflowStore.fetchWorkflowForInstanceId`): uses `dedupeInFlight` from `utils/sharedPromise.ts`, so concurrent callers share a failure instead of the second one silently resolving with no data. Invocation grids load histories only through the gated getter and catch fire-and-forget workflow fetches (as does `ObjectPermissions`).
- **Workflow cards** (`useWorkflowCardBadges.ts`): the count is read only when a count badge can show, so hidden badges no longer fire `/counts`.
- `utils/sharedPromise.ts` is byte-identical to the copy in #23995 so either merges first; `memoizeUntilRejected` is used there, `dedupeInFlight` here.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). Errors on persistently failing requests now take longer to appear, by design: ~20–40 s for a 429 (was ~12 s), 7–14 s for a 5xx (was near-immediate).

## Context

Follows 🔀 #21920 (made 429 retryable in keyed-cache stores for 🎯 #21886, without backoff) and 🔀 #21286 (added the 429 middleware on 25.1). Same class of problem as 🎯 #19876. Sibling of 🔀 #23995 (datatypes fan-out). On `dev`, 🔀 #23510 makes slowapi rejections return a 429 with `Retry-After`, which both layers honor.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? While a 429/5xx retry is pending, a loading spinner instead of a blank form, a missing attribute or an error that is then retried; once retries run out (or `Retry-After` exceeds the cap), the existing error alert.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They count requests at the mock server, time retries under fake timers and check rendered loading/error state; all but the new-utility tests (`retryGate`, `sharedPromise`) fail on `release_26.1`.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None; no workflow semantics change. Workflow-related views (invocations grids, invocation view, rerun, workflow cards) only change how they fetch and what they show while retrying.
- [x] Who hits this in practice and what is the evidence? Logged-in users on servers that rate-limit `/api/`; #23977 measured 96 × 429 on the invocations list on test.galaxyproject.org, including `instance=true` ×4 per workflow, which a browser console log traced to the lockstep retries.
- [x] Were simpler or existing approaches considered? Yes. Fixing only the fan-out (leaves the lockstep 1 s retries behind `instance=true` ×4 re-bursting the limiter), dropping 429 from the store retries (regresses #21886), and a backend counts field (an API addition, so `dev`).

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] Instructions for manual testing are as follows:

<details><summary>Tests and manual check</summary>

- `rateLimiter.test.ts` "retry timing": jitter across concurrent 429s, exponential spacing, `Retry-After` (numeric, HTTP-date, unparseable, above cap), last 429 returned.
- `retryGate.test.ts`, `keyedCache.test.ts` "retry backoff", `historyStore.test.ts`, `collectionElementsStore.test.ts`: no refetch during backoff, reactive refetch after it, loading while pending, error hidden until final, `Retry-After` kept.
- `invocations.test.ts`: failing histories aren't re-requested on reload during backoff; failed workflow fetches don't leak unhandled rejections.
- `workflowStore.test.ts`: concurrent callers share a failure; a later call refetches.
- `useWorkflowCardBadges.test.ts`: no `/counts` for hidden runs, others' workflows, anonymous users, or step-count cards.
- `WorkflowInvocationState`, `WorkflowRerun`, `HistoryDatasetDetails`, `DatasetPopoverLink`, `HistoryExport` tests: loading during backoff, the right result after.

Manually (needs a real 429/5xx source, e.g. nginx `limit_req` with `limit_req_status 429;` in front of Galaxy; devtools request blocking gives a network error, which keyed-cache stores treat as final):
1. Rate-limit `/api/` and open the Workflow Invocations list with the network tab open. Retried `workflows/{id}?instance=true` requests are spread out instead of arriving in waves 1 s apart.
2. Make `/api/invocations/{id}` return 503 for the first request (devtools local override or a proxy rule), then open that invocation. It shows "Loading invocation" for a few seconds, then the invocation, instead of the error alert.
3. Open the workflow panel in the editor. No `/api/workflows/{id}/counts` requests.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
