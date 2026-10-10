# requirements

Selected originator: `client/src/components/Markdown/Utilities/requirements.test.js`. Baseline **16 tests**, final **28 tests**.

Tests that bundled several `expect` calls are now `it.each` tables with one row per input, so a failure names the tool or object type that broke. Test names state behavior and condition. The `hasValidLabel` labels fixture moves to a module-level `WORKFLOW_LABELS` constant and each scenario passes its args inline. The leftover Jest `{ virtual: true }` option on `vi.mock` is dropped because Vitest ignores it. The mock still applies, since the fake `tool_*` names don't appear in the real YAML.

All original inputs and expected values survive. The `getRequiredObject` and `hasValidName` cases are table rows with the same inputs and expectations. `getRequiredLabels` now takes object types directly instead of going through `getRequiredObject(tool)`. The known-type rows keep the same expected labels. The original "none" and "unknown" cases both resolved to `null`, so they become a single `getRequiredLabels(null)` case. Tool-to-object resolution is still covered by the `getRequiredObject` tests, and `hasValidLabel` still exercises the composed path for both a 'none' tool and an unknown tool. The old "at least one label present" case is renamed "exactly one matches" to fit the `matchCount === 1` implementation. The new both-match rejection case pins down that rule. Another new case checks an object type that has no label requirements (`history_id`). All four `hasValidObject` scenarios are kept, including the collection and implicit-collection-jobs fallbacks.

Reuse: this is a pure module test with no API, store or component setup. No shared helper applies and none was added.

Validation: 28 tests pass shuffled (seed `220101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint (`--max-warnings 0`) and Prettier pass. Full `vue-tsc --noEmit` passes.

Guidance: none. The README's "Readable Test Scenarios" `it.each` advice covers this change.
