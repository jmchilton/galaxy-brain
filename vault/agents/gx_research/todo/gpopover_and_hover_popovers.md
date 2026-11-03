# Component - GPopover and Hover Popovers

Document `GPopover` (re-exported from `@galaxyproject/galaxy-ui` via `client/src/components/BaseComponents/GPopover.vue`) and how consumers use it: trigger modes (hover, click, focus), the hover bridge so the pointer can move from the reference onto an interactive popover, open and close delays (`tooltipTiming.ts`), placement, teleport and z-index, keyboard and focus behavior, and how unit tests (`GPopover.test.ts`) and Selenium/Playwright helpers observe it.

Include a consumer table (e.g. workflow editor `Node.vue`, `DatasetPopoverLink.vue`, `ToolLinkPopover.vue`, `CellStatusComponent.vue`, storage popovers) with reference element style, trigger, whether content is interactive, and lazy-loaded content patterns.

Leave out `Popper`/`usePopper` (see the pending `popper_popovers_and_focus` request), `GTooltip` and `v-g-tooltip` (see [[Component - Galaxy UI Buttons and Tooltips]]).

## Why

The invocation graph output-preview work hangs a hover popover with heavy lazy-loaded content (datasets and collections) off graph nodes inside a transformed canvas. No note covers `GPopover`; the tooltips note explicitly excludes it and the Popper request excludes it too.

## Requested by

- vault/repositories/galaxy/branches/active/invocation_graph_output_previews/index.md: needed GPopover hover/hover-bridge behavior, placement inside a CSS-transformed canvas, and how to test hover popovers.
