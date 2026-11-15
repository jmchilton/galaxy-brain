Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear code quality review

Reviewed range: `coexecution_stage_failures...HEAD`, parent `1302eea`, head `4fd4b12` (`f472a87` adds `CoexecutionConfigBuilder` in `pulsar/scripts/submit_util.py` with tests; `4fd4b12` drops the Dockerfile's `ENV PULSAR_CONFIG_TOOL_DEPENDENCY_DIR`). Surrounding code read: `PulsarApp.__setup_dependency_manager` (`pulsar/core.py`), `PulsarConfigBuilder` / `PulsarManagerConfigBuilder` / `apply_env_overrides_and_defaults` (`pulsar/main.py`), `Client.get_pulsar_app_config` (`pulsar/client/client.py`), galaxy-tool-util `build_dependency_manager`, `pulsar/scripts/run.py`, `app.yml.sample`, `docs/configure.rst`.

## Is `submit_util.py` the right layer?

Yes. Kept there.

- `pulsar/core.py` is shared with `pulsar serve`. Changing its `"dependencies"` default would move every existing server's dependency directory.
- `pulsar/main.py`'s builders are shared too. Putting a coexecution default there means a mode flag in a general path.
- `Client.get_pulsar_app_config` ships in Galaxy's pulsar-galaxy-lib. Older Galaxy clients talking to a new staging image would never send the setting, so the image would have to keep its ENV workaround. A client-side copy as well as the server-side default would only duplicate the rule.
- `submit_util.py`'s `run_server_for_job` / `run_server_for_job_finish` are the entry points of the coexecution app (`pulsar-submit`, `pulsar-finish`). `manager_from_args` already applies a coexecution-only app setting there (`message_queue_consume=False`). A builder subclass that overrides `load()` adds the default without new branching in shared code, and both scripts pick it up.

`pulsar-run --server` also calls `run_server_for_job`, but it has been broken on `origin/master` since before this stack: it defines no `--wait`, so `args.wait` raises. This branch doesn't change that.

Considered and not done: making `CoexecutionConfigBuilder` own `message_queue_consume=False` as well, so a single class holds the coexecution app config. It would be a slightly cleaner model, but it refactors pre-existing code outside this branch's purpose. Folding the builder's construction into `manager_from_args(args)` was also skipped, because it would rewrite lines that `9036ff3` (compact_launch) changes right next to.

## Findings

1. **`dependency_resolution` without `default_base_path` silently lost dependency resolution.** (Raised by the Codex step.) Fixed in `e770845`. This shape is not only a hand-written edge case: it is what `app.yml.sample` documents (`dependency_resolution:` with only `resolvers`). With `setdefault("tool_dependency_dir", "none")`, galaxy-tool-util took the base path from `tool_dependency_dir`, so it returned a `NullDependencyManager` and containerless jobs ran without their requirements, with no warning. I confirmed this with `build_dependency_manager`: before the fix it returns `NullDependencyManager`, after it returns `DependencyManager`. The default now applies only when the app config has no `dependency_resolution`. That is the same condition `Client.get_pulsar_app_config` uses to decide whether to add its own, so the server-side rule mirrors the client-side one. For that config the behavior is back to what it was before the branch, and to what the `origin/master` image does (base path `dependencies` under the working directory). The client's default config, containerized jobs, and the precedence of explicit `tool_dependency_dir` and env settings are unchanged. Remaining exposure: a config that uses only Galaxy-style flat keys (`dependency_resolvers`, `conda_prefix`) or a `dependency_resolvers_conf.xml`, without `dependency_resolution` or `tool_dependency_dir`, still gets no resolution. Neither shape is documented for Pulsar app config in coexecution, and adding a list of keys to check would be magic, so it is left as is.
2. No other structural findings. The subclass is small and direct, the two call-site swaps are the minimal wiring, and no file approaches the size limit (`submit_util.py` is about 190 lines). The Dockerfile change only removes the ENV line and fixes its comment. The parametrized test exercises precedence through the real argument parser and builder. The integration test runs submit, tool and finish in an empty working directory.

## Restack impact

Hunks changed by `e770845`:

- `pulsar/scripts/submit_util.py`: the `CoexecutionConfigBuilder` docstring and the body of `load()`.
- `test/submit_util_test.py`: one new case in the `test_coexecution_tool_dependency_dir_default` parametrize list, and its assertion changed from `[...]` to `.get(...)`.

Later branches don't touch these lines. I simulated it in temporary detached worktrees (since removed) by cherry-picking `ef7caea..coexecution_compact_launch` (7 commits) onto both `4fd4b12` and `e770845`. Neither `submit_util.py` nor `submit_util_test.py` conflicted on either base. Both runs hit the same conflict in `pulsar/managers/stateful.py` at `eafab6c`. That conflict comes from the earlier restack of the lower branches, not from this branch. After resolving it the same way on both runs, the two final trees differed only by `e770845`'s hunks. Expected conflict impact of this step: none.

## Gate (at `e770845`)

- `make lint`: passes.
- `.venv/bin/isort --check --diff pulsar test`: clean.
- `.venv/bin/mypy pulsar/scripts/submit_util.py test/submit_util_test.py`: no issues.
- `.venv/bin/pytest test/submit_util_test.py`: 13 passed. The new case fails without the fix.
- `.venv/bin/pytest test/main_util_test.py`: 14 passed.

No Docker build was needed because the Dockerfile was not changed in this step.

Final head: `e770845`.

READY
