# tool_test_discovered_outputs_race_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:tool_test_discovered_outputs_race_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_test_discovered_outputs_race_26.2)

Fixes a tool test framework race. With the tool request API (`use_legacy_api: never`), `resolve_tool_submission` builds outputs from `jobs/{id}/outputs`. If the job has already finished, that list includes discovered `__new_primary_file_*` datasets, which breaks `expect_num_outputs`. Base: `release_26.2`.

## Status

`branches_implemented_needs_ci`: `31462df5561` (refactor + fix commits) pushed to `jmchilton` 2026-10-22. Hardening in progress: scope eval recommends modest expand (shared `__new_primary_file_` helper). It skips `__new_primary_file_*` outputs and adds a red-to-green unit test.

No PR yet.

Local: `test/unit/tool_util/verify/` 158 passed; isort, black and ruff clean. Fork CI not checked yet.

## Context

Found as an unrelated flake on [#24368](https://github.com/galaxyproject/galaxy/pull/24368); see [CI failure context](ci_failure_context.md).
