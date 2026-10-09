# Tooltip directive review — iteration 08

Selected originator: `client/src/directives/vGTooltip.test.ts`. Baseline and final: 13 cases.

Mount minimal typed directive callers instead of manually building sparse `DirectiveBinding` objects and casting undefined to a VNode. Vue now supplies the real binding and lifecycle arguments. Automatic unmount covers every caller, including an assertion failure; preserve fake-clock cleanup and the existing tooltip timing helpers. A documented test-only `vue/one-component-per-file` exception permits these distinct minimal callers without asserting component options to object.

Keep five plain-button cases: no tooltip immediately/on the last pre-delay tick, visible after the final tick; early mouseleave cancellation at the original 100/500 ms advances; native title suppression/restoration; immediate focus display; and visibility after a normal button click. Keep three controlled-value cases: false→true→false plus exact title content, initially true display, and hover display surviving an unrelated false-value rerender. All original timing and output expectations remain.

Keep five menu cases: focused closed-toggle visibility then click dismissal; real GDropdown hover display then click dismissal and suppressed focus in its open item; naming the icon-only toggle rather than its host, preserving the name through the dropdown rerender, and removing that generated name on actual wrapper unmount; preserving a text toggle's lack of redundant label and an explicitly labelled toggle's Upload name; and suppression of both hover/focus display while the menu is already expanded. The real GDropdown/GDropdownItem integration remains mounted because these contracts depend on the directive and dropdown's shared interaction, matching the existing test scope.

Reuse existing hover-delay helpers. The directive callers are local to this subject and no second consumer needs their arrangement. Existing README guidance covers component-context harnesses and the integration exception to shallow mounting; no new shared abstraction, README addition or marginal advice is proposed.

Validation: all 13 cases pass in both normal and shuffled six-suite runs. Scoped current-config ESLint, Prettier and full client types pass. Results: `/private/tmp/jest_readability_batch08_stores_final.json` and `/private/tmp/jest_readability_batch08_stores_shuffled_final.json`, all 107 cases passing with seed 80109.
