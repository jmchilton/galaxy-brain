# Interactive Tools panel drops a newly started tool when another is already active

**Title:** Interactive Tools panel doesn't show a second interactive tool until page reload

---

When one interactive tool is already running, a newly launched one never appears in the Interactive Tools panel (or the `/interactivetool_entry_points/list` page) until the page is reloaded.

| Step | Server (`interactivetool_entry_point`) | Interactive Tools panel |
|---|---|---|
| Launch RStudio | RStudio configured, job running | RStudio ✅ |
| Launch Jupyter | RStudio + Jupyter configured, both running | RStudio only ❌ (stays this way through polling, for minutes) |
| Reload page | unchanged | RStudio + Jupyter ✅ |

The first interactive tool of a session always shows up, so the bug is easy to miss. Anyone running two at once loses the link to the second one.

Reproduced with real Docker interactive tools (RStudio, then Jupyter) on 26.2. The same code is on `release_25.0` through `release_26.2` and `dev`.

## Cause

`updateEntryPoints` in `client/src/stores/entryPointStore.ts` replaces the store with a list built only from entry points it already knows about once the store is non-empty. Ids it doesn't know about are dropped:

```ts
if (olderEntryPoint) {
    newEntryPoints.push(mergeEntryPoints(olderEntryPoint, ep));
}
```

The length change sets `hasChanged`, so the store is rewritten, but without the new entry. Polling and SSE updates both go through this function.

## Context

Regression from 🔀 #17356 (entryPointStore converted to composition API + TS). The JS store before it pushed every entry point it received. Affects the panel added in 🔀 #19996.

## Proposed Approach

Keep entry points the store doesn't know yet:

```ts
newEntryPoints.push(olderEntryPoint ? mergeEntryPoints(olderEntryPoint, ep) : ep);
```

<details><summary>Tests</summary>

- vitest (`stores/entryPointStore.test.js`): "adds a newly started entry point to a non-empty list". Red before the fix (expected 2 to be 3).
- Selenium/Playwright integration test (`test/integration_selenium/test_interactive_tools_panel.py`). Uses stubbed entry points, no Docker. The first is Running, then a second must show Running without reload. Red on the pre-fix client.

Target the oldest supported release branch.

</details>

## Alternative Approaches

We could drop the merge and assign the server list directly, as the empty-store branch already does. Entry points have no client-only fields (every `EntryPoint` field comes from `/api/entry_points`), so the merge only keeps fields the server stopped sending, such as an optional `target`. That is cleaner and suits `dev`. The one-line fix restores the pre-#17356 behavior with the smallest change, so it's the better release-branch fix.
