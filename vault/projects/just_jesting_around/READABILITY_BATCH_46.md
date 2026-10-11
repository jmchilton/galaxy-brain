# Readability batch 46

Four originators drawn with seed `2610946`; three done, one test per commit, then one range review. DataDialog was abandoned for a production bug. [Manifest](readability_batch_46.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| GalaxyAI `agentTypes` | Fallback and model-name cases are `it.each` tables (the split adds the cases). The empty response is one `toEqual` on the whole object instead of five field checks; the fixture is typed `AgentResponse`. [Review](reviews/batch46/agentTypes.md). | 16 → 19 |
| VegaWrapper | A static import with `vi.mocked(embed)` replaces per-test dynamic imports and three `as any` casts; the mock view lives in `vi.hoisted`, with a `mountVegaWrapper` helper. Exact embed calls, alert text, `finalize` once, and two embeds on a spec change (was `toBeGreaterThan`). New: the resize observer applies the container width with `fillWidth` and leaves it alone without. [Review](reviews/batch46/VegaWrapper.md). | 4 → 6 |
| Workflow Editor Node | `mountNode` takes options; `withPlugins` plus `provide` keeps the Portal stubs; Pinia and connection-store seeding still run before mount. The config try/finally became a `toolRecommendations` option; `enableAutoUnmount`, `SELECTORS`. `Node as any` is gone. After review, the tool and subworkflow steps are complete typed `Step` literals. The only cast left is on the missing-tool step, whose `errors` the server sends as a string though `Step` types them `string[]`. New check: the `is-active` class. [Review](reviews/batch46/Node.md). | 8 → 8 |

## Abandoned: DataDialog

`DataDialog.vue` watches `() => history`, which isn't declared in the component and resolves to `window.history`, so changing the `history` prop never reloads. A throwaway probe showed only the mount's request after `setProps({ history: "h2" })`. The code is the same on fetched dev, and the bug dates from `3342bec7bed`. Recorded in [BUGS_FOUND.md](BUGS_FOUND.md). The test stays eligible, and its [abandon note](reviews/batch46/DataDialog.md) has notes for whoever picks it up. Its `vi.mock("app")` hasn't been checked as dead.

## Reuse and follow-through

Follow-ups:
- `NewStep.errors` is typed `string[] | null` while `ToolModule.get_errors` sends a string. That's a type-only production mismatch, kept out of this lane.
- The test setup has no global MSW server, so a component that fetches on mount without a `useServerMock` handler hits `localhost:80`. It prints `ECONNREFUSED` after the run summary and the test still passes; seen with DataDialog.

Guidance: none.

## Validation and review

33 cases across 3 suites pass; the baseline was 28. Each commit's test passes at that commit, shuffled with seed `460101`; full client vue-tsc, ESLint, Prettier and hooks pass. Per-test coverage at the batch base and the tip: no source file lost covered lines or branches (155 compared). The [independent review](reviews/batch46/review.md) approved two commits and asked Node to replace its `partialStep` cast helper with complete typed fixtures; that fix was folded into its commit.

Commits: `ef8caa4bc3e` (agentTypes), `dd1cede660c` (VegaWrapper), `d49bea20fac` (Node).
