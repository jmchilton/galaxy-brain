Driver follow-through: the explicit detailed `type: "file"` correction was folded into `dee5138da78`, and the final canonical type check passes. The four-suite shuffled gate passes 24 cases using one worker; the reviewer-requested existing-consumer coverage union passes 14 cases at both refs and loses no covered line/branch counts across 219 source files. All approval conditions below are satisfied. No review finding was left unacted; README correction is committed at `5838667ee6e`.

# Independent focused review — batch 47

No high-conviction correctness, assertion-preservation, or maintainability findings in this batch. Code review approves the four originator rewrites and the README correction, subject to the driver's canonical verification gates and coverage-union check described below.

Scope: changes after `e1570742723b0ea164652d6d40f417a53bf4de27`, through `eb5faa5fcc9`, plus the uncommitted `client/README.md` correction. The earlier PR series was not reviewed. The driver identified a missing explicit `type: "file"` in the otherwise typed GenericItem detailed dataset fixture; its proposed correction preserves the existing runtime value and is appropriate. Verify that correction with the canonical type check before delivery.

## Assertion and boundary review

| Originator | Review result |
| --- | --- |
| JobDestinationParams | The non-empty-fixture guard, table existence, row count, recognized titles, and correctly paired values/null rendering all survive in the exact complete row matrix. Equality also rejects duplicates and checks the formerly omitted final row. Registered non-admin and unloaded-user cases add meaningful visibility coverage. The existing MSW response, real Pinia/store path, and JSON fixture remain; `satisfies` checks the existing API contract. |
| GenericItem | All initial HTTP/network failure checks, fetched-item and dataset/collection routing checks, initial-content check, 3000 ms refresh/count check, and final error/content/loading checks remain for both HDA and HDCA. Both API module boundaries, real providers/content/collection description, selective stubs, visible observer, and fake-clock operation remain. Fixtures now separate the two valid response shapes rather than mixing collection fields into an HDA or resolving an `as never` object. |
| AuthoringHelpPanel | All eight original scenarios and their 57 checks are retained; selector `get` calls strengthen required-element assumptions. Actual cancelable, bubbling DOM clicks still reach the native listener and now check prevented navigation for additional links. `openSection` is explicitly exposed for editor consumers, so invoking its typed public API is appropriate; awaiting its own promise includes its internal `nextTick`. Clipboard behavior still checks the displayed code, with descriptor restoration after every case. |
| LibraryEditField | All original sanitizer input/profile/link/emphasis and collapsed-marker checks survive in exact call matrices and required DOM selectors. Full versus truncated content and `(more)`/`(less)` contract checks add behavior coverage. Moving to shallow mounting changes no child rendered by these read-only scenarios: native markup, real linkifier, and the registered directive remain. The original sanitizer marker boundary remains, and teardown restores the captured setup-level implementation after resetting calls. |

Unmounting and restoration are deliberate: GenericItem unmounts while fake timers and the stubbed observer still exist, then restores both and clears its wrapper reference. Added auto-unmounting covers failed assertions in the other suites. No new production changes or broadened mock boundaries were introduced.

The README now matches `tests/vitest/helpers.js`: `getLocalVue()` returns global mount options, and `withPlugins` replaces matching default Pinia/router instances while retaining the other configuration. The updated examples consistently use `global` and `props`.

## Coverage review

Independently compared normalized worker hit maps. AuthoringHelpPanel and LibraryEditField lose no previously covered statement, function, or branch operand. GenericItem loses no statements or functions and exactly the two operands reported by its worker:

- `Collection/DatasetStateSummary.ts:19`, the missing-`elements_states` fallback. That remains valid for the summary class's optional input, but HDCASummary requires this field; retaining the corrected API fixture is appropriate.
- `model/states.ts:30`, the final collection-type guard operand. This is meaningful for collection elements; the old HDA reached it through an invalid collection field. Keep that field out of the HDA.

Neither loss justifies restoring an invalid API response. They still need an unchanged-consumer union check before declaring no suite-level loss. There is no direct DatasetStateSummary test, and `states.test.js` checks STATES mappings rather than these paths. `GenericElement.test.js` renders a nested collection object with `collection_type` and absent `elements_states`, making it a concrete candidate to cover both. The driver is running unchanged GenericElement and ContentItem consumers at both refs, consistent with `case_metrics.py`. The valid optional `store_times_summary: undefined` path was deliberately retained in the corrected collection fixture.

No tests were removed, skipped, weakened, or moved to a different layer. See `test_challenges.md` and `maintainability.md` for the required specialized reviews. The driver owns final execution/type/lint/format gates; this review does not claim to have run those gates itself.
