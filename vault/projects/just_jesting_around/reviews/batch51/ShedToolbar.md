Driver final gates: integrated client14cases + own ToolShed4cases pass, corrected full client vue-tsc and own ToolShed types/lint/format/hooks pass. Final typing corrections independently approved; scope unchanged.

# ShedToolbar — readability batch 51

Originator: `lib/tool_shed/webapp/frontend/src/components/ShedToolbar.test.ts`.
Base: `3fea81e4cd891cb7956898210def1d9bd50a7285`.
Worker commit: `cacd7c8773a460dcf018dc182c42167664a330d0`.

The four scenarios and all nine original assertion sites remain unchanged: Explore's three exact destinations; logged-out login destination, accessible label, absent logout and sole Explore menu; ordinary user's exact two destinations, absent login and one logout call; admin's exact two destinations. Existing full rendering exercises the shared dropdown and routing behavior, so shallow mounting would remove the behavior these assertions cover. Existing `createMemoryRouter` reuse remains.

The helper now accepts a typed `Pick<UserV2, "username" | "is_admin">` instead of an unrestricted record. The comment states its intentional partial user seam: authentication setup is stubbed and the toolbar consumes only those fields. Every mount creates, passes and queries its own explicit Pinia, instead of relying solely on an ambient beforeEach store. Native `props` and `global` options were already correct.

Each mount now owns a dedicated attached host, tracked before mount so it is removed even if mounting fails. Same-scope stacked afterEach hooks automatically unmount wrappers before deleting only those owned hosts and restoring store spies. The previous wrappers were never unmounted and left their rendered roots in document.body. The original guard for required named menu toggles and `get` queries remain.

## Validation

Own Tool Shed Vitest 3.2.7 runner, setup, Quasar installation, node_modules and formatting were used, with pinned Node 22.20.0. Baseline and final each pass 4/4 cases in shuffled order (seed 510101, maxWorkers=1), without skips or unhandled errors. Coverage comparison normalizes exact statement, function and branch-arm source locations rather than aggregate percentages: both reports contain 90 source files, with no previously covered location lost. ShedToolbar.vue retains 86 covered statements, one function and 14 branch arms. This normal Tool Shed coverage scope omits files outside its root.

Matching coverage-v8 3.2.7 remains solely in `/private/tmp/readability49-toolshed-coverage`; temporary config `/private/tmp/readability51-toolbar-coverage.config.mjs` imports this worktree's unchanged Tool Shed configuration and resolves that provider. No repository dependencies, lockfiles or runner configuration changed.

Own Tool Shed `pnpm typecheck`, ESLint and Prettier all pass. Explicit canonical pre-commit checks pass; canonical client ESLint skips Tool Shed files, so the own Tool Shed ESLint result supplies that check. `git diff --check` passes and worker tracked state is clean after commit.

Logs: `/private/tmp/readability51-toolbar-{baseline,final,typecheck,eslint,prettier,hooks}.log`. Coverage JSON: `/private/tmp/readability51-toolbar-{baseline,final}-coverage/coverage-final.json`. Exact location comparison: `/private/tmp/readability51-toolbar-coverage-comparison.json`.

## Guidance and scope

Existing README fixture typing, meaningful full mount and teardown dependency guidance covers this change. Existing memory-router abstraction is already adopted; no concrete new shared helper or additional guidance is justified. No supporting test, production file, dependency, lockfile, ledger or published helper commit changed. No browser/E2E validation is needed for this test-only cleanup. No security findings.
