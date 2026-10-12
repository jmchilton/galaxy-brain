# WindowManagerWindow — readability batch 57

Kept all six original pointer scenarios and all 22 assertion lines verbatim. The tests now mount with native `global: withPlugins(...)` and `props`, explicitly obtain their store from the owned testing Pinia, and dispose it on test completion. Required interaction targets use `get` for clearer missing-element failures.

Registered automatic unmounting after pointer-stub restoration so reverse-order `afterEach` teardown removes active drag/resize document listeners first, including when an assertion fails. The pointer-capture stub restores the exact original own-property descriptor, or removes only the property introduced by the test. Only this owned mock's history is cleared. Review also identified the store's native 200ms save timeout, which Pinia disposal does not cancel. Each scenario now uses fake timers and clears pending timers before restoring real timers after unmounting, preventing delayed local-storage writes from escaping the test.

Preserved resize capture, drag capture, post-pointerup inactivity, cancellation, controls preventing drag, second-pointer isolation, and focus behavior for pointerdown plus compatibility mousedown. No production, supporting test, shared helper, dependency, or README edits.

Validation: pristine Vitest passed 6 cases with shuffled seed 570101; the final review fix passed all 6 with seed 570201. Full client type checking, file ESLint and Prettier, and explicit repository pre-commit gates passed. All 22 original assertion lines compare identically and in order. V8 covered-source-location comparison retained every original covered statement/function/branch-arm location: 19 files, 237 before, 240 after, 0 lost, 3 added. The additions are the `onBeforeUnmount` callback and its two cleanup statements in WindowManagerWindow.vue, lines 184–187.

Evidence: `/private/tmp/readability57-window-before.log`, `/private/tmp/readability57-window-after.log`, `/private/tmp/readability57-window-typecheck.log`, `/private/tmp/readability57-window-hooks.log`; coverage JSON directories `/private/tmp/readability57-window-before` and `/private/tmp/readability57-window-after`.

Guidance: current README plugin ownership and teardown ordering guidance already covers this change. Descriptor-preserving method stubs are a concrete local cleanup detail, not a reason to add general advice or a shared abstraction.
