# Issue draft (source)

Row 1 of `vault/projects/just_jesting_around/BUGS_FOUND.md`, as of 2026-10-10:

| Bug | Where | Found by | Status |
| --- | --- | --- | --- |
| Tooltip shows literal `<p>…</p>`: `markup()` returns HTML, but `v-g-tooltip.hover` has no `.html`, so users and `aria-label` get the tags | `ObjectStore/ObjectStoreBadge.vue` | Play lane, ObjectStoreBadges | Confirmed on dev; play regex tolerates it |
