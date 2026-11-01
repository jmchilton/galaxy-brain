---
upstream_base_branch: release_26.2
---
# Markdown editor cell menus return focus after selection

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:fix_markdown_cell_menu_focus?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/fix_markdown_cell_menu_focus)

## Status

Implemented and hardened for [#24335](https://github.com/galaxyproject/galaxy/issues/24335); blocked only on running the E2E test and screenshots on a host where a browser launches (see [implementation debrief](implementation_debrief.md)).

## Base and scope

Follow-up to [#24285](../../merged/fix_story_a11y_followups/index.md) (merged into `release_26.2`). Branched from `upstream/release_26.2` at `0fa4dc4c4fa`. The issue and review reply said `dev`, but that was about not widening the #24285 release PR. Per GX_DEVELOPMENT.md, this is a small, contained a11y bug fix, and the `close()` focus return it relies on first shipped in `release_26.2` (absent from `release_26.1`), so `release_26.2` is the oldest branch where the fix applies. John can retarget to `dev` if he prefers; the code merges forward cleanly (dev only adds `aria-expanded` to `CellAdd`'s button).
