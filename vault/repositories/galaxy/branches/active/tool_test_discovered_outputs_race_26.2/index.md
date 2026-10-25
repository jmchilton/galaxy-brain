# tool_test_discovered_outputs_race_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:tool_test_discovered_outputs_race_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_test_discovered_outputs_race_26.2)

Fixes a tool test framework race. With the tool request API (`use_legacy_api: never`), `resolve_tool_submission` builds outputs from `jobs/{id}/outputs`. If the job has already finished, that list includes discovered `__new_primary_file_*` datasets, which breaks `expect_num_outputs`. Base: `release_26.2`.

## Status

`ready`: polished, head `fc70b831522` on `release_26.2`; fork CI green.

[#24398](https://github.com/galaxyproject/galaxy/pull/24398) undrafted 2026-10-24 (tick).

PR CI green except Main tool tests (`OSError: [Errno 122] Disk quota exceeded`, runner infra), unrelated; rerun.

## Polish

[PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [checklist](checklist.md) · [debrief](polish_debrief.md)

## Context

Found as an unrelated flake on [#24368](https://github.com/galaxyproject/galaxy/pull/24368); see [CI failure context](ci_failure_context.md).
