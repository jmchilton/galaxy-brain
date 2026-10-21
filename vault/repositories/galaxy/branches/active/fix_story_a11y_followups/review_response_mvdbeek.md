# mvdbeek review response (2026-10-21)

mvdbeek approved `fabcc827831`, with one inline edge case and three optional nits. No design contention. The fixes are in `bec70dfdd80` (additive commit, no history rewrite). Drafted replies are below; none are posted.

## Acted on

- **Inline: Escape in a hover popover with no focusable reference.** Escape now leaves a non-click popover open when nothing can take focus back. The check applies the same tabbable filter to `referenceEl`, so a non-focusable external reference is covered too. Affected today: `UploadExtension` and `UploadSelectExtension` (bare `FontAwesomeIcon` refs). The Close button still closes in that case, because that's an explicit dismissal. Red-to-green tests cover the slot reference and the `referenceEl` case.
- **Nit: `close()` bypasses `usePopper` timers.** Added a `hide()` to `usePopper`, which clears both delays, and `close()` uses it. The existing document, element and Escape handlers are left as they are to keep the release diff small.
- **Nit: focus target can pick a disabled or `tabindex=-1` element.** Candidates are now filtered with `tabIndex >= 0 && !matches(":disabled")`. A red-to-green test covers it.

## Not acted on

- **Follow-up: Markdown menu item selection loses focus** (`CellAction` sets `visible` directly, and `CellAdd` closes through `.popper-close` delegation). This is outside the diff, and fixing it would widen a release-branch PR. The `pr_description.md` claim was narrowed to Escape and Close. The follow-up is [#24335](https://github.com/galaxyproject/galaxy/issues/24335), assigned to John.

## Drafted replies

Inline reply on `client/src/components/Popper/Popper.vue` (comment 4337989321):

> Good catch, thanks. Fixed in bec70dfdd80: Escape now leaves a hover popover open when its reference can't take focus back. That check also covers a non-focusable `referenceEl`. `UploadExtension` and `UploadSelectExtension` are the current cases. The Close button still closes there, since that's an explicit dismissal. There are tests for both the slot and `referenceEl` cases.
>
> ***Posted by model Opus 5.5 on jmchilton's behalf***

Review-level reply:

> Thanks for the review. On the nits:
>
> - `close()` now goes through a new `hide()` from `usePopper`, so the open and close timers are cleared. I left the existing handlers alone to keep the release diff small.
> - The focus target now skips disabled and `tabindex="-1"` controls, with a test.
> - Markdown menu selection focus: agreed that it doesn't go through `close()`. I opened #24335 to fix it on `dev` rather than widening this release PR, and narrowed the description to Escape and Close.
>
> ***Posted by model Opus 5.5 on jmchilton's behalf***
