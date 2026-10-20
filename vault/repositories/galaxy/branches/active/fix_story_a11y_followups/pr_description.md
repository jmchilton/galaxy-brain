Fix two keyboard and screen-reader defects found by Storybook accessibility checks: the GalaxyAI send button has no name, and closing a popover loses keyboard focus.

| | Before | After |
| --- | --- | --- |
| GalaxyAI chat send button | Icon only, so a screen reader announces just "button" | Named "Send message" when ready, empty, busy or disabled |
| Escape in a click popover, e.g. the Markdown editor's add-cell search box | Popover closes, focus is lost | Popover closes, focus returns to the button that opened it |
| Escape in a hover popover with focus inside | Nothing happens | Popover closes, focus returns to its trigger |
| Close control in a titled popover header | Clickable `<span>`, unreachable by keyboard | Native `<button type="button">` named "Close", with a visible focus outline |

![Keyboard focus on the popover Close button](screenshots/a11y-popper-close-focus.png)

***Both defects are in shipped components; the Storybook checks only found them.*** ***The focus fix covers every classic `Popper`, including the Markdown editor's add-cell and cell-action menus.*** ***Focus moves back only when it was inside the popover***, so a popover closing never takes focus from somewhere else on the page.

No app component sets a Popper `title` today, so the new Close button isn't visible anywhere yet. ***The `title` prop exists today and renders a control keyboards can't reach; this makes it safe to use.***

***Only the classic `Popper` changes. `GButton`/`GTooltip` tooltips are untouched, and hover popovers still don't open on keyboard focus.***

<details><summary>Implementation</summary>

- `ChatInput.vue` adds `aria-label="Send message"` to its icon-only `GButton`.
- `Popper.vue` gets one `close()` that hides the popover and, if focus was inside it, focuses `referenceEl` or the first focusable element in the reference slot. The header button's click and an Escape keydown on the popover both call it. `usePopper`'s existing document Escape listener still runs afterwards and only re-hides an already hidden popover.
- The Close button resets Bootstrap's global button padding, border, background and active shadow so it keeps the icon's look. It adds a 2px `currentColor` outline on `:focus-visible`.
- A commented `eslint-disable` covers the Escape listener on the popover container, which is not itself interactive.

</details>

<details><summary>Validation</summary>

- Five related client suites pass (76 tests): `ChatInput`, `Popper`, `usePopper`, `CellAdd` and `GButton`. The full client type check, ESLint (no new warnings) and Prettier also pass.
- The new accessible-name, native button and focus-return tests fail on the base at those assertions. On the base, the hover Escape test fails because the popover stays open. The `CellAdd` test fails because focus stays on the hidden search input. Leading commit `bb7bfb7703d` adds baseline tests for chat busy recovery and untitled popovers, which pass on the base.
- In headless Chromium with Galaxy's production CSS, mounting the real components:
  - Tab reaches Close, and Enter or Space closes the popover and returns focus to its trigger.
  - Escape from a link inside the popover does the same.
  - Holding Space keeps Close's look unchanged.
  - A surrounding form records no submissions.
  - Send keeps its name in all four states, and Enter submits once.
- These browser checks were run on `dev` before retargeting, on the real components outside the app, so the Markdown editor menus were covered only by the `CellAdd` unit test. The rebase onto `release_26.2` replayed both patches unchanged, and the unit, type and lint checks were rerun there.

</details>

## Risks

Risks are minimal: these are local, keyboard-only UI corrections that are easy to revert (a two-way door).

<details><summary>Risk Details</summary>

- Hover popovers now close on Escape when focus is inside them. The hover consumers that can hold focusable content are `LoginRequired` and `UploadExtension` (links), and `HelpPopover` (links in help markdown). All are informational.
- The Close button's reset styles are scoped to `Popper.vue`. `CellAdd.vue` also uses a `popper-close` class, as `usePopper`'s click-to-close hook, and isn't affected by these styles.
- When the reference slot has no focusable element, closing still works, but focus is not returned.

</details>

## Context

The defects were found by Storybook axe checks on 🌿[vitest_story_a11y](https://github.com/jmchilton/galaxy/tree/vitest_story_a11y), a reference-only prototype. Alternative kept on 🌿[fix_story_a11y_followups_alt_original_scope](https://github.com/jmchilton/galaxy/tree/fix_story_a11y_followups_alt_original_scope): it returns focus only from the Close button and leaves Escape unchanged. Shared `GButton`/`GLink` tooltip naming is a separate issue from these checks and is not changed here.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the chat name and the native Close button, and add matching Escape focus return.</summary>

The scope grew once, to give Escape the same focus return as Close. Shared tooltip naming and focus-triggered opening were left for separate work because they would change shared component APIs. Splitting into two PRs was offered but not recommended.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approved with no structural changes requested.</summary>

A native button avoids custom Enter/Space handling and tabindex code. One local `close()` handles both dismissal paths without extending the `usePopper` API. The send button's name lives in `ChatInput`, the component that owns its meaning. All touched files stay under 250 lines.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Each new test checks rendered behavior, and none was dropped or weakened.</summary>

Tests read accessible names and `document.activeElement` from the real `GButton` and `Popper`, with no new mocks. They cover a wrapped trigger and an external `referenceEl`, and confirm focus outside the popover stays put. Server-backed tests would add nothing, since no server code changes.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>No refactor was needed; baseline tests are in their own leading commit.</summary>

The accessible name, native control, focus styling and shared close handler are all part of the fix itself. There was nothing behavior-preserving to split out first.

</details>

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The popover still closes. Without a focusable trigger, focus isn't returned, as before.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They check accessible names, `document.activeElement` and visibility through the real `GButton`.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes, `bb7bfb7703d`.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Automated tests</summary>

`client/src/components/GalaxyAI/ChatInput.test.ts`, `client/src/components/Popper/Popper.test.js` and `client/src/components/Markdown/Editor/CellAdd.test.js`.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
