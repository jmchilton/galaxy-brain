# WorkflowRunInputStep — readability batch 49

Originator: `client/src/components/Workflow/Run/WorkflowRunInputStep.test.ts`.
Base: `e1f3ed5dce2da8ccd93324fd6b536db3269a8810`.
Worker commit: `e229696b401ad564c3e9c6e128dd94bca4198b4b`.

## Changes and assertion audit

A narrow local step model uses canonical FormInputNode[] and replaces arbitrary override records. The fetched dataset uses the existing getFakeDatasetSummary factory. Required form/card boundaries use getComponent and the fetched-input assertion uses the existing nth helper. nextTick replaces instance-specific scheduling. Native props/global mounting was already present and remains intact; this suite supplies no replacement plugins, so withPlugins is unnecessary.

All nine original cases and all 19 original assertion sites remain: local input shaping and step label; replacement inputs; absent-form placeholder; exact change and validation emissions with step index; collapsed/expanded card; validation-driven expansion and scroll payload; search request and exact shaped options/metadata; debounce absence before advancement, one request afterward and final query/default page size; cancellation after explicit unmount. The options and metadata checks now assert their complete objects, retaining the original exact hda arrays and metadata while rejecting extra entries.

The FormDisplay double retains its public input props/event seam. FormCard remains real. Nothing invokes private implementation methods. Cleanup restores the per-test service implementation, unmounts all wrappers before clearing pending timers/restoring the real clock, and flushes the completed debounced search. Auto-unmount registration occurs after clock cleanup because installed Vitest executes afterEach in reverse registration order. The explicit cancellation test still advances the clock after unmount and checks the service was never called; cleanup does not substitute for that assertion.

## Validation

- Baseline and final: 9 cases passed, no skips. Final shuffled seed 490101, maxWorkers 1; pinned Node, no project or NODE_OPTIONS override.
- V8 coverage: 17 source files and 156 covered statement/function/branch locations in both runs. Normalized source-location comparison found zero lost locations. WorkflowRunInputStep.vue retains 55/59 statements, 23/24 functions and 33/43 branch operands.
- Diff whitespace check, canonical explicit pre-commit (including ESLint/Prettier), and isolated full client typecheck passed with exit 0.
- Logs/artifacts: `/private/tmp/readability49-input-{baseline,final}.log`, `/private/tmp/readability49-input-{baseline,final}-coverage/coverage-final.json`, `/private/tmp/readability49-input-coverage-comparison.json`, `/private/tmp/readability49-input-hooks.log`, `/private/tmp/readability49-input-typecheck.log`.

The first final attempt found the dataset helper was imported from the test-data index instead of its datasets module. Correcting that import produced the reported passing final run. Initial ESLint autofixed import grouping; checks are rerun on its resulting source. No failed attempt is counted as a pass.

## Guidance and reuse

Existing README guidance on scenario-local setup, canonical fixtures and meaningful component boundaries was sufficient. The file already had native mount options. Its missed cleanup was unmounting debounce-owning components before clock restoration; batch 48's hook-order finding supplied the concrete runner semantics. Existing nth, dataset factory and auto-unmount solve these gaps without a new shared abstraction. No shared/helper/production/downstream files changed and no fresh cross-file guidance need was found.
