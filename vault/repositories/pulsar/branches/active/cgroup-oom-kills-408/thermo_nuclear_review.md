Run via claude-opus-5-5.

Reviewed `git diff origin/master...8490345`. Verdict: approvable. There is no structural regression, and this pass made one real code-judo change. The previous round added `_per_job_option`, but it was only a pass-through `.get`. Both resolvers still repeated the "override, else manager default" policy. Now the helper takes `default` and `parse`, so it owns that policy, and the two resolver methods (`_cvmfsexec_config`, `_check_cgroup_oom_kills`) are inlined at their single call sites (`712c4ce`). In the same commit, the disable-override test was tightened to also cover a real `False`. The old string `"false"` is truthy, so a regression from `is not None` to a truthiness check would have stayed green. A second commit adds a test (`63969ff`) that makes the route comment "one parameter per `PER_JOB_MANAGER_OPTIONS` entry" an enforced invariant. Without it, a missing route arg makes REST drop the option silently while MQ still honors it. I checked that the test goes red when the arg is removed. Nothing under `pulsar/managers/util/job_script/` changed. `CGROUP_OOM_KILLS_STATEMENT.sh` is still byte-identical to Galaxy's, and the `job_script()` hunk and template slots match the Galaxy branch line for line. Pushed to `jmchilton/cgroup-oom-kills-408` at `63969ff`. The targeted tests (plus `routes_test.py`) give 72 passed. `make lint` is clean. `mypy` on `directory.py` reports only the pre-existing `amqp_exchange.py:19` error.

Not acted on:

- **`job_script/` cosmetics** (e.g. a constant for the inline `"/proc/$$/cgroup"` default next to `DEFAULT_CGROUP_MOUNT`). It is mirrored from Galaxy, and any tweak would force a Galaxy mirror for no gain.
- **Routing the report through `$instrument_post_commands` / `ExitHandlers` instead of two new template slots.** The template design is owned by the Galaxy branch, and `ExitHandlers` exists only in Pulsar's copy (see Codex round). Any change has to start on the Galaxy side.
- **Moving parsers into `PER_JOB_MANAGER_OPTIONS`** (a name→parser table). The tuple lives in `pulsar/client/`, which ships to Galaxy as pulsar-galaxy-lib, while `cvmfsexec.parse` is manager-side. A table there would leak a layer. Names only is correct.
- **A generic `{name: parse}` default table in `BaseManager`.** With two options it is more magic than it saves. It would also rename `self.cvmfsexec_config`.
- **Dropping the `if manager_options:` guard in `submit_job`.** The guard keeps the no-option path identical to master: `setup_params` stays the same object and is not copied. The bundled clients always send a dict or omit the key. I didn't trace whether other senders can send `null`, so dropping the guard isn't a pure win.
- Settled in earlier rounds, not reopened: explicit route args (`build_func_args` needs signature args), the `setup_params: Dict[str, str]` annotations, the `docs/compatibility.rst` entry, the `queued_python` startup warning, and both Codex P2s.

<details><summary>Full review</summary>

## Scope

The scope is 5 commits, 16 files, +316/−19. The touched files are all small: `directory.py` is 316 lines, `base/__init__.py` 505, `client.py` 655, and `destination.py` ~70. None is near the 1k threshold.

## What is right

- **One option list, both transports.** `PER_JOB_MANAGER_OPTIONS` plus `per_job_manager_options()` in `pulsar/client/destination.py` serve both the client (`destination_params`) and the server (`job_config` in `submit_job`). The server already imports `pulsar.client.setup_handler`, so the dependency direction is not new. The REST loop (`json_dumps` per value) and the MQ `update` are the minimal per-transport difference.
- **Placement in `_job_template_env`.** Putting the option here rather than in `_setup_job_file` means `queued_cli` picks it up too. This is the right layer.
- **The `job_script()` hunk** is a faithful mirror of the Galaxy branch: two optional slots, defaulted to `""` in `OPTIONAL_TEMPLATE_PARAMS`, and filled only when enabled. It adds no conditional to the template.
- **The probe** is isolated in its own `.sh` resource. That is the canonical pattern next to `MEMORY_STATEMENT.sh` and `CLUSTER_SLOTS_STATEMENT.sh`.

## Findings

### T1 (acted on, `712c4ce`): `_per_job_option` was a thin wrapper; the policy was still duplicated

At `8490345`:

