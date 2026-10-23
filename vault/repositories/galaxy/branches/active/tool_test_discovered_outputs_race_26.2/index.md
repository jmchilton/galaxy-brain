# tool_test_discovered_outputs_race_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:tool_test_discovered_outputs_race_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_test_discovered_outputs_race_26.2)

Fixes a tool test framework race. With the tool request API (`use_legacy_api: never`), `resolve_tool_submission` builds outputs from `jobs/{id}/outputs`. If the job has already finished, that list includes discovered `__new_primary_file_*` datasets, which breaks `expect_num_outputs`. Base: `release_26.2`.

## Status

`branches_ready_for_final_review`: polished 2026-10-23, awaiting John's read-through. `fc70b831522` (refactor, shared discovered-output helpers, fix) pushed to `jmchilton` 2026-10-22; hardened + rescoped, READY. It skips `__new_primary_file_*` outputs and adds a red-to-green unit test. Original scope alt: `tool_test_discovered_outputs_race_26.2_alt_original_scope`.

No PR yet.

Local: `test/unit/tool_util/verify/` 158 passed; isort, black and ruff clean. Fork CI green on `fc70b831522` (2026-10-23).

## Polish

[PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [checklist](checklist.md) · [debrief](polish_debrief.md)

## Context

Found as an unrelated flake on [#24368](https://github.com/galaxyproject/galaxy/pull/24368); see [CI failure context](ci_failure_context.md).
