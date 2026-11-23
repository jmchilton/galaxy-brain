---
upstream_base_branch: dev
related_records:
  - galaxy/branches/subworkflow_mapping
---
# editor_subworkflow_map_over_tests

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:editor_subworkflow_map_over_tests?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/editor_subworkflow_map_over_tests)

## Status

Hardening; local head `d645ec0eeda` (baseline tests `690f6bd8bcf`, then the editor fix) on `dev` at `65e6daff233`, awaiting a force-push (the fork is still at `b8c7a93e57a`).

No PR.

The fork's CI ran on `b8c7a93e57a` and its client unit tests and linting are green; the new head is untested in CI.

## Decisions

- Codex hardening found a real bug: the editor ignored the singular `collection_type` the server sends for a subworkflow's collection input. It treated the input as any-collection, so a `paired` would connect to a `list` input, and a `list:list` would connect directly without mapping over. John chose a client fix (2026-11-23): `terminalFactory` falls back to `collection_type`. The server fix was rejected because `get_all_inputs` feeds scheduling. See [codex_review.md](codex_review.md).

- Extracted from the standing branch [subworkflow_mapping](../../../../../agents/gx_standing/standing_branches/subworkflow_mapping/index.md) at John's request (2026-11-23): the client half of `adae6a060d6` on #23676, which changes no client source.
- The fixture step is id 37 here, not 34 as on #23676, because `dev` has since added steps 34-36. #23676 conflicts in `parameter_steps.json` until it drops its copy on rebase. This copy also declares the inner collection input with the server's singular `collection_type`, not `collection_types`.
