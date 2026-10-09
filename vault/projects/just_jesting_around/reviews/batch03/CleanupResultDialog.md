# CleanupResultDialog: iteration 03

Selected originator: `client/src/components/User/DiskUsage/Management/Cleanup/CleanupResultDialog.test.ts`.

The four cases already separate loading, complete failure, partial success, and success. Retain that structure; simplify the setup instead of introducing a case table.

- Keep failure and partial-success inputs beside their assertions. Remove uppercase function constants, the `undefined` alias, and the zero-filled result object that repeats the constructor defaults. Retain the successful-result helper because the loading transition and success case both use it.
- Replace full mounting with `shallowMount`, while rendering the real `GTable` to preserve the existing row assertion and verify the actual item/reason cells. Default-slot rendering from `getLocalVue()` preserves the dialog and alert content. Other child behavior is outside this suite.
- Create a fresh local Vue configuration per mount and use `enableAutoUnmount(afterEach)`. Remove `flushPromises`: this component consumes synchronous props/computed values; the loading transition awaits `setProps`.
- Preserve every existing assertion's behavior. Change the error-message check from HTML to visible text, and row length to `toHaveLength`. Add literal freed-space expectations (`512 b`, `1.5 KB`) and exact error-table cells (`Dataset X`/`Failed because of X`, `Dataset Y`/`Failed because of Y`). The original partial-success test's name promised the amount and item errors, while it checked only presence and row count.

## Reuse implemented

`Cleanup/test-utils.ts` now exports `getFakeCleanableItem(overrides: Partial<CleanableItem>)`. Its complete typed defaults match all seven repeated item records across this suite and two concrete neighboring consumers. Keep identifying names/IDs explicit in each consumer. The fixed `update_time` replaces an unused wall-clock value; item sizes remain 512 bytes and types remain `dataset`. Overrides apply last and each call produces a fresh object.

Supporting migrations only change imports and item declarations in:

- `CleanupOperationSummary.test.ts`: four cases and seven assertion statements unchanged.
- `ReviewCleanupDialog.test.ts`: five cases and eleven assertion statements unchanged.

Do not advance either supporting suite's inventory counter. Their operation stubs and mount behavior differ, so extracting a shared operation/mount abstraction would add indirection without removing meaningful duplication.

## Validation and preservation

Baseline: selected suite 4/4 passing; both supporting suites 9/9 passing. Final: all three suites, 13/13 passing with `NODE_OPTIONS=--no-webstorage pnpm exec vitest run <three paths> --maxWorkers=1`.

Selected assertion statements: 16 → 19. All four scenarios and their original conditions/positive and negative assertions remain. Supporting assertion statements: 18 → 18, with no changes to test bodies, operation methods, selected counts, sizes, totals, or error messages. Total: 34 → 37.

Scoped ESLint passes with two existing `any` warnings in the supporting `ReviewCleanupDialog` suite; those are outside its fixture-only migration. Prettier check passes for all four changed files. Final test log: `/private/tmp/batch03_cleanup_final.log`. Supporting baseline: `/private/tmp/batch03_cleanup_support_baseline.log`.

## Guidance

No README addition recommended. Existing guidance already covers scenario-local inputs, typed shared factories, selective stubbing, cleanup, visible output, and awaiting the relevant operation. This suite supplies a concrete selective-stubbing example: render the table because the parent test promises real row output, while stubbing the surrounding modal/alerts through their default slots. This does not warrant another generic rule.
