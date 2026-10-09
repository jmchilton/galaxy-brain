# ReviewCleanupDialog

Reviewed `client/src/components/User/DiskUsage/Management/Cleanup/ReviewCleanupDialog.test.ts`: **5 → 5 cases**.

The tests now describe table loading, selection, the confirmation dialog, the deletion agreement, and the emitted selection. Typed mounts expose `openModal()` without `any`; the existing `#confirmation-modal`, typed with the `GModal` component, identifies the intended modal instead of selecting the second child. The real table, checkbox, button, and modal mount remains because the tests exercise their interactions. Each mount receives fresh local plugins and is automatically unmounted.

Every original assertion remains represented: table presence and exactly two rows; delete-button disabled and enabled classes; closed then open confirmation; disabled then enabled confirmation after agreement; no event before confirmation and exactly one afterward. The final event assertion also verifies both selected item objects. The old `modalStatic` option is removed: `ReviewCleanupDialog` declares only `operation` and `totalItems`, and its `GModal` implementation has no static-modal prop; this was an unused fallthrough attribute.

Reuse: the existing `getFakeCleanableItem` still supplies the same IDs, names, sizes, type, and timestamp. A typed `getFakeCleanupOperation` in the same `test-utils.ts` removes repeated operation metadata and empty implementations in this file and the concrete supporting consumer `CleanupOperationSummary.test.ts`. The selected suite creates a fresh operation per scenario; its successful summary (1024 bytes, two items), item list, and cleanup result remain explicit.

Supporting migration: `CleanupOperationSummary.test.ts` retains all four cases and every assertion unchanged. The successful operation still returns its original 1024-byte/two-item summary, empty fetch-items result, and full cleanup result; the empty operation preserves its zero summary/items/result and metadata; the error operation preserves all three original synchronous error messages. Only the operation construction changes. Its inventory counter stays unchanged.

Guidance decision: the README's existing factory, meaningful helper, typed response, interaction, and event guidance covers these changes. No new shared mount abstraction or README paragraph is warranted.

Validation: supporting baseline **4/4**; final shuffled affected component group **13/13**, seed **90117**, including this suite **5/5** and the supporting suite **4/4**. ESLint passes with zero warnings and Prettier passes across all five group files. Evidence: `/private/tmp/jest_readability_batch09_cleanup_summary_baseline.json`, `/private/tmp/jest_readability_batch09_components_final.json`, `/private/tmp/jest_readability_batch09_components_lint.log`, and `/private/tmp/jest_readability_batch09_components_prettier.log`. Root owns the final full-client typecheck and independent review.
