- **thermo_review P3 1: FilterMenuBoolean should use the sibling `propValue`/`localValue` pattern.** Disproved, because that pattern would regress the component.
  - FilterMenu mutates its `filters` computed object in place. A cached `computed(() => props.filters[name])` doesn't re-run after the mutation, so when `filterText` changes back to a value equal to the stale cache, the watch never fires.
  - Scratch test (not committed):
    1. Open HistoryFilters with the deleted default "No".
    2. Stage "Any".
    3. Change `filterText`.
  - With the PR's watch on object identity, the choice goes back to "No". With the sibling pattern it stays on "Any".
  - So the default review's "matches the siblings" claim holds in purpose but not in shape. The PR's version is the correct one. The same staleness in FilterMenuInput/Dropdown is pre-existing code.
- **default P3 1: single-select drilldown radios become unreachable by Tab when the selected option is collapsed.** Disproved in current Chromium.
  - Test page: a static group of same-name radios with the checked one inside `display:none`.
  - Tab lands on the first visible radio of the group. This was checked in the Playwright MCP Chromium.
  - The P2 1 refactor doesn't change this behaviour either way, since all radios still share one name.
  - Not checked in Firefox or Safari.