```python
@staticmethod
def _per_job_option(setup_params, name) -> Any:
    return (setup_params or {}).get(name)

def _cvmfsexec_config(self, setup_params):
    override = self._per_job_option(setup_params, "cvmfsexec")
    if override is not None:
        return cvmfsexec.parse(override)
    return self.cvmfsexec_config

def _check_cgroup_oom_kills(self, setup_params) -> bool:
    override = self._per_job_option(setup_params, "check_cgroup_oom_kills")
    if override is not None:
        return asbool(override)
    return self.check_cgroup_oom_kills
```

This is the refactor-that-moves-complexity-around pattern. The helper names the lookup but not the policy, so each resolver still has its own `is not None` branch, and a third option would copy it again. The fix is for the helper to own the whole rule:

```python
@staticmethod
def _per_job_option(setup_params, name, default: T, parse: Callable[[Any], T]) -> T:
    override = (setup_params or {}).get(name)
    return default if override is None else parse(override)
```

With that, both resolver methods disappear. `_cvmfsexec_config` predates the branch, but it is private with a single caller and no test references. The call sites read as a single expression each. `TypeVar` keeps the return typed as `Optional[CvmfsExecConfig]` or `bool` instead of `Any`. The `(setup_params or {})` guard stays, because `_setup_job_file` can pass `None`.

Safety net: `manager_cvmfsexec_test.py::test_setup_params_override_takes_precedence` covers the cvmfsexec override path. `manager_cgroup_oom_kills_test.py` covers the manager default plus override enable/disable for the new option. The disable test used only the string `"false"`, which is truthy, so it could not catch an `if override:` regression. It now runs as subtests over `False` and `"false"`. Red-checked: with the helper switched to a truthiness test, only the `False` subtest fails.

### T2 (acted on, `63969ff`): the route signature invariant was a comment, not a check

`routes.submit` must name each `PER_JOB_MANAGER_OPTIONS` entry, because `build_func_args` forwards only `getfullargspec(func).args`. That constraint was documented by a comment, and the failure mode is silent: REST drops the option while MQ honors it. `test/routes_test.py::test_submit_accepts_every_per_job_manager_option` asserts the tuple is a subset of `submit.func`'s args. It inspects `.func`, because `PulsarController` wraps the route. I checked it goes red with `check_cgroup_oom_kills` removed from the signature.

### T3 (not acted on): two template slots vs. reusing an existing pre/post hook

The setup/report pair could in principle ride on `$instrument_pre_commands` / `$instrument_post_commands`. However, the report must read `$?` straight after `$command`, before any instrumenter, so it would need ordering inside the post block. Pulsar's `ExitHandlers` (EXIT trap) would also survive an early `exit`, but it exists only in Pulsar's template. Both options change the mirrored template, and the Galaxy branch owns that design. No action is possible here without forking the mirror.

### T4 (not acted on): parsers alongside the option names

A `{name: parse}` table would let `BaseManager` and the resolver loop generically. It can't live with `PER_JOB_MANAGER_OPTIONS`, because that would put manager imports into `pulsar/client`, which is the Galaxy-shipped client lib. A server-side twin table would be a second list to keep in sync, which is the accretion `PER_JOB_MANAGER_OPTIONS` removed. At two options, explicit defaults in `BaseManager.__init__` plus one generic resolver are the boring, correct shape.

### Nits (no action)

- `submit_job`'s `if manager_options:` guard is near-redundant. I kept it so the no-option path stays byte-for-byte master behavior.
- `job_script()` pops `cgroup_mount`/`proc_cgroup` unconditionally, and only `cgroup_mount` has a named default constant. This is mirrored from Galaxy, so leave it.
- `setup.py` `package_data` entry is redundant with `MANIFEST.in`, but it matches the sibling `CLUSTER_SLOTS_STATEMENT.sh` entry.

## Mirror check

`diff` of Galaxy's `lib/galaxy/jobs/runners/util/job_script/CGROUP_OOM_KILLS_STATEMENT.sh` against Pulsar's `pulsar/managers/util/job_script/CGROUP_OOM_KILLS_STATEMENT.sh` is empty. The `job_script()` lines (`DEFAULT_CGROUP_MOUNT`, the `cgroup_mount`/`proc_cgroup` pops, the `check_cgroup_oom_kills` branch, and the two `OPTIONAL_TEMPLATE_PARAMS` slots) match the Galaxy branch. This pass changed no `job_script/` files.

</details>
