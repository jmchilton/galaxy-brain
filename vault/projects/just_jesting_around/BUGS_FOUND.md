# Bugs found

Upstream Galaxy bugs the lanes found while converting tests. Lanes don't fix them in place; each is a candidate for its own PR off `dev`. Fetch `origin/dev` before marking one confirmed.

| Bug | Where | Found by | Status |
| --- | --- | --- | --- |
| Tooltip shows literal `<p>…</p>`: `markup()` returns HTML, but `v-g-tooltip.hover` has no `.html`, so users and `aria-label` get the tags | `ObjectStore/ObjectStoreBadge.vue` | Play lane, ObjectStoreBadges | Confirmed on dev; play regex tolerates it |
| `useConfig(true)` never loads config: the guard tests the `isConfigLoaded` computed ref (always truthy), not `.value`. Store self-loads, so only a failed initial load goes unretried | `composables/config.ts` | Story lane, InstallationSettings | Dead guard; flag dropped on branch [`use_config_drop_fetch_once`](../../repositories/galaxy/branches/active/use_config_drop_fetch_once/index.md) |
| Collapse toggle has no accessible name: icon-only `GButton` in a separated `GHeading`, so a play has to click the heading text | `Toolshed/RepositoryDetails/InstallationSettings.vue` (galaxy-ui `GHeading`?) | Play lane, InstallationSettings | Unconfirmed |
| Tooltip text joins the accessible name: `GTooltip` renders inside the button/link (`<!-- TODO: make tooltip a sibling in Vue 3 -->`), so "Create page" reads as "Create page Create a new page" and the tooltip is read again as the description | `packages/ui/src/components/GButton.vue` (any component nesting `GTooltip`) | Play lane, GButton | Same code on dev; play name regex tolerates it |
