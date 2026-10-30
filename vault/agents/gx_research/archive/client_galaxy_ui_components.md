# Component - Client Galaxy UI Components

Cover the galaxy-ui base components under `client/src/components/BaseComponents/` and `client/packages/ui` (GButton, GLink, GTooltip, `vGTooltip` directive, tooltipTiming) as a component note: props and rendered elements, how `disabled` renders (`aria-disabled` vs native), how `tooltip`/`title`/`disabled-title` work, when to use the directive vs GButton's built-in tooltip, and what the directive does to `title`. Include how E2E tests see these tooltips (`tooltip_balloon`, `get_tooltip_text`, `_clear_tooltip`, GTooltip's always-mounted `.g-tooltip`). Leave out per-component migration status.

## Why

The disabled history edit button fix needed the directive/GButton disabled-tooltip semantics and the Selenium tooltip-helper assumptions, and the only coverage is a short GButton blurb in `projects/architecture/topics/client.md` plus scattered branch debriefs.

## Requested by

- vault/repositories/galaxy/branches/active/issue_24531_edit_disabled_tooltip_26.2/brain_research.md: GButton disabled-title vs v-g-tooltip + :disabled audit and GTooltip-aware E2E helpers

## Debrief

- **Created** `vault/research/Component - Galaxy UI Buttons and Tooltips.md`, verified against Galaxy `origin/dev` @ `65e6daff`. The title narrows the request's "Client Galaxy UI Components" to what it actually covers: GButton, GLink, GTooltip, `v-g-tooltip` and `tooltipTiming`.
- **Covered**:
  - The source location: the components live in `client/packages/ui` (`@galaxyproject/galaxy-ui`). The `BaseComponents/` files are re-export shims.
  - Props, the rendered root element, and disabled rendering (`aria-disabled` only, never native).
  - The `title`/`tooltip`/`disabled-title` matrix.
  - The directive's disabled guard and how it blanks `title` (#24531).
  - When to use the directive vs the `tooltip` prop, and what each does to ARIA.
  - The E2E helper matrix: `tooltip_balloon`, `get_tooltip_text`, `_clear_tooltip`, `clear_tooltips`, `tooltip_by_id`, the always-mounted `.g-tooltip`, `data-title` selectors, and how `assert_disabled` differs between Selenium and Playwright.
- **Cross-refs**: backlinks added to `Component - E2E Tests - Writing` and `Component - E2E Tests Smart Components`, plus a pointer in `projects/architecture/topics/client.md`.
- **Research issues filed** in `research_issues/`:
  - `vgtooltip-disabled-host-silently-drops-title.md`
  - `selenium-tooltip-helpers-blind-to-gtooltip.md`
  - `assert-disabled-diverges-for-aria-disabled.md`
  - `schemaorg-glink-double-tooltip.md`
- **Out of scope**:
  - Per-component migration status, as the request asked.
  - The other G-components and GPopover/`hoverBridge`.
  - The full audit of the ~20 `v-g-tooltip` + `:disabled` GButton sites. The note gives only the count.
  - The unmerged 24531 branch changes, which the note labels as proposed.
