# PR #24867 initial review (default profile)

- Profile: default
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `59603c8e04222901ba5a13da34c5025e87c6be25` (single commit on `release_25.1`)
- Static review only; vitest suite not run.

## Verdict

Approve-worthy. Root-cause analysis matches the code: `TrsServerSelection.configureTrsServers()` emits `onTrsSelection` after `getTrsServers()` resolves (`TrsServerSelection.vue:76`), and the old `onTrsSelection` unconditionally cleared `query`. The fix is minimal and right-sized for a release branch. No P1/P2 bugs found. Only small P3 polish below.

## Correctness checks (no findings)

- Server switch: `onTrsSelection` clears `query` then sets `trsServer` in the same tick, so the `[query, trsServer]` watcher runs once with `query == ""` and no stale-query search goes to the new server. Good.
- Re-selecting the same server no longer clears the query. Behavior change, but sensible.
- Clear button / Esc set `query = ""`, which bumps `searchCount` and drops any in-flight response. Good.
- `params` encoding fixes the latent bug where `:`/`&`/`#` in the query corrupted the URL (`organization: x` worked only by luck).
- Reuse: `/api/trs_search` is a legacy route (`buildapp.py:671`) not in `api/schema/schema.ts`, so raw `axios` + `withPrefix` is consistent with `services.getTrsServers()`; `GalaxyApi()` isn't available here. No debounced/stale-safe search composable in `client/src/composables` fits; `BFormInput debounce` remains the debounce.
- `let searchCount` in `<script setup>` is per-instance (setup scope), not module-global. Fine.

## Findings

### P3 1 — Stale-response guard repeated three times; `finally` or Vue's `onCleanup` is tidier (optional)

`TrsSearch.vue:64-91` checks `searchId === searchCount` in three places. Vue 2.7.16 (the client's version) passes `onCleanup` to watch callbacks, which is the framework's built-in stale-async idiom and avoids the hand-rolled counter. Optional; the counter is correct.

```ts
watch([query, trsServer], async (_new, _old, onCleanup) => {
    let stale = false;
    onCleanup(() => (stale = true));
    if (query.value == "" || trsServer.value == "") {
        results.value = [];
        loading.value = false;
        return;
    }
    loading.value = true;
    try {
        const response = await axios.get(withPrefix("/api/trs_search"), {
            params: { query: query.value, trs_server: trsServer.value },
        });
        if (!stale) {
            results.value = response.data;
        }
    } catch (e) {
        if (!stale) {
            errorMessage.value = errorMessageAsString(e);
        }
    } finally {
        if (!stale) {
            loading.value = false;
        }
    }
});
```

No existing `onCleanup` usage was found in `client/src`, so keeping the counter is also defensible for a release fix.

### P3 2 — Server-switch test doesn't check that no search reaches the new server with the old query

`TrsSearch.test.ts` "clears the query when switching to another TRS server" checks only the input value. The behavior that matters with the new `[query, trsServer]` watcher is that no `trs_server=workflowhub` request goes out with the old query. Recording searches as in the first test and asserting none target `workflowhub` would pin that (the sync clear+set is batched into one pre-flush watcher run today, but nothing asserts it). Optional.

```ts
const searches: (string | null)[] = [];
server.use(
    http.untyped.get("/api/trs_consume/servers", () => HttpResponse.json(TRS_SERVERS)),
    http.untyped.get("/api/trs_search", ({ request }) => {
        searches.push(new URL(request.url).searchParams.get("trs_server"));
        return HttpResponse.json([]);
    }),
);
// ... after the click:
await flushPromises();
expect(searches).toEqual(["dockstore"]);
```

### P3 3 — Typed query shows "No search results found" before the server list arrives (optional)

With a query typed and `trsServer == ""`, the watcher sets `loading = false` and `results = []`, so the template falls to `No search results found, refine your search.` (`TrsSearch.vue:196`) until the servers load. Short window, cosmetic; leaving `loading` true (or a "waiting for TRS server" branch) when `query` is set but `trsServer` isn't would avoid a misleading message. Optional.

## Notes (not findings)

- `errorMessage` is never cleared on a later successful search (pre-existing; the PR only guards stale errors).
- Tests use real-timer waits (~1.2 s total) for the 500 ms `BFormInput` debounce; acceptable, fake timers would be faster but interact awkwardly with msw/flushPromises.
- Release-branch scope is appropriate: fixes a CI-flaky selenium test with a small, contained change.
