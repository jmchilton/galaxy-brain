# Component - Client Galaxy UI Components

Cover the galaxy-ui base components under `client/src/components/BaseComponents/` and `client/packages/ui` (GButton, GLink, GTooltip, `vGTooltip` directive, tooltipTiming) as a component note: props and rendered elements, how `disabled` renders (`aria-disabled` vs native), how `tooltip`/`title`/`disabled-title` work, when to use the directive vs GButton's built-in tooltip, and what the directive does to `title`. Include how E2E tests see these tooltips (`tooltip_balloon`, `get_tooltip_text`, `_clear_tooltip`, GTooltip's always-mounted `.g-tooltip`). Leave out per-component migration status.

## Why

The disabled history edit button fix needed the directive/GButton disabled-tooltip semantics and the Selenium tooltip-helper assumptions, and the only coverage is a short GButton blurb in `projects/architecture/topics/client.md` plus scattered branch debriefs.

## Requested by

- vault/repositories/galaxy/branches/active/issue_24531_edit_disabled_tooltip_26.2/brain_research.md: GButton disabled-title vs v-g-tooltip + :disabled audit and GTooltip-aware E2E helpers
