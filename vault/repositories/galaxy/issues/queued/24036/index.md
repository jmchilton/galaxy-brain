# #24036 — Collapsible Heading toggle has no accessible name or expanded state

https://github.com/galaxyproject/galaxy/issues/24036. Filed 2026-10-10, assigned to jmchilton.

[Proposal as posted](proposal.md) · [Debrief](debrief.md) · [Source draft](issue_draft.md)

## Summary

The icon-only `GButton` collapse toggle in galaxy-ui `GHeading` (imported as `Common/Heading.vue`) has no name and no `aria-expanded`. The clickable heading text is mouse-only. Affects 7 `collapse=` consumers, all in the separator layout. Unnamed since #16983 (24.1); #19990 (25.0) kept it unnamed when it swapped in `GButton`.

## Next

Give the heading a `useUid("g-heading-")` id (or the consumer's `id` when passed), and add `aria-labelledby` and `aria-expanded` to the toggle. Red first: the `GHeading.test.ts` repro in the issue (both layouts). The trial `fix.diff` lived in the scratchpad and is gone; rebuild it from the proposal.

Found by the just_jesting_around play lane (`vitest_story_play`). Once fixed, `InstallationSettings.stories.ts` can open the section by button name instead of clicking the heading.

## Related

- GModal accessible-name proposal (`to_file/proposed_gmodal_dialog_unnamed.md`, unposted): also passes an `id` to its title `GHeading`. Compatible; one id on the `<h*>` can serve both.
