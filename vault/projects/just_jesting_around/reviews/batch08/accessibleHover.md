# accessibleHover review

Selected originator: `client/src/composables/accessibleHover.test.ts`.

Kept all three original contracts and timings: hover enter does not fire initially or just before the shared delay and fires once after it; leaving after 100 ms cancels pending enter and does not invoke exit after a further 500 ms; focus enters immediately once. Renamed the hover/focus cases around these behaviors.

Each case receives a fresh real button owned by this suite. Common element creation and lifecycle mounting are kept in the short local arrangement, and automatic unmount replaces three manually placed cleanup calls. Teardown removes only its button instead of clearing the entire document body; pending timers are discarded after lifecycle cleanup instead of executing callbacks as cleanup. Existing shared tooltip timing helpers and the production delay constant remain unchanged.

Reuse: the same helpers are already shared with the tooltip directive tests selected in this iteration. A new fixture abstraction would obscure this minimal lifecycle setup, so no helper/supporting change is introduced here.

Cases: 3 → 3. Included in the passing shuffled 25-case client run (seed 80143), scoped ESLint, and Prettier. Root performs full typing and independent review.

Guidance: lifecycle mounting and cleanup guidance already explain the required arrangement. No README or unresolved marginal advice proposed.
