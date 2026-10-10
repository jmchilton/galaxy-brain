# Debrief: object_store_badge_tooltip_literal_html

Prepared 2026-10-09. Source: `vault/projects/just_jesting_around/BUGS_FOUND.md` row 1 (Play lane, ObjectStoreBadges). The shared ledger was not moved; if this is posted, save that row as `issue_draft.md`. Proposal: `proposed_object_store_badge_tooltip_literal_html.md`. Sibling row 2 was rejected: `reject_use_config_fetch_once_guard.md`.

## Research

- Confirmed on dev df3932ed4ba. A vitest that mounts `ObjectStoreBadge` with the real `vGTooltip` fails: both the tooltip text and `aria-label` contain `<p>…</p>`. It was run in a scratch worktree, now removed.
- Adding only `.html` fixes the visible tooltip, but `aria-label` keeps the tags, because the directive's `updateContent` writes the raw string to `aria-label` in both modes. That makes it a directive bug as well, and it affects `JobInformation.vue` `error_level` (`</br>`), the only other `.html` tooltip.
- In happy-dom, DOMPurify drops a leading bare text node, so with `.html` the stock sentence disappeared from the tooltip. Not checked in a browser, and kept out of the issue. The proposed fix puts the stock message in its own `<p>`, so the problem can't arise.
- No duplicate issue found.

## Review round (subagent)

- Fixed the badge type: in the sample config, the "purged after a month" message belongs to `short_term`, not `not_backed_up`.
- Fixed the regression claim: this has been broken since #19521 (25.0, `8a00081c3ca`). That change replaced a markdown `b-popover` with `v-b-tooltip` without `.html`. It was not caused by the `v-g-tooltip` move. Verified commit diff + PR milestone.
- Added the sample's `backed_up` link message row (shows a literal `<a href>`), the history storage wizard as a location, and a note on spacing in the `textContent` label. Replaced "documented markdown" with "sample config writes markdown".

## Leftover

- Not seen in a real browser, though the play lane's browser story did tolerate the tags in its tooltip regex.
- John assignment: the bug came out of his `vitest_story_play` lane, so lean toward assigning him.
