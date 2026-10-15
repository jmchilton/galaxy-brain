# galaxy#24138 — Invocation Steps tab: step state headers stop updating while the invocation runs

[Issue](https://github.com/galaxyproject/galaxy/issues/24138) · [issue draft](issue_draft.md) · [proposal](proposal.md) · [debrief](debrief.md)

Filed 2026-10-14 by Claude for John; assigned jmchilton. Came out of re-verifying the `Component - Invocation Graph View` vault note against dev `c63ffc2ccae`.

Regression from #20719 (25.1): Steps tab gets its own `useInvocationGraph` instance, which only `loadInvocationGraph(false)`s once; the composable has no watcher on `stepsJobsSummary`/`invocation`, so headers stay at load-time state. Red component vitest (in the issue) confirms; not browser-checked.

Next: watcher in `useInvocationGraph` calling `updateSteps()` without toggling `loading` (else expanded steps collapse every 3 s); also watch `invocation` and make the L206-208 summary-changed check count invocation changes; guard overlapping updates; delete `InvocationGraph.pollInvocationGraph`. Red→green: the component test from the issue + composable test.

Related: perf comment on [#22745](../22745/index.md) — complementary, the watcher alone doesn't remove the O(n²) refresh cost; could land in one PR.

Open: ping/assign ahmedhamidawan (author of #20719)? Not mentioned in the issue.
