# Initial review: PR #24585 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5 (`claude-opus-5-5`), effort: medium
- Reviewed commit: `71178a56e3bbaee0364da447257049197fc8b990`
- PR: galaxyproject/galaxy#24585, "Add a GPagination component to galaxy-ui" (itisAliRH, base `dev`)

## Summary

The component is small and readable, and the tests check what the user sees: the rendered window, `aria-current`, disabled ends, emits, the v-model round trip, the reset-to-page-1 behavior, and focus recovery. All tests drive the DOM; none are trivial unit tests. I traced the page-window algorithm by hand for `limit` 1, 3, 4, and 5 with every combination of `firstNumber` and `lastNumber`. The item count stays constant and no ellipsis ever stands for a single page. The window, the reset watcher, and the `perPage` sanitizing match BootstrapVue's behavior. Every CSS token the component uses exists in `packages/ui/src/styles/tokens.css`. The focus ring matches `GFormInput`. I did not re-litigate the decisions the description calls out: BPagination API parity, `change` firing only on clicks, and the reset to page 1 for `:value` + `@change` sites.

I found no P1 or P2 issues. The three P3s are about scope and follow-up friction.

## Findings

### P3 1: Several props have no call site and no test

The description says the API covers what the 23 `BPagination` call sites use, including "the `*-text` and `label-*` props". Searching every `<b-pagination>`/`<BPagination>` in `client/src` finds no use of `first-text`, `prev-text`, `next-text`, `last-text`, `ellipsis-text`, `ellipsis-class`, `hide-ellipsis`, any `label-*` prop, or a function-valued `label-page`. Some of these make the component more complex without any current need:

- `hideEllipsis` changes the item count, which breaks the "the buttons do not shift" guarantee, and it has no test.
- `ellipsisText`, `ellipsisClass`, and the function form of `labelPage` are speculative.
- The `firstNumber`-only and `lastNumber`-only window paths have no test (only both-pinned is tested), even though the code branches on `lead` and `tail` separately.

Suggested fix: drop `hideEllipsis`, `ellipsisText`, `ellipsisClass`, and the function form of `labelPage` until a caller needs them. Keeping the `label*` strings is reasonable as a localization hook. Correct the description's call-site claim. Add one window test with only `firstNumber` and one with only `lastNumber`.

### P3 2: Out-of-range `limit` is quietly coerced, with semantics that differ from BootstrapVue

```ts
// 0 shows one page button, a negative limit the default of 5
const safeLimit = computed(() => {
    const limit = Math.floor(props.limit) || 1;
    return limit < 1 ? 5 : limit;
});
```

`limit` is typed `number`. The only call sites that set it pass `:limit="3"` (`ToolExecutionJobs.vue`, `ToolSuccess.vue`). With this code, 0 shows one button while -1 shows five. BootstrapVue's `sanitizeLimit` maps both to the default (`toInteger(value) || DEFAULT_LIMIT`, then `< 1 → DEFAULT_LIMIT`). Nothing can rely on the new 0→1 rule, so this keeps unsupported input alive and also diverges from the component it replaces.

Suggested fix: either clamp with `Math.max(Math.floor(props.limit) || 5, 1)` and drop the special-case comment, or match BootstrapVue (anything below 1 becomes the default). A dev-time warning would also be fine. Preferably, don't invent a third behavior.

### P3 3: The grid pager's existing test selectors won't carry over in a mechanical swap

The description says `page-class`/`prev-class`/`next-class`/`first-class`/`last-class` exist "for the grid pager's test selectors" and that the swaps "stay mechanical". But `client/src/utils/navigation/navigation.yml` also depends on BootstrapVue-only markup that GPagination does not render:

- `pager_page: '[data-description="grid pager"] .gx-grid-pager-page [aria-posinset=${page}]'`: GPagination has no `aria-posinset`; it has `data-page`.
- `pager_page_active: '... .gx-grid-pager-page.active button'`: GPagination puts no `active` class on the current page's `<li>`; it marks the page with `aria-current="page"` on the button.

`client/src/components/Grid/GridList.test.ts` (`.page-link`) and `client/src/components/Tool/ToolSuccess.test.ts` (`.page-item .page-link`) also select Bootstrap's internal classes.

Suggested fix: the description should note that the grid and ToolSuccess swaps must also rewrite these selectors. `[data-page=${page}]` and `[aria-current="page"]` are natural replacements. Adding an `active` class or `aria-posinset` only to keep the old selectors working is not worth it.

## Non-findings checked

- The focus-recovery watcher (`flush: "post"`, plus `button.disabled || !button.isConnected`) handles browsers that blur a newly disabled button as well as those that keep it as `activeElement`. The extra `await nextTick()` after a post-flush watcher is redundant but harmless.
- The reset watcher matches BootstrapVue's `pageSizeNumberOfPages` logic (page-size change with unchanged rows, or the page count shrinking below the current page). It does not fire on mount, so a deep-linked page survives an initial `totalRows` of 0.
- `compatConfig: { COMPONENT_V_MODEL: false }` matches `GCollapse` and `GCheckboxGroup`. The v-model contract is covered under compat (`vModelContract.test.ts`) and on plain Vue 3 (Tool Shed `galaxyUi.test.ts`).
- The `:where(.g-pagination)` margin baseline follows the package README's convention that a margin utility class should win (`class="m-0"`/`mb-0` appears at many call sites).
