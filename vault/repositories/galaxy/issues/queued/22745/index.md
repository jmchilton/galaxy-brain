# galaxy#22745 — Workflow invocation graph freezes mid run

[Issue](https://github.com/galaxyproject/galaxy/issues/22745) · [our comment](https://github.com/galaxyproject/galaxy/issues/22745#issuecomment-6182903092) · [issue draft](issue_draft.md) · [comment text](proposal.md) · [debrief](debrief.md)

Reported by nilchia (171-step workflow on usegalaxy.eu, 26.0/26.1). Assigned ahmedhamidawan; jmchilton added 2026-10-14 when Claude posted the perf analysis comment for John.

Comment measured (vitest, node 22, not a browser): one 3 s `useInvocationGraph` refresh is O(n²) — 11 / 128 / 708 ms at 50 / 171 / 400 steps — from `JSON.stringify` of the whole jobs summary per step plus an `Object.keys()` loop bound; an idle refresh also rewrites `headerClass` on every step (node headers + minimap redraw). Hoisting both + input-only input branch: 0.3 / 1.0 / 2.4 ms; existing 17 tests pass. Honest limit: that's stutter, not the full freeze; zoom/pan cost needs a browser profile.

Next: small PR with the diff from the comment + the "idle refresh writes nothing" unit test; then browser-profile zoom/pan on the reporter's invocation. Pairs with [#24138](../24138/index.md) (same composable).

Open: coordinate with ahmedhamidawan (assignee) before opening a PR.

Branch: [`issue_24138_invocation_graph_refresh`](../../../branches/active/issue_24138_invocation_graph_refresh/index.md) (2026-10-15) — refresh-cost part only; zoom/pan still unprofiled.
