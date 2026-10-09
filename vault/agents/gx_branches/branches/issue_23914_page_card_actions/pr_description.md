Fix 🎯 #23914 - a notebook card can hide its owner's "Share and Publish" button if the current user loads after the card mounts.

What a notebook card shows when the current user changes after the card mounts:

| Change after the card mounts | `dev` | This PR |
| --- | --- | --- |
| Current user loads, and owns the notebook | "Owned by …" badge goes, Share stays hidden ❌ | badge goes, Share appears ✅ |
| Current user switches to a non-owner | badge appears, Share stays ❌ | badge appears, Share goes ✅ |

Each row is a test in `PageCard.test.ts`, and both fail on `dev`.

`PageCard.vue` built its title and its action lists as plain values once at setup, while its badges were a `computed`. So the badge followed the user store and the page prop, and the buttons beside it didn't. This PR makes `title`, `primaryActions` and `secondaryActions` `computed`, as 🔀 #23909 did for the history and workflow card actions. ***`PageCard` has one caller, so the fix stays in the component, as its `badges` already does, rather than becoming a composable like #23909's. No other card on `dev` still builds its actions as plain arrays.***

***The trigger is a race that's probably rare in a browser: the user request has to come back after the notebooks list.*** It's reproduced in component tests, not in a browser, like the workflow cards in #23909.

<details><summary>The title and Edit follow the page prop too</summary>

The same change makes the title, Edit's disabled state and tooltip, and Share's visibility follow `page`. Tests rename a page (and clear its title to "Untitled Notebook") and delete and restore one; both fail on `dev`.

Rename, delete and restore can't reach a mounted card today: the list remounts on every reload, titles sync only while the editor is open, and deleted notebooks aren't listed. Those tests keep the card correct if a parent ever updates `page` in place.

</details>

***`PageCard` is only used by `HistoryPageList`, i.e. a history's notebooks list and the Reports tab of a workflow invocation. `/pages/list` is a grid and isn't affected.***

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Follows 🔀 #23909, which fixed the same pattern in `useHistoryCardActions` and `useWorkflowCardActions`. `PageCard.vue` was out of scope there.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? If the current user never loads, the card treats them as a non-owner: the "Owned by …" badge and no Share, as before.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They change the real user store and the page prop after mounting, then check the rendered card: badge, Share link, Edit's `aria-disabled` and tooltip, whether clicks emit, and the title.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `client/src/components/PageEditor/PageCard.test.ts`, new `PageCard actions` block mounted with a real Pinia user store:
  - owner loaded before mounting (control, passes on `dev`)
  - owner loads after mounting
  - user switches to a non-owner
  - page renamed, then cleared to "Untitled Notebook"
  - page deleted and restored
- The four after the control fail on `dev`. The `PageEditor` and `GCard` suites pass (178 tests).

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
