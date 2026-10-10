# ObjectStoreRestrictionSpan

Selected originator: `client/src/components/ObjectStore/ObjectStoreRestrictionSpan.test.js`. Baseline and final: **2 tests**.

What changed:
- The two mirror-image cases are now a two-row `it.each` table (`isPrivate`, `text`, `explanation`). The names come from the row: "labels storage as 'private' and explains it on hover when isPrivate is true".
- The shared mutable `let wrapper` and the module-level `localVue` are gone. Each row mounts with its own `global: getLocalVue()`, and gets the span once with `wrapper.get(".stored-how")`, so a missing span fails loudly.

Preserved and strengthened:
- `text()` changed from `toMatch("private" | "sharable")` to `toBe`.
- `attributes("title")` changed from `toBeTruthy()` to `toContain` of the phrase that distinguishes each explanation: "restricted to a single user" and "allows standard Galaxy sharing features". The old check passed for either title on either state.
- Probe: inverting the component's title branch (`if (!props.isPrivate)`, then reverted) fails both rows, while the original title assertions would have passed.

Reuse: `getLocalVue`. There is no shared helper to adopt. The other ObjectStore tests that render this span's context (`ObjectStoreBadges.test.ts`, `ConfigurationMarkdown.test.ts`) are owned by later lanes and were not touched.

Validation: 2 tests pass shuffled (seed `320101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Guidance: none new.
