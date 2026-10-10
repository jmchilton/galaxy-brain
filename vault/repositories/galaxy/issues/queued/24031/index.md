# #24031 — Storage badge tooltips show admin message as literal HTML

https://github.com/galaxyproject/galaxy/issues/24031. Filed 2026-10-10, assigned to jmchilton.

[Proposal as posted](proposal.md) · [Debrief](debrief.md) · [Source draft](issue_draft.md)

## Summary

`ObjectStoreBadge.vue` binds `markup()` HTML to `v-g-tooltip.hover` without `.html`, so tooltips show literal `<p>…</p>`. Broken since #19521 (25.0). Separately, the `v-g-tooltip` directive (`client/packages/ui/src/directives/vGTooltip.ts`, `updateContent`) writes the raw string to `aria-label` even in `.html` mode. That affects `JobInformation.vue` `error_level` too.

## Next

Fix the badge (`.html`, stock message in its own escaped `<p>`) and the directive (in `.html` mode, take `aria-label` from the sanitized `textContent`, with spaces at block boundaries). Red first:
- the badge vitest in the issue
- a `vGTooltip.test.ts` case for `.html` `aria-label`

Watch for a happy-dom quirk: DOMPurify drops a leading bare text node.

Found by the just_jesting_around play lane (`vitest_story_play`). Once the fix lands, that lane's tooltip regex should stop tolerating tags.
