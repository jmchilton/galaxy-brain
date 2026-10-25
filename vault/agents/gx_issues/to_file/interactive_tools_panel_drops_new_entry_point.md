# A second interactive tool never shows in the Interactive Tools panel until reload

Found by the FAQ loop (`faqs/galaxy/interactive_tools_*.md`, 26.2) with real Docker ITs (RStudio, then Jupyter). Fix on `jmchilton/galaxy_ui_driver`, commit "Show a newly started interactive tool when others are already active" (`5e84f0ebadb` as of 2026-10-24; extract by subject). Present on `release_25.0` through `release_26.2` and `origin/dev` (checked 2026-10-24); regressed in `742a46dbed3` (2024-01, "Convert entryPointStore to composition API + TS"), so target the oldest supported release.

## Symptom

With one IT already active, launch a second. Its entry point is configured server-side (`interactivetool_entry_point.configured = 1`, job running), but the Activity Bar **Interactive Tools** panel and `/interactivetool_entry_points/list` keep showing only the first tool, through polling, for minutes. A page reload shows both. The first IT of a session always shows, because the list starts empty.

## Cause

`client/src/stores/entryPointStore.ts` `updateEntryPoints`: once `entryPoints` is non-empty, it builds the new list only from ids it already has:

```ts
if (olderEntryPoint) {
    newEntryPoints.push(mergeEntryPoints(olderEntryPoint, ep));
}
```

The JS store before `742a46dbed3` pushed `mergeEntryPoints(olderEntryPoint, ep)` unconditionally. Both the polling path and the SSE path refetch through `updateEntryPoints`, so both are affected.

## Fix

`newEntryPoints.push(olderEntryPoint ? mergeEntryPoints(olderEntryPoint, ep) : ep);`

## Tests (same commit)

- vitest `stores/entryPointStore.test.js`: "adds a newly started entry point to a non-empty list" (red before the fix: expected 2 to be 3).
- Selenium integration `test/integration_selenium/test_interactive_tools_panel.py::test_interactive_tools_panel_shows_second_tool`: stubbed entry points (no Docker), first one Running, then a second must show Running without reload. Red on the pre-fix client, green on Playwright and Selenium after. It needs the `interactive_tools_panel` navigation.yml selectors and helpers from "Test the Interactive Tools activity panel's Running status and stop button" (`4b54438b1c2`), which also moves `test_entry_point_sse.py`'s stub setup into `_base_interactive_tools.py`; extract both together.
