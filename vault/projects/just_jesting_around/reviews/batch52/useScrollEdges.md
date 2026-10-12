Driver final gates: all four integrated suites pass (44 cases); full client vue-tsc, lint/format/hooks and exact source coverage comparisons pass. Scroll transition finding resolved and sticky-fade mutation caught; production restored. Scope unchanged.

# useScrollEdges — readability batch 52

Retained all three original edge assertions, including the same offsets and expected booleans, while making each scroll position independently named. No production, helper, supporting-test, or documentation changes were needed.

Origin: `client/src/components/CommandPalette/useScrollEdges.test.ts`. Pinned base: `2da8d6a3251dfc4e5179120b87341fa667aa7484`.

The original single scenario becomes three table cases: start (0; start fade false/end fade true), middle (100; both true), and end (200; start true/end false). Expected edge flags now have names instead of requiring readers to interpret array ordering. All cases use the original 300px content/100px viewport, actual dispatched scroll event, and the same setup wait. Existing fixed DOM metric helpers and `runInTestScope` remain, giving each independently run case its own row and effect scope. No extra local abstraction or speculative new behavior was added.

## Validation

Pinned Node, shuffle seed `520101`, and one worker: baseline passes 1/1 case; final passes 3/3 cases, without skips or unhandled errors. Paired V8 JSON reports contain four source files and exactly the same 20 covered statement/function/branch-arm source locations, with zero losses or gains. The target composable retains 11 covered statements, two functions, and four branch arms.

Canonical explicit pre-commit checks passed, including client ESLint, Prettier, whitespace, conflict, and end-of-file checks. `git diff --check` passed. Full worker client `pnpm type-check` passed (exit 0).

Evidence: `/private/tmp/readability52-scroll-{baseline,final,hooks,typecheck}.log`, `/private/tmp/readability52-scroll-{baseline,final}/coverage-final.json`, and `/private/tmp/readability52-scroll-coverage-comparison.json`.

## Guidance

Existing parameterized-test and composable-effect cleanup guidance already describes this improvement. No evidenced README gap or unresolved marginal advice was found. No E2E or screenshots apply to unchanged production behavior.

Independent challenge caught a transition regression in the initial parameterization: a fresh end-state test could miss a fadeEnd value that became sticky after scrolling. The driver now primes every case at the start, asserts fadeStart=false/fadeEnd=true, then scrolls to the named position. This retains the original end fade's true-to-false transition and adds explicit initial-state checks without scenario branches. Final canonical combined gate passes 44 cases; mutation and final type checks are recorded by the driver.
