# Bugs found

Upstream Galaxy bugs the lanes found while converting tests. Lanes don't fix them in place; each is a candidate for its own PR off `dev`.

| Bug | Where | Found by | Status |
| --- | --- | --- | --- |
| Tooltip shows literal `<p>…</p>`: `markup()` returns HTML, but `v-g-tooltip.hover` has no `.html`, so users and `aria-label` get the tags | `ObjectStore/ObjectStoreBadge.vue` | Play lane, ObjectStoreBadges | Confirmed on dev; play regex tolerates it |
| `useConfig(true)` never loads config: the guard tests the `isConfigLoaded` computed ref (always truthy), not `.value` | `composables/config.ts` | Story lane, InstallationSettings | Confirmed on dev |
