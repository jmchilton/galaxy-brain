# Review 2 (post re-scope) debrief

The review found no bugs. I acted on two of its nits in a4d12ab8b42:
- **Selector:** `navigation.yml` `workflow_card_button` never matched: the id sits on the button itself, and the button no longer has a `title`. It is now `button[id^="g-card-action-"][data-title=...]`.
- **Test:** a new GCard vitest checks that a disabled primary or secondary action carries its title in an `aria-describedby` GTooltip. It fails 2 of 25 against base `GCard.vue` and passes with the fix.

Not acted on: Python E2E code reading `.text` on GCard buttons could pick up the hidden tooltip text under Playwright. The reviewer found no such call site. The E2E run covers the history and workflow list tests.

<details><summary>Review</summary>

- **Verdict:** mergeable.
- **`data-title`:** GButton drops the native `title` when `tooltip` is set, so the switch to `data-title` in `JobInformation.test.js` is correct.
- **Selectors:** the GCard and rule builder selectors use ids or classes, not `title`. The XPath `text()` patterns match only the button's own text nodes.
- **Vitest:** the related tests pass (20 files, 174 tests).
- **Localization and layout:** unchanged. The `menu-option` div keeps the same shape, and `TooltipOnHover` had no other users.

</details>
