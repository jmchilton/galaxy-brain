# Issue draft (source)

Row 4 of `vault/projects/just_jesting_around/BUGS_FOUND.md`, as of 2026-10-10:

| Bug | Where | Found by | Status |
| --- | --- | --- | --- |
| Tooltip text joins the accessible name: `GTooltip` renders inside the button/link (`<!-- TODO: make tooltip a sibling in Vue 3 -->`), so "Create page" reads as "Create page Create a new page" and the tooltip is read again as the description | `packages/ui/src/components/GButton.vue` (any component nesting `GTooltip`) | Play lane, GButton | Same code on dev; play name regex tolerates it |
