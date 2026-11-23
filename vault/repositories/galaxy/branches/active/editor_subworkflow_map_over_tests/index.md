---
upstream_base_branch: dev
related_records:
  - galaxy/branches/subworkflow_mapping
---
# editor_subworkflow_map_over_tests

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:editor_subworkflow_map_over_tests?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/editor_subworkflow_map_over_tests)

## Status

Head `b8c7a93e57a` (pushed, one commit on `dev` at `65e6daff233`): adds a subworkflow step to the `parameter_steps.json` terminals fixture and 5 `terminals.test.ts` cases pinning how the editor maps a subworkflow over a list. Tests only.

No PR.

No CI yet. Locally `terminals.test.ts` passes (96 tests) and prettier and eslint are clean, in `node_modules` borrowed from another worktree; the rest of `Workflow/Editor` has the same 21 failures there with and without this commit.

## Decisions

- Extracted from the standing branch [subworkflow_mapping](../../../../../agents/gx_standing/standing_branches/subworkflow_mapping/index.md) at John's request (2026-11-23): the client half of `adae6a060d6` on #23676, which changes no client source.
- The fixture step is id 37 here, not 34 as on #23676, because `dev` has since added steps 34-36. #23676 conflicts in `parameter_steps.json` until it drops its copy on rebase.
