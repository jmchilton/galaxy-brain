Driver final gates: all four integrated suites pass (44 cases); full client vue-tsc, lint/format/hooks and exact source coverage comparisons pass. Scroll transition finding resolved and sticky-fade mutation caught; production restored. Scope unchanged.

# SectionPatchView — readability batch 52

Origin: `client/src/components/PageEditor/SectionPatchView.test.ts`.
Base: `2da8d6a3251dfc4e5179120b87341fa667aa7484`.
Commit: `2919ec8bd88e419fce98ee76d926c8b0fc6d76b2`.

## Changes

Replaced the legacy component cast/localVue/propsData mounting form with native props/global options. Override types derive from the actual component's props. The repeated baseline text fixtures name the original/proposed sections, and scenario names state the count, selection state, or action being checked. Repeated action selectors are named constants. Required clicks and attribute access use `get`; explicit presence assertions retain `find(...).exists()` as required by VTU typing. Every instance auto-unmounts.

Retained full rendering: the reject event test still clicks the real child GButton rather than emitting a synthetic child event. The explanatory mount comment remains. All eight original cases and nine executed checks survive, including two changed sections, singular/zero counts, button presence and disabled state, exactly one reject event, nonempty diff lines, and two per-section statistics blocks.

## Verification

- Exact pinned baseline and final: eight passing cases with shuffled seed `520101`, one worker; no skipped cases or unhandled errors.
- Paired V8 JSON: 15 source files and all 166 covered statement/function/branch source locations identical; no losses. SectionPatchView retains 33 covered statements, 15 functions, and 24 branch arms.
- Full worker `vue-tsc --noEmit` passed with exit 0.
- Targeted Prettier/ESLint and explicit canonical pre-commit checks passed. `git diff --check` passed.
- Logs: `/private/tmp/readability52-patch-baseline.log`, `/private/tmp/readability52-patch-final.log`, `/private/tmp/readability52-patch-typecheck.log`, `/private/tmp/readability52-patch-hooks.log`.
- Coverage artifacts: `/private/tmp/readability52-patch-baseline/coverage-final.json`, `/private/tmp/readability52-patch-final/coverage-final.json`.

Only the selected origin test changed. No production, helper, supporting tests, or dependencies changed. The driver retains final integrated gates.

## Guidance

No new README or marginal advice proposed. Existing scenario, typed native setup, and cleanup guidance covers this rewrite; full rendering already has a concrete button behavior justification. Screenshots or new E2E cases would not verify a changed product behavior because this commit only reorganizes existing unit checks.
