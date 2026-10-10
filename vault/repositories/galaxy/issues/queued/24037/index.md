# #24037 — GModal dialogs and their close button have no accessible name

https://github.com/galaxyproject/galaxy/issues/24037. Filed 2026-10-10, assigned to jmchilton.

[Proposal as posted](proposal.md) · [Debrief](debrief.md) · [Source draft](issue_draft.md)

## Summary

galaxy-ui `GModal.vue` renders a native `<dialog>` with no `aria-labelledby`/`aria-label`, and its icon-only × close `GButton` has no name. bootstrap-vue `BModal` named both, so this regressed when `GModal` came in (#20168).

## Next

Add a `titleId` (`${currentId}-title`), put it on the title `GHeading`, and set `aria-labelledby` on the `<dialog>` when there is a title. Name the close button "Close". Untitled callers (5, including `JobError.vue`) pass a plain `aria-label`, which already falls through. Red first: the `GModalAccessibleName.test.ts` repro in the issue. The scratch repro is gone; rebuild it from the issue.

decide: plain `aria-label` fallthrough (proposed) vs a typed `ariaLabel` prop (alternative; more discoverable in the published galaxy-ui package).

Found by the just_jesting_around play lane (`vitest_story_play`). Once fixed, plays can find the dialog by `{ name }`.

## Related

- #24036: also gives the title `GHeading` an id. Compatible; one id on the `<h*>` can serve both.
