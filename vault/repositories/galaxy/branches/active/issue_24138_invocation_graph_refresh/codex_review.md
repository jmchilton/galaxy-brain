# Codex review debrief

Acted on the only finding, which I confirmed. `rerunWhileBusy` cached a rejection forever when `fn` threw synchronously. The async IIFE's `finally` cleared `running` before the rejected promise was assigned to it. I added a red→green test and fixed it in `73ace916183`: `callAsync` + `.finally()`, the same pattern as `dedupeInFlight`. The invocation-graph caller is async, so it was never affected in practice.

Not acted on: nothing. There were no other findings.

<details><summary>Full review</summary>

Codex (`codex exec -s read-only`, structured findings) reviewed `origin/release_26.2...d94c630e49f`.

Brief: the goal of #24138 and #22745 and the main files. My reasoning wasn't included.

Coverage: the full committed diff plus surrounding code (`lastQueue.ts`, `keyedCache.ts`, `invocationStore.ts`, `workflowStepStore.ts`, `model.ts`, `WorkflowGraph.vue`, `WorkflowInvocationState.vue`). Codex didn't run vitest or Selenium in the sandbox. It reproduced its finding with Node against the committed implementation.

Findings:
1. **P2 correctness, `client/src/utils/sharedPromise.ts:59` — a synchronous throw from the callback permanently prevents retries.** "If fn() throws before returning a promise, the async IIFE executes its finally block before its rejected promise is assigned to running. That assignment then overwrites the cleanup, leaving running permanently set to the rejected promise… Use the existing callAsync(fn) helper here." **CONFIRMED**: an async function body runs synchronously up to its first `await`, so `finally` ran before the assignment.

</details>
