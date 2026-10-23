# Thermo-nuclear review — ag_grid_36 (post re-scope)

2026-10-22. Scope `origin/dev...f1c68b9464c` (base `0073b5e9224`). Prompt: `agents/_shared/prompts/thermo-nuclear-code-quality-review.md`. Done fresh; `earlier_drafts/1/thermo_nuclear_review.md` is the prior round.

## Verdict

No structural blockers. Net-deleting diff; v36 global setup lives in the canonical `useAgGrid.ts`; no file crosses 1k lines. The re-scope additions (E2E tests, selenium helpers, selectors) mostly reuse existing abstractions. Two small findings were fixed.

## Findings

1. **FetchGrid unit-test stub took `modelValue ?? rowData`. Fixed.** FetchGrid binds only `v-model`, so the OR let the tests pass after a revert to `:row-data`. The stub is now `modelValue`-only, and reverting FetchGrid to `:row-data` fails both tests (checked). This strengthens the test.
2. **`go_to_tool_landing` diverged from its sibling `go_to_workflow_landing`. Fixed.** It built a params list with a `bool` flag. Its shape now mirrors the sibling: `public: Literal["false","true"] = "true"`, plus the `&client_secret` append. The only caller uses the defaults, so the URL is unchanged.
3. **`ag_grid_edit_cell(grid, ...)` was untyped. Fixed:** `grid: SmartComponent`.
4. **The row-copy workarounds are still split across three consumers** (FetchGrid `v-model`, SampleSheet string key, PairedOrUnpaired write-back by id). They are now documented once in `useAgGrid.ts`. They solve different problems, so a shared helper would buy little. Recommendation: standardize the grids on `v-model`.
5. **`onSwap` finds rows by `datasets.forward.id` and casts to `GenericPair`.** That is a second identity scheme next to `getRowId`. Recommendation: have the renderer pass the row id via `context`. Not changed (scope).
6. **`as unknown as typeof AgGridVue` in `useAgGrid.ts`.** Confined to the one wrapper. Acceptable.
7. **Duplicated grid plumbing** (`:class="theme"`, `:style`, `@gridReady`) across 5 consumers predates the branch. Recommendation: a `GalaxyAgGrid` wrapper component. Out of scope.
8. `data_landing.execute: 'button#execute'` repeats the selector string of `tool_form.execute`. It is the landing's own button, so it is kept as a separate component.

## Changes

- `Tighten FetchGrid grid stub to v-model; align go_to_tool_landing with workflow landing helper` (originally `802ec2d4195`, then folded into the rewritten history; see `baseline_refactor.md`). A follow-up typing fix for `gridRows` (vue-tsc rejected `props("modelValue")` on the stub) was folded into the upgrade commit.

## Verification (final tip `8c3c513c856`)

- vitest Collections/Landing/RuleBuilder/composables: 73 files / 703 tests passed. vue-tsc clean. eslint (errors), prettier, black, ruff and isort clean.
- Red check: FetchGrid back to `:row-data` fails 2/2 FetchGrid tests.
- Playwright headless (Galaxy 8093, Vite 5193, one at a time): `test_data_landing.py` passed; `test_build_paired_list_auto_matched` passed. Selenium backend not re-run.
