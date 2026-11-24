---
upstream_base_branch: release_26.2
related_records:
  - galaxy/branches/subworkflow_mapping
---
# editor_subworkflow_map_over_tests

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:editor_subworkflow_map_over_tests?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/editor_subworkflow_map_over_tests)
- [PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [checklist](pr_checklist.md) · [polish debrief](polish_debrief.md)

## Status

Polished, ready for final review; head `a92b870744e` on `release_26.2`, pushed: baseline vitest tests `aa47be35ea6`, editor fix `2885dc64873`, Selenium test `a92b870744e`.

No PR.

Fork CI on `2885dc64873`: client unit, linting and API tests green, only unrelated reds (release script version check, macOS startup); `a92b870744e` (adds the Selenium test) pending.

## Decisions

- Codex hardening found a real bug: the editor ignored the singular `collection_type` the server sends for a subworkflow's collection input. It treated the input as any-collection, so a `paired` would connect to a `list` input, and a `list:list` would connect directly without mapping over. John chose a client fix (2026-11-23): `terminalFactory` falls back to `collection_type`. The server fix was rejected because `get_all_inputs` feeds scheduling. See [codex_review.md](codex_review.md).
- Retargeted from `dev` to `release_26.2` per [scope_evaluation.md](scope_evaluation.md) (John, 2026-11-24): the bug ships there, and the fix merges forward. The fix commit also drops `fields` and `column_definitions` from `DataCollectionStepInput`, which step input descriptions never carry.
- Extracted from the standing branch [subworkflow_mapping](../../../../../agents/gx_standing/standing_branches/subworkflow_mapping/index.md) at John's request (2026-11-23): the client half of `adae6a060d6` on #23676, which changes no client source.
- The fixture step is id 37 here, not 34 as on #23676, because `dev` has since added steps 34-36. #23676 conflicts in `parameter_steps.json` until it drops its copy on rebase. This copy also declares the inner collection input with the server's singular `collection_type`, not `collection_types`.
- Left for John: an optional end-to-end API test asserting the `list:list` output; server-side run-time collection type checks and datatype filtering for subworkflow inputs are follow-ups, out of scope.
