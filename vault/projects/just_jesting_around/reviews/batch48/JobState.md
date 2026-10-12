# JobState — readability batch 48

Originator: `client/src/components/JobStates/JobState.test.ts`.
Worker commit: `5f5d6f9ba1c` (base `5838667ee6e1d2f89bf995f9eb6fab0ebabd5472`).

The test now mounts through native VTU2 `props` and `global: withPlugins(...)`, seeds the explicitly selected Pinia store, and validates the full-job fixture with `satisfies ShowFullJobResponse`. Required badge and stop controls use `get`. The terminal-state loop becomes four separately named cases. The pending DELETE uses the existing shared `deferred<void>()` helper and an awaited click. `enableAutoUnmount(afterEach)` stops each component after its case.

## Assertion audit

All 12 original executed assertions remain: rendered running badge text; running base-job stop visibility; absence for each of ok/error/deleted/failed; matching full-job owner visibility; mismatching owner absence; unloaded user absence; DELETE job ID; disabled class while pending and its absence after completion. Original real GButton, HTTP boundary, and response behavior are preserved. No production or shared helper files changed and no tests were skipped or weakened.

## Validation

- Baseline: 8 cases passed.
- Final: 11 cases passed with shuffled seed 480101 and `--maxWorkers=1`; the increase is the four terminal states replacing one loop case.
- Baseline/final V8 coverage: 169 source files each, no previously covered statement/function/branch operand lost at any location. JobState.vue remains 23/24 statements, 6/6 functions and 13/14 branch operands.
- ESLint and Prettier passed. Explicit canonical pre-commit config passed all applicable checks. Git diff whitespace check passed.
- Pinned Node via `npm_config_use_node_version=$(cat .node_version)` and native warning opt-out; no named Vitest project or NODE_OPTIONS override.
- Logs: `/private/tmp/readability48-job-baseline.log`, `/private/tmp/readability48-job-final.log`, `/private/tmp/readability48-job-hooks.log`; JSON artifacts `/private/tmp/readability48-job-{baseline,final}-coverage/coverage-final.json`.

The first baseline command was sandbox-blocked while writing Vite's cache through the shared node_modules symlink; the escalated rerun passed. A command issued before the edit succeeded also ran unchanged baseline code; the reported final run followed the actual edit. Neither failed or stale attempt was counted as final validation.

## Guidance and shared setup

Existing README scenario naming and native mounting guidance directly address the original unnamed loop and adapter-dependent mounting. Existing auto-unmount and deferred helpers address this file without new shared abstractions. No new cross-file setup need, marginal guidance, or uncovered behavior was identified. Scope stays on the originating file; full-job and base-job API models remain distinct in the tests.
