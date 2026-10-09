# Review: Planemo #1701 — Run package-installed Galaxy through Gravity

Reviewed 2026-10-06. [PR](https://github.com/galaxyproject/planemo/pull/1701), exact head `ca2becffe6fbe8dce22faad9846beed88ee99b1f`; merge base with current `origin/master` is `b1002b01f871b55a3dc0c7523b9d423c20e60eef`. Worktree was clean; no PR code was changed.

The Gravity approach and reuse of the existing daemon monitor are sound. I would fix the three integration/lifecycle issues below before merging, and extract the independently useful changes so the new runtime can be reviewed mostly as additive code. See [the concrete reviewability plan](reviewability_plan.md) for the four-change sequence and proposed configuration boundary.

## Findings

### P2: SIGTERM leaves the new foreground runtime running

Changed code: [`planemo/galaxy/config.py:1373–1382`](https://github.com/galaxyproject/planemo/blob/ca2becffe6fbe8dce22faad9846beed88ee99b1f/planemo/galaxy/config.py#L1373).

`InstalledGalaxyConfig.run_foreground()` launches Gravity in a new session, then calls `wait()`. Its cleanup catches Python exceptions, which handles Ctrl-C, but Python's default SIGTERM action terminates Planemo immediately. A SIGTERM to the foreground Planemo process group therefore leaves Gravity and its services in their independent group. This affects ordinary foreground `planemo serve --engine installed_galaxy`, including termination by an IDE/process supervisor. The new SIGINT acceptance test cannot detect it.

Confirmed with the exact new method and a harmless sleeping-process command: Planemo parent returned `-15`; the child's process group still existed. The reproduction immediately cleaned both groups. This is specific to the newly introduced foreground process ownership path, rather than an observation about a preexisting checkout signal handler.

Prefer reusing the daemon monitor's existing control-pipe ownership for foreground execution, so parent death closes the pipe and triggers teardown. A separate SIGTERM handler would need careful restoration and cleanup semantics. Add a subprocess regression for SIGTERM and assert the actual child group disappears.

Reproduction from the reviewed worktree, using a Python environment that already imports Planemo (the review used `/Users/jxc755/projects/repositories/planemo/.venv/bin/python`):

```python
import os, pathlib, shlex, signal, subprocess, sys, tempfile, time
from planemo.io import process_group_exists, terminate_process_group

with tempfile.TemporaryDirectory(prefix="review1701-sigterm-") as temp:
    child_pid_file = pathlib.Path(temp) / "child.pid"
    child_script = pathlib.Path(temp) / "child.py"
    child_script.write_text(
        "import os,pathlib,sys,time\n"
        "pathlib.Path(sys.argv[1]).write_text(str(os.getpid()))\n"
        "time.sleep(300)\n"
    )
    launcher = pathlib.Path(temp) / "launcher.py"
    command = shlex.join([sys.executable, str(child_script), str(child_pid_file)])
    launcher.write_text(
        "from planemo.galaxy.config import installed_galaxy_config\n"
        "from tests.test_utils import create_test_context\n"
        "with installed_galaxy_config(create_test_context(), [], port=8765) as config:\n"
        "    config.run_foreground(" + repr(command) + ")\n"
    )
    process = subprocess.Popen([sys.executable, str(launcher)], start_new_session=True)
    child_pid = None
    try:
        deadline = time.monotonic() + 20
        while not child_pid_file.exists() and time.monotonic() < deadline:
            time.sleep(0.1)
        if not child_pid_file.exists():
            raise RuntimeError("child failed to start")
        child_pid = int(child_pid_file.read_text())
        child_group = os.getpgid(child_pid)
        os.killpg(process.pid, signal.SIGTERM)
        print("foreground parent exit:", process.wait(timeout=5))
        print("child group remains:", process_group_exists(child_group))
    finally:
        if child_pid is not None:
            terminate_process_group(child_group, timeout=1)
        terminate_process_group(process.pid, timeout=1, reap=process.poll)
```

Set `PYTHONPATH` to the reviewed worktree when launching that script from `/tmp`; `PYTHONDONTWRITEBYTECODE=1` avoids writing into the PR checkout. Local process control must be permitted by the execution environment.

### P2: An installed-engine profile is saved as a checkout-engine profile

Changed registration: [`planemo/options.py:103`](https://github.com/galaxyproject/planemo/blob/ca2becffe6fbe8dce22faad9846beed88ee99b1f/planemo/options.py#L103), newly advertised in [`docs/commands/profile_create.rst:52`](https://github.com/galaxyproject/planemo/blob/ca2becffe6fbe8dce22faad9846beed88ee99b1f/docs/commands/profile_create.rst#L52). Destination behavior: [`planemo/galaxy/profiles.py:111–124`](https://github.com/galaxyproject/planemo/blob/ca2becffe6fbe8dce22faad9846beed88ee99b1f/planemo/galaxy/profiles.py#L111).

`profile_create --engine installed_galaxy` is accepted and reports success, but dispatches to `_create_profile_local()`, which saves `"engine": "galaxy"` for SQLite and the managed PostgreSQL paths. A subsequent `run/test/serve --profile NAME` launches a checkout Galaxy instead of the installed package runtime. This defeats the profile's engine choice and can provision an unexpected checkout/virtualenv. The hardcoded profile value predates this PR; the bug is exposing the new choice without integrating persistence.

Confirmed with a real CLI invocation in a temporary workspace:

```text
planemo --directory /tmp/isolated-workspace profile_create installed --engine installed_galaxy
# exit 0: Profile [installed] created.
# profiles/installed/planemo_profile_options.json contains "engine": "galaxy"
```

Store the selected local engine when creating the profile, for every database branch, and add a CLI regression checking both the JSON and engine selection when consuming the profile. If profiles are deliberately unsupported initially, remove this choice from `profile_create` rather than silently changing it.

### P2: `autoupdate --test` discards the installed engine selection

Changed registration: [`planemo/options.py:103`](https://github.com/galaxyproject/planemo/blob/ca2becffe6fbe8dce22faad9846beed88ee99b1f/planemo/options.py#L103), advertised in [`docs/commands/autoupdate.rst:30`](https://github.com/galaxyproject/planemo/blob/ca2becffe6fbe8dce22faad9846beed88ee99b1f/docs/commands/autoupdate.rst#L30). Destination behavior: [`planemo/commands/cmd_autoupdate.py:177`](https://github.com/galaxyproject/planemo/blob/ca2becffe6fbe8dce22faad9846beed88ee99b1f/planemo/commands/cmd_autoupdate.py#L177).

After updating artifacts, the verification path unconditionally assigns `kwds["engine"] = "galaxy"`. Thus `autoupdate --engine installed_galaxy --test` switches to a source checkout for testing. Workflow update itself uses the chosen engine, so update and verification can even use different Galaxy versions. This hardcode also predates the PR; the newly advertised installed option makes its incomplete command integration observable.

Confirmed through `CliRunner` with a real temporary copy of `project_templates/demo/cat.xml`, stubbing only the updater and test runner: `autoupdate --engine installed_galaxy --test PATH` exits 0, but `test_runnables` receives `engine="galaxy"`.

The deterministic reproduction uses these patches around the CLI invocation:

```python
with patch.object(cmd.autoupdate, "autoupdate_tool", return_value=[str(tool)]), \
     patch.object(cmd, "test_runnables", return_value=0) as test:
    result = CliRunner().invoke(planemo, [
        "--directory", temp, "autoupdate", "--engine", "installed_galaxy",
        "--test", str(tool),
    ])
    assert result.exit_code == 0
    assert test.call_args.kwargs["engine"] == "galaxy"  # actual; should retain installed_galaxy
```

Here `cmd` is `importlib.import_module("planemo.commands.cmd_autoupdate")`; `tool` is the temporary copied XML. Preserve the selected supported engine, or explicitly constrain command support. Add a CLI routing regression so verification cannot silently change runtimes.

## Verification and coverage

- Existing Planemo Python 3.12.12 environment: `tests/test_installed_galaxy.py`, `tests/test_galaxy_config.py`, `tests/test_runnable.py`, and `tests/test_utils.py`: **71 passed, 3 skipped** (`PLANEMO_SKIP_GALAXY_TESTS=1`). The skipped tests provision a checkout; they do not establish checkout startup compatibility.
- Shared lifecycle and failed-test regressions: `tests/test_gravity_multiprocessing.py`, `tests/test_last_failed.py`: **28 passed**. Existing harmless daemon/process/socket fixtures exercise the extracted monitor helpers.
- Initial sandbox execution blocked four GxIT configuration tests at socket binding. The permitted rerun passed them; these were environment failures, not PR findings.
- `git diff --check` passed; exact-head worktree remained clean.
- Released-package acceptance in a fresh `/tmp` environment: **3 passed, 1 deselected** in 253 seconds. Python 3.12.12 / macOS arm64, Galaxy 26.1.1, Gravity 1.2.4. This covers mixed XML/YAML/local-workflow `test`, foreground SIGINT, and two consecutive `run` invocations with downloaded output contents. External Tool Shed coverage was intentionally deselected. The installed Planemo metadata came from a temporary copy of the exact head; `PYTHONPATH` explicitly selected the reviewed worktree. The shared environment was not modified.

The acceptance command was:

```sh
PLANEMO_TEST_INSTALLED_GALAXY=1 \
PLANEMO_GLOBAL_CONFIG_PATH=/tmp/planemo1701-empty-config.yml \
PLANEMO_GLOBAL_WORKSPACE=/tmp/planemo1701-workspace \
PYTHONPATH=/Users/jxc755/projects/worktrees/planemo/pr/1701 \
PYTHONDONTWRITEBYTECODE=1 \
/tmp/planemo1701-review-venv/bin/python -m pytest -p no:cacheprovider -x -q \
  -m "installed_galaxy and not installed_galaxy_toolshed" \
  tests/test_installed_galaxy_integration.py
```

Coverage gaps are meaningful because the shared options expose this engine beyond `serve/run/test`. Profile and autoupdate routing are untested. The acceptance lifecycle assertions check the Planemo parent's process group, while the monitor and Gravity deliberately own different sessions; capture and assert disappearance of the actual service group/PIDs. Foreground acceptance covers SIGINT only. Mixed report association is exercised in one installed integration test, but should have a separate existing-engine regression with multiple tool tests, workflow permutations, and an intentional failure.

The frozen artifacts dataclass is a useful start, although its dictionaries are mutable. The common preparation function still mixes backend policy with shared assembly through an `installed` boolean. Keep common file/property preparation separate from backend normalization/serialization so the checkout extraction can be validated first. Avoid a new general plugin framework for this scope. Test imports buried in functions can move to the top unless there is an explicit collection/import-order reason.

I checked the proposed service-log concern: Gravity 1.2.4 multiprocessing services inherit stdout/stderr, and daemon launch redirects these to `installed.log`. Omitting separate Gravity log files is therefore not a demonstrated bug. The generated config's API-key conversion is also not undermined by `_handle_kwd_overrides`, whose supported overrides are config paths rather than `master_api_key`.

## Implementation follow-up — 2026-10-06

All three findings above were fixed and pushed in [`ee14c2b2`](https://github.com/jmchilton/planemo/commit/ee14c2b2). Foreground execution now uses the existing daemon monitor, with inherited terminal output; loss of the Planemo parent closes the control pipe and stops the real service group. Local profiles retain the selected engine for both connection-storage branches, and autoupdate verification preserves its selected engine.

New CLI/process regressions failed against the original implementation before the fixes. They cover profile JSON and consumption through `test --profile`, SQLite/PostgreSQL/Singularity profile forms, all supported autoupdate engine choices, foreground SIGTERM/SIGINT/SIGKILL, terminal stdout/stderr, and success/failure exit codes. The existing interruption regression was adapted to the monitor while retaining cleanup assertions. A follow-up code review found no blockers.

YAML recognition was extracted into [draft #1735](https://github.com/galaxyproject/planemo/pull/1735), branch [`recognize-yaml-galaxy-tools`](https://github.com/jmchilton/planemo/tree/recognize-yaml-galaxy-tools), with only the original two-line detection change and its 15-line regression test. The installed branch was connected to that prerequisite/current master with a normal merge in `0ecea31a`; existing history was retained. The [runtime-only comparison](https://github.com/jmchilton/planemo/compare/recognize-yaml-galaxy-tools...package-installed-galaxy-gravity) excludes both recognition files. Merge #1735 first; GitHub's upstream-targeted #1701 diff includes the prerequisite until it merges. The old shared ancestor with #1708 remains available.

Validation of the fix commit: 115 focused tests passed, 3 skipped; released Galaxy 26.1.1 / Gravity 1.2.4 acceptance passed 3 tests in 205 seconds, with the external Tool Shed case deselected. After incorporating current master and connecting the prerequisite, the final focused suite passed **117 tests, 3 skipped**. Flake8, Black, Isort, Ruff, and `git diff --check` passed on the final tree. Local mypy reported the same 24 errors in 10 files on both `ca2becff` and the fix commit; no new typing errors were introduced in that environment. Remote CI was restarted by the pushes and remains separate validation.

The fixes and prerequisite connection are on [`package-installed-galaxy-gravity`](https://github.com/jmchilton/planemo/tree/package-installed-galaxy-gravity). The PR description now links the prerequisite/comparison and records these results; its Gravity version claim was corrected to match `gravity>=1.2.3`.

## CI verified — 2026-10-07

Final head `0ecea31a` has 17 successful checks and the expected skipped release upload.
GitHub reports mergeable; the PR remains draft. Prerequisite #1735 has 14 successful
checks and is out of draft. Merge #1735 first, then refresh the upstream diff as
needed under the stacking guidance above. No additional source fix is justified
by today's CI sweep.

Follow-up #1708 is also green (17 successful checks), but its head `4f5f6cbc`
does not contain #1701's October 6 fix commit `ee14c2b2`. Refresh that stack after
landing the prerequisite/runtime work and repeat the lifecycle checks before merge.
