Run via claude-opus-5-5 at default effort.

# Thermo-nuclear code quality review

**Verdict:** approve after one small fix (applied in `1d935c72d14`). Diff is small and moves call sites onto GButton's built-in `tooltip`/`disabled-title` instead of `v-g-tooltip` - the canonical abstraction, so the core change is the code-judo move already. No file-size or layering issues.

## Acted on

1. **WorkflowPublishedButtons: stale hand-rolled disabled title.** The edit button switched to `tooltip` but kept `editButtonTitle`, a nested-if computed duplicating what `disabled-title` does. Its anonymous branch was dead: anonymous users fail `matchesCurrentUsername`, so `sharedWorkflow` is true and the Import button renders instead. Replaced with static `title` + `disabled-title`, computed deleted. Same pattern as ContentOptions now.
2. **`get_tooltip_text` duplicated tail.** The new GTooltip branch copied the `click_away`/return tail. Collapsed to if/else computing `text`, one shared tail.

## Not acted on

- `editDisabled` inline state list in ContentOptions duplicated by the test's `NOT_EDITABLE_STATES` - pre-existing; extracting a shared constant is scope creep for 26.2.
- Selenium GTooltip detection via `aria-describedby` + `.g-tooltip` is selector-coupled to galaxy-ui internals; acceptable as transitional dual path while `v-g-tooltip` and GTooltip coexist.
- HistoryNavigation/MultiviewPanel conversions are pure migration, no notes.

## Validation

`vitest run ContentOptions.test.ts src/components/Workflow/Published` - 7 passed. Pre-commit (black, ruff, flake8, prettier, eslint) passed. Selenium not run per instructions.
