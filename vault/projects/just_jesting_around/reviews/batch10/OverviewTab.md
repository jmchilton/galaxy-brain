# OverviewTab review

Selected originator: `lib/tool_shed/webapp/frontend/src/components/MetadataInspector/OverviewTab.test.ts`. Baseline and final: seven passed.

The typed local mount helper accepts metadata directly. Null and empty inputs use a two-row named table, retaining the exact no-metadata text assertion. Existing `MetadataJsonViewerStub` and `makeRevision()` are reused. The default-revision case retains the rendered `1.3.0` check and also checks the actual data prop against the known newest revision. Single and empty-tools revision inputs name their fixture key explicitly instead of rediscovering it through object enumeration. Revision selector existence, Add_a_column1 text and both edge-case viewer existence assertions remain.

Reuse inspected: MetadataInspector/test-utils.ts, its existing viewer-stub consumers, and __fixtures__/factories.ts. Those abstractions already cover the needed setup; no new shared factory or supporting migration is warranted. Existing Vue3 Quasar setup and auto-unmount remain. This does not add a schema fixture cast.

Evidence: `/private/tmp/jest_readability_batch10_shed_baseline.json` and `_final.json` (both suites: 27 passed; final shuffle seed 100043). Full Tool Shed `vue-tsc --noEmit`, scoped current ESLint and Prettier checks pass.

Guidance: existing readable scenarios and reuse rules were sufficient. No README or marginal advice addition.

Validation used the existing worktree and dependencies with `NODE_OPTIONS=--no-webstorage`. Source edits stay in the four selected suites; no supporting suite or new shared helper was needed.
