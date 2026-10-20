# PR #24243 initial review — `default` profile

Profile `default`, Claude Opus 5.5, low effort, reviewed commit `558dfc73014103271086aa564a3dd85d100cccfc`.

Scope: the last 5 commits (`e3a282db912..558dfc73014`). The first two commits (BSpinner replacement, MaskedInput removal) belong to the open base PR #24241 and are only noted in passing below. CI was green at review time; client tests were not run locally (worktree has no `node_modules`).

## Summary

Small, well-scoped a11y change. `LoadingSpan` gets `role="status"` (plus an `sr-only` message in spinner-only mode), wrappers that duplicated that region are removed, and `GAlert` provides a `liveRegionKey` so a `LoadingSpan` inside it drops its own role. No P1 or P2 findings.

What I checked:

- **Abstraction**: provide/inject matches the existing `galaxy-ui` context pattern (`dropdownContext.ts`/`dropdownHideKey`, `checkboxGroupContext.ts`), and exporting the key from `client/packages/ui/src/index.ts` follows `dropdownHideKey`. The package is `private`, so this adds no external API. The export is needed because `LoadingSpan` lives in `client/src`, not `galaxy-ui`. Inject goes through the component tree, so it also covers a `LoadingSpan` nested inside a child component in a `GAlert` slot. The new test proves the slot case.
- **Other live regions that wrap a LoadingSpan**: of the 162 non-test files using `LoadingSpan`, none also contains `BAlert`, `aria-live`, `role="status"` or `role="alert"`. The only `BAlert`s left (`WorkflowMissingToolsRequest.vue`, `ToolInstallationRequestForm.vue`) don't wrap a spinner. `GToast` is a live region (`aria-live` + `role="alert"`) but doesn't provide the key. No toast renders a `LoadingSpan` today, so it needs no change.
- **Call sites**: `InteractiveToolFrame` and `InteractiveToolsPanel` end up with no wrapper (net vs `dev`), and the panel's separate `<p>` is folded into the message. `DiskUsageSummary`'s spinner-only `LoadingSpan` inside an info `GAlert` correctly drops its role. Screen readers will now read "Loading... Recalculating disk usage...", which is redundant but harmless.
- **Selectors**: no Selenium/Playwright selector (`client/src/utils/navigation`, `lib/galaxy/selenium`, `lib/galaxy_test`) depends on `role="status"` or on the removed markup or text. No snapshot tests exist under `client/src`.
- **Tests**: the new tests check behavior, not trivia. `LoadingSpan.test.ts` covers role, the sr-only message and suppression inside `GAlert`. `GAlert.test.ts` covers provide with `role=none`/`presentation`. `InteractiveToolsPanel.test.ts` covers the merged message. No existing tests were weakened.

## Findings

### P3 1: Spinner icon is not `aria-hidden` now that it sits in a live region

`client/src/components/LoadingSpan.vue:8`: the icon span `<span :class="spinnerClasses" title="loading">` is now inside a `role="status"` region. Under accessible-name computation its `title` can feed into the announced text, so the region may read "loading Loading...". The sibling `GButton` loading spinner is `aria-hidden="true"` (`client/packages/ui/src/components/GButton.vue:133`). The sr-only message added for spinner-only mode makes the icon redundant for assistive tech in every mode.

Suggested fix:

```vue
<span :class="spinnerClasses" title="loading" aria-hidden="true"></span>
```

### P3 2: `GAlert` reads `attrs.role` once at setup

`client/packages/ui/src/components/GAlert.vue:59-60`: `provide(liveRegionKey, !["none","presentation"].includes(String(attrs.role ?? "")))` is a one-time boolean, so a dynamically bound `role` would go stale. No call site binds `role` on `GAlert` today, so this is theoretical. If it's worth hardening, provide a `computed` and inject a `Ref<boolean>`. Otherwise leave it.

## Notes (not findings)

- `role="status"` on an element inserted with its text already present (`v-if`) is announced inconsistently across screen reader and browser pairs. This matches the old labelled `BSpinner`, so it is not a regression. The PR says it was not checked with a screen reader, so the manual test step ("Loading..." is read out) remains unverified.
- Base PR #24241, out of scope here: deleting `MaskedInput.js` leaves `imask` (`client/package.json:116`) with no importers in `client/src`. The busy `GButton` in `InstallationActions.vue` has no accessible name (spinner is `aria-hidden`, no slot or title), although the old `BSpinner small` without a label wasn't better.

## Risks

Risks are minimal. This change doesn't lock Galaxy into choices that are hard to change (a two-way door). The only new shared surface is an injection key exported from the private `galaxy-ui` package, which is easy to rename or extend.
