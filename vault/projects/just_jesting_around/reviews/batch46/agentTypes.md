# agentTypes

Selected originator: `client/src/components/GalaxyAI/agentTypes.test.ts`. Baseline **16 tests** → final **19 tests**.

The fallback cases (unknown, undefined, empty string) for `getAgentIcon` and `getAgentLabel` are now `it.each` tables, and `formatModelName` is one table whose rows name the behavior and show the input. The known-label case that asserted three agents in one `it` is split into one row per agent; the two-assertion provider/model case is split the same way. That accounts for the three extra cases.

Every original input and expected value survives as a row. The empty-response case checks the whole object with one `toEqual` instead of five field checks, which also catches extra keys. The provided-response case keeps its identity (`toBe`) check and now types the fixture as `AgentResponse` instead of `as const` on one field.

Reuse: none needed; these are pure functions with no setup.

Validation: 19 pass shuffled (seed `460101`); ESLint, Prettier and full `vue-tsc` pass. Per-test coverage of `agentTypes.ts` unchanged.

Guidance: none.
