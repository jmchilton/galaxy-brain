# container_tool_env — polish debrief

PR #23815 (draft, `dev`). The branch predated the polish process. Rebased from `a9014125ed7` onto `origin/dev` and force-pushed. Polish commits went up to `8eb3c6624d9`.

## CI (before polish, `a9014125ed7`)
- Integration shard 3: Rucio docker image (infra).
- Integration shard 0: `TestMulledSingularityContainerResolvers` (`test_tool_run`, `toolbox_install`). It passed on the fork run at the same SHA, so it's a flake (mulled image fetch), not the branch.

## Checklist findings → fixes
- **Diff churn.** `jobs.md` carried ~80 lines of prettier reformatting, and `job_config_schema.yml` had two trailing-whitespace edits. Galaxy's opt-in pre-commit sample (`prettier`, `trailing-whitespace`) caused them. CI runs prettier only on `client/`. Restored `jobs.md` to dev plus the new section (+73 lines) and the schema whitespace to dev. Committed with `SKIP=prettier,trailing-whitespace`, so future edits to these files need the same skip.
- The `tool_env` schema still allowed `file`/`execute`, while config load rejects them. They are removed from the schema mapping.
- Removed the unused `get_envs(tag=...)` parameter.
- Removed `env_order` from two assertions; it was a leftover from an earlier implementation.
- Moved in-method test imports to the top (`test_toolbox_pytest.py`, `test_runtime_environment.py`).
- Folded `test_job_destination_env.py` into `test_environment.py` and renamed the misnamed `test_tool_env_rejects_unknown_names`. No test was dropped.

## Design change (John chose)
- **Docker + `docker_sudo`.** The branch added `sudo --preserve-env=<all pass-through names>` to every sudo'd run. Sudoers rules without SETENV or `env_keep` refuse that, which would break existing sudo Docker sites. Now under sudo each name becomes `-e "NAME${NAME+=$NAME}"`. Set values are expanded on the host as on dev. Unset names stay bare and are omitted, since sudo resets the environment. Done red→green: the fake `sudo` in `test_forwarding_preserves_unset_empty_and_legacy_overrides` now refuses `--preserve-env`.

## Strengthening round
- Added `test_runtime_environment_warning` to `test_pulsar_embedded.py` and `test_pulsar_embedded_extended_metadata.py`. Both pass locally. The directory test fails if the `pulsar.py` warning-file `dynamic_outputs` line is removed, so it isn't vacuous.
- `test_coexecution.py` now asserts the warning (`EMPTY_VAR`, `MISSING_VAR`). **Not run locally (needs k8s); CI will prove it.**
- Description fixes: kept "Toward #21640" (the reported TPV/eggnog case needs a tool declaration or TPV emitting `tool_env`). Narrowed the security sentence: declaring a name pulls in job-scoped values. Narrowed "values never in job script" to "container command never embeds values". Renamed the table column to Pulsar coexecution (Kubernetes); native Kubernetes isn't tested. Added highlighted sentences for audience and scope, and a risk bullet: unset pass-through names are now unset in the container instead of empty.

## Left over / for John
- Admin allow-list for declarable names, or explicitly accept "any non-reserved name"? This is the main security talking point.
- A per-destination opt-in to treat legacy `env` as `tool_env`? It would fix #21640 for TPV users without a TPV release, but it widens scope and re-raises the #16666 concern.
- File the follow-ups (tools-iuc eggnog declaring `EGGNOG_DBMEM`, TPV emitting `tool_env`) so the PR can link them?
- Singularity with `singularity_sudo` drops the `SINGULARITYENV_*` exports. Dev does the same; should it be documented?
- The container-native runner check is a hard-coded name list (`_warn_on_container_native_job_env`). A runner class attribute would be a reusable abstraction.
- The linter reports the reserved-name error as pydantic's multi-line dump.
