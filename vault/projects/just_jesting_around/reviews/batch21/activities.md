# activities

Selected originator: `client/src/components/Workflow/Editor/modules/activities.test.ts`. Baseline **12 tests** → final **13 tests**.

`setUpWorkflowActivities()` takes named refs with defaults, so each case shows only the input it varies instead of five positional arguments, and returns `activityIds()` and `findActivity(id)` lookups. `bestPracticesActivityFor()` replaces the positional `makeLintData(0, 0, 2, 1)` calls with named issue counts (`{ totalAttribute: 2, resolvedAttribute: 1 }`). It builds a typed `Pick<LintData, ...>` of the four counters, which removes the `as unknown` double cast. The setup no longer passes `hasInvalidConnections`, which `SpecialActivityOptions` doesn't declare and the composable never reads, or keeps the unused `exitWorkflowActivity`. The combined danger/primary variant case is now two cases, one per indicator kind. I tried `it.each` tables, but Vitest quotes and truncates `$scenario` titles past 40 characters, so the cases stay as plain `it` blocks.

Every original scenario and assertion is still there with the same inputs and expected values: custom tools are excluded or included, the Changes indicator updates reactively (5 → 10), the Save tooltip updates reactively, the indicator is undefined / 2 / true, the variant is danger / primary, and the tooltip covers the default, singular critical, plural critical and minor wordings.

Reuse: `setupTestPinia()` from `@/stores/testUtils` replaces `createTestingPinia({ stubActions: false })`, because the activity store runs real actions and nothing spies on them. Both helpers stay local. `Lint.test.ts` and `useLinting.test.ts` build real `useLintData`, not stubbed counters, so neither would use them. No shared helper or supporting edit.

Validation: shuffled run (seed `210101`, `NODE_OPTIONS=--no-webstorage`) passes 13/13. Scoped ESLint (`--max-warnings 0`), Prettier and full `vue-tsc --noEmit` pass. No production changes.

Guidance: if the README recommends `it.each`, it could mention that `$name` titles are quoted and truncated at Vitest's 40-character default, so long scenario names are better as plain `it` blocks or `%s` tuples. Marginal.
