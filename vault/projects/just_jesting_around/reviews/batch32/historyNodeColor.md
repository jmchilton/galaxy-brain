# historyNodeColor

Selected originator: `client/src/components/History/Graph/historyNodeColor.test.ts`. Baseline → final: **4 → 9 tests**. Grouped cases became `it.each` rows, and one case was added.

What changed:
- The nested-ternary `getPropertyValue` mock is now a `STATE_COLOR_PROPERTIES` lookup table. It keeps `" #00ff00 "` padded, so the trim is still exercised.
- The stale comment is gone. It mentioned jsdom and was confusing about why the spy was set per test. A short comment now states the real constraint: `historyNodeColor` caches each state's color for the module's lifetime, so every test shares one set of properties.
- Because of that cache, the `getComputedStyle` spy is set once in `beforeAll`, with `mockReturnValue`, and restored in `afterAll`. Before, it was re-spied in every `beforeEach` and never restored.
- The node factory is renamed `graphNode`.
- The multi-assertion cases became `it.each` rows, and each name says the condition:
  - known-state colors: 3 rows
  - tool_request nodes: 2 rows
  - missing state: 2 rows
  - undefined custom property: 1 case

Preserved: all 8 original `historyNodeColor` expectations, with the same `src`/`state` inputs and expected values:
- tool_request with `ok` and `undefined` → null
- hda ok → `#00ff00` (trimmed), hdca error → `#ff0000`, hda running → `#0000ff`
- null and undefined state → null
- `unknown_state` → null

Added: "reads underscored states from dashed custom properties" (`failed_metadata` → `--state-color-failed-metadata`). This covers the production `replace(/_/g, "-")`, which nothing tested before.

Probes, each reverted: removing `.trim()` fails only the ok row. Removing the underscore replacement fails only the new case. Disabling the tool_request guard fails only the tool_request `ok` row.

Reuse: none applicable. `historyGraphMapper.test.ts` builds API nodes (`ApiGraphNode`), not mapped `HistoryGraphNode`s, so `graphNode` stays local. Other `getComputedStyle` workarounds in the client are visibility-related and unrelated to this.

Validation: 9 tests pass shuffled (seed `320101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Guidance: none new.
