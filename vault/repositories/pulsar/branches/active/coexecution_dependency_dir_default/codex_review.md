Run via gpt-6.1-sol at high effort.

# Codex review

Reviewed range: `coexecution_stage_failures...HEAD`, parent `1302eea`, head `4fd4b12`. The range has two commits: `f472a87` (Pulsar fix) and `4fd4b12` (Dockerfile cleanup).

Codex (`codex exec -s read-only`, CLI 0.169.0) could not run shell commands on this host, so its prompt contained everything it read:

- the diff;
- the full post-change `pulsar/scripts/submit_util.py`, `test/submit_util_test.py` and `docker/coexecutor/Dockerfile`;
- all of `pulsar/core.py` and `pulsar/client/coexecution.py`;
- `pulsar/main.py` 1-360 (config builders, `apply_env_overrides_and_defaults`);
- `pulsar/client/client.py` 300-436 (`get_pulsar_app_config`);
- the `dependency_manager` uses in `pulsar/capabilities.py` and `pulsar/managers/base/__init__.py`;
- the installed galaxy-tool-util `deps/__init__.py` (`build_dependency_manager`, `DependencyManager`, `NullDependencyManager`) and the Conda resolver's constructor.

## Findings

Codex returned no findings and left its coverage notes empty.

## Claude observation (not from Codex)

- NEEDS-DECISION: a client-supplied `dependency_resolution` without `default_base_path` now gets no dependency resolution. If a Galaxy destination's `pulsar_app_config` has a `dependency_resolution` without `default_base_path`, for example only resolvers with an explicit Conda `prefix`, `Client.get_pulsar_app_config` doesn't add its default (`pulsar/client/client.py:395`). `build_dependency_manager` then sees `tool_dependency_dir` `none` and nothing that overrides it, so it returns a `NullDependencyManager` (`.venv/.../galaxy/tool_util/deps/__init__.py:68-103`). Containerless jobs would run without their requirements and nothing would warn. Before this change the same config built a `DependencyManager` based at `/dependencies`. That worked on a writable root and crashed on a read-only one. I confirmed this directly with `build_dependency_manager`. The client's own default and any dict built by `DependencyManager.to_dict()` always include `default_base_path`, so only a hand-written config is affected. Possible handling: leave it as is, document it, or don't default to `none` when `dependency_resolution` is present. That last option brings the read-only crash back for those configs. No change made.

## Gate (unchanged branch)

- `make lint`: passes.
- `.venv/bin/isort --check --diff pulsar test`: clean.
- `.venv/bin/mypy pulsar/scripts/submit_util.py test/submit_util_test.py`: no issues.
- `.venv/bin/pytest test/submit_util_test.py`: 12 passed.

No commits added. No Docker build was needed because the Dockerfile was not changed. Final head: `4fd4b12`.

READY WITH NOTES
