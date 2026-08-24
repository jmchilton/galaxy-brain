# Wheel Issues

Places where Galaxy assumes a source checkout and degrades silently under a wheel install. Collected while researching the `embedded_galaxy` engine, which is the first Planemo context with no Galaxy checkout anywhere.

Everything below was read in source and, where marked **[ran it]**, reproduced. Items marked **[reported, unverified]** came out of research and have not been independently confirmed.

## The shape of the problem

Every item is the same bug twice over: a path is resolved against the process working directory, and the failure is a plausible-looking path that does not exist rather than an error. Nothing raises. `os.path.join` and `os.path.abspath` are happy to build garbage, so the break surfaces much later, somewhere unrelated.

Galaxy already has the vocabulary to fix all of it - `running_from_source` exists in `lib/galaxy/util/properties.py` and already governs `tool_path`, `tool_data_path`, and `conda_auto_init`. Most of these are a missing branch on a flag that is already imported.

## Status

| #   | Issue                                             | Owner   | Filed                                                                           |
| --- | ------------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| 1   | `galaxy_directory()` returns `cwd.parent.parent`  | galaxy  | [#23339](https://github.com/galaxyproject/galaxy/issues/23339)                  |
| 2   | `galaxy_lib_dir` hardcodes `abspath("lib")`       | galaxy  | fix in progress on [#23350](https://github.com/galaxyproject/galaxy/pull/23350) |
| 3   | `use_metadata_binary` defaults False under wheels | galaxy  | no                                                                              |
| 4   | `remote_tool_eval` needs a checkout file path     | galaxy  | no                                                                              |
| 5   | `amqp_internal_connection` default is relative    | galaxy  | no                                                                              |
| 6   | Celery config comes from env vars only            | galaxy  | no                                                                              |
| 7   | Planemo must not rely on any of the above         | planemo | n/a                                                                             |
| 8   | `galaxy_virtual_env` trusts `VIRTUAL_ENV` only    | galaxy  | fix in progress on [#23350](https://github.com/galaxyproject/galaxy/pull/23350) |

---

## 1. `galaxy_directory()` — filed as galaxy#23339

**[ran it]** Under any site-packages install `in_packages()` is true, and with `GALAXY_INCLUDES_ROOT` unset `galaxy_directory()` returns `Path.cwd().parent.parent`. Reproduced in a clean venv with `galaxy-util==26.1.1`: returned a directory two levels above cwd, with no `static/` in it.

This is the root primitive. `galaxy-test-driver` inherits it at import time (`galaxy_root = galaxy_directory()`), and the published wheel carries the same coupling - ten files, no test data. See `TRANSPORT_AND_SERVER_MODEL.md` decision 3.

The checkout-free builder in [galaxy#23350](https://github.com/galaxyproject/galaxy/pull/23350) avoids this primitive, and the Galaxy test driver now delegates application construction to that builder. The remaining issue is the legacy checkout-root surface in `galaxy-test-driver`, not the Planemo launch seam.

## 2. `galaxy_lib_dir` hardcodes `abspath("lib")`

**[ran it - read in source]** `lib/galaxy/jobs/__init__.py:1191-1194`:

```python
@property
def galaxy_lib_dir(self):
    if self.__galaxy_lib_dir is None:
        self.__galaxy_lib_dir = os.path.abspath("lib")  # cwd = galaxy root
    return self.__galaxy_lib_dir
```

The comment states the assumption outright. The value is exported into every job script as `GALAXY_LIB` and prepended to `PYTHONPATH`.

**Why this is cheap to fix:** `None` is already a supported, exercised value. The job script template guards it (`if [ "$GALAXY_LIB" != "None" -a "$_use_framework_galaxy" = "True" ]`), `GALAXY_LIB_ADJUST_TEMPLATE` guards it the same way, and the Kubernetes runner deliberately passes `None` today with a docstring explaining why. So the sentinel path is established, not new.

**Proposed fix:**

```python
if self.__galaxy_lib_dir is None and running_from_source:
    self.__galaxy_lib_dir = os.path.abspath("lib")
```

Under wheels this yields `None`, the script skips the `PYTHONPATH` manipulation, and that is correct - `galaxy_ext` is already importable from the installed environment. Today it injects a nonexistent directory instead.

**Implementation status:** implemented on the Galaxy branch for [#23350](https://github.com/galaxyproject/galaxy/pull/23350). The existing package-installed application smoke test now asserts that a wheel-mode job wrapper reports `galaxy_lib_dir is None`; source-mode behavior is also checked and remains the absolute checkout `lib` directory. No new unit-test suite was added.

**Blast radius:** small. Source installs are unaffected; wheel installs stop getting a bogus path. The one behavior change is that a wheel install which was *accidentally* relying on cwd happening to be a checkout would stop.

## 3. `use_metadata_binary` should default to `not running_from_source`

Fixing #2 stops the bogus `PYTHONPATH` but does not make metadata work. Metadata runs in a **separate process** appended to the job script under every non-Celery strategy, including the `directory` default. The command is chosen at `lib/galaxy/metadata/__init__.py:273-280`:

- `use_bin=True` → `"galaxy-set-metadata"`, a console script declared in `packages/job_execution/pyproject.toml:51`. Wheel-native, no `PYTHONPATH` needed.
- `use_bin=False` (**the default**) → writes `metadata/set.py` doing `from galaxy_ext.metadata.set_metadata import set_metadata`, and returns `"python metadata/set.py"`.

`use_metadata_binary` is a destination parameter defaulting to `"False"` (`lib/galaxy/jobs/__init__.py:1154-1155`) with no config-schema entry, so it is job-conf-only.

The default path works under wheels **only if** the job's interpreter is the right one, which happens via `$GALAXY_VIRTUAL_ENV/bin/activate`. Before #8, Galaxy populated that value only from `os.environ.get("VIRTUAL_ENV")`, so an activated venv worked while a system install, conda environment, or venv invoked by absolute path could fail.

**Previously proposed fix:** default `use_metadata_binary` to `not running_from_source`.

**Triage correction:** this is not ready to implement as stated. Installing the wheel guarantees that the `galaxy-set-metadata` console script exists beside the environment's Python; it does **not** guarantee that directory is on `PATH`. Invoking a venv's Python by absolute path without activation is a concrete counterexample. The generated script and console script reach the same core metadata function, but the generated wrapper also records a traceback artifact on failure.

The wheel-installed job test now passes with the existing `use_metadata_binary: false` default after fixing #8: Galaxy recovers the venv from `sys.prefix` and the job script activates it. That is enough for Planemo's normal package environment and avoids a metadata behavior change. A system-prefix or non-activated conda install still needs a wheel-native interpreter contract before this issue can be called fixed generally.

**Blast radius:** medium. Changes the metadata command for all wheel installs, including production deployments. Worth confirming the binary and script paths are actually equivalent before proposing it upstream.

## 4. `remote_tool_eval` needs a real file from the checkout

The hard one. `lib/galaxy/jobs/command_factory.py:212-213`:

```python
'PYTHONPATH="$GALAXY_LIB:$PYTHONPATH" '
'"${GALAXY_PYTHON:-python}" "$GALAXY_LIB"/galaxy/tools/remote_tool_eval.py'
```

This is an explicit **file path into the checkout**, not merely a `PYTHONPATH` entry, and there is no console-script escape hatch - no `galaxy-remote-tool-eval` entry point exists anywhere in `packages/`. Under wheels it is simply broken, and fixing #2 makes it *more* obviously broken by setting `GALAXY_LIB` to `None`.

Reached via `--tool_evaluation_strategy remote`, which is also what makes Planemo set `metadata_strategy: extended`.

**Proposed fix:** add a console-script entry point and invoke that, mirroring `galaxy-set-metadata`. Larger than the others because it adds public surface.

**For us:** out of scope. The embedded engine does not need remote tool evaluation, and `PROBLEM_AND_GOAL.md` already scopes to parity on the ordinary path. Note it so nobody enables the flag and files a confusing bug.

## 5. `amqp_internal_connection` default is a relative path

**[ran it - read in source]** `config_schema.yml:4134-4136` defaults to `sqlalchemy+sqlite:///./database/control.sqlite?isolation_level=IMMEDIATE`. Resolved against the process CWD.

Galaxy builds a kombu connection from this **unconditionally** and starts a control-queue consumer thread, independent of `enable_celery_tasks` - so this is live regardless of it, and is a separate connection from `celery_conf.broker_url` (see `BACKGROUND_WORK.md` decision 13).

Planemo already overrides it into the config directory, so this is not a live bug for us. Recording it because it is the same failure mode and because the embedded engine must keep overriding it - inheriting the default would scatter a `database/` directory wherever the user happened to run `planemo`.

## 6. Celery's configuration comes from environment variables, never the app object

**[ran it - read in source]** `lib/galaxy/celery/__init__.py:146-159`. `get_app_properties()` reads `GALAXY_CONFIG_FILE` and `GALAXY_ROOT_DIR`, and falls off the end returning `None` when neither is set. `get_config()` then does `get_app_properties() or {}` and constructs a default `Configuration`.

`celery_app = init_celery_app()` runs at **import time** of `galaxy.celery`, which eight webapp service modules import at module scope - so this happens whenever the FastAPI app is built, regardless of `enable_celery_tasks`.

Both accessors are `lru_cache(maxsize=1)` and never invalidated, so the first resolution in the process wins permanently.

**For us:** live, not dormant. `BACKGROUND_WORK.md` decision 1 commits the embedded engine to running Celery, so every task execution calls `get_galaxy_app()`, whose fallback to `build_app()` would construct a **second complete Galaxy application** from these same env vars. `GALAXY_CONFIG_FILE` must be set before anything imports `galaxy.celery`, and `galaxy.app.app` must point at the constructed application; `BACKGROUND_WORK.md` decision 6 covers both.

## 7. Planemo side: rely on none of it

Our own rules, so the engine does not depend on unrelated checkout assumptions:

- Call `build_galaxy_web_app()` from a Galaxy branch containing #23350; do not import `driver_util` (avoids #1).
- Leave root-anchored config keys **unset** so Galaxy's package-relative resolution wins - `tool_path`, `static_dir` and friends. `driver_util` sets these explicitly, which is exactly why it needs a checkout.
- Set `use_metadata_binary: true` in the generated job config (works around #3 without waiting on it).
- Keep overriding `amqp_internal_connection` into the config directory (#5).
- Set `galaxy.app.app` to our constructed instance (#6).
- Never enable `--tool_evaluation_strategy remote` for this engine (#4).

## 8. `galaxy_virtual_env` trusts `VIRTUAL_ENV` only

**[ran it]** Starting Galaxy with `/path/to/venv/bin/python` while that venv is not activated leaves `VIRTUAL_ENV` unset. `MinimalJobWrapper.galaxy_virtual_env` consequently returned `None`, so the generated job script did not activate the environment. A bundled upload then ran its `python` commands with the first unrelated interpreter on ambient `PATH` and failed with exit code 127.

**Fix:** retain `VIRTUAL_ENV` when it is explicitly set, otherwise use `sys.prefix` when `sys.prefix != sys.base_prefix`. This is standard venv detection and leaves non-venv source and system-prefix installs unchanged.

**Verification:** the package-installed smoke test removes `VIRTUAL_ENV` and the venv's `bin` directory from `PATH`, starts Galaxy outside a checkout, creates a user and history over HTTP, uploads a text dataset, and waits for the job and external metadata to finish successfully. This simultaneously exercises #2, #3, #5, and the ordinary non-Celery portion of #6.

## The test that catches this

The package smoke test now does what nothing previously did: from a clean venv **outside any checkout**, it installs the wheels, constructs Galaxy, exercises the ASGI app over HTTP, runs the bundled upload tool with a pasted input, and asserts a successful job with metadata set.

That single test exercises #1, #2, #3, #5, #6, and #8 at once. Its former absence is why all of these stayed latent - every established path that ran Galaxy in-process did so from a checkout or an activated environment.

## Order to work in

1. Finish #2 and #8 upstream. Both fixes now pass a real job and metadata cycle from a wheel-installed, non-activated venv outside a checkout.
2. Apply the remaining Planemo-side workarounds in §7 - they are ours, cheap, and unblock the engine regardless of upstream.
3. Revisit #3 only for system-prefix and non-activated conda installs; the ordinary venv case no longer needs a metadata-default change.
4. Leave #4 unless something needs remote tool evaluation.

## Open Questions

- What wheel-native metadata command works when the environment's `bin` directory is not on `PATH`, and how should it preserve the generated wrapper's traceback artifact?
- Does anything else read `GALAXY_LIB` that would break on `None`? The two template guards are handled; a grep for other consumers came back clean, but the job-script surface is wide.
- Should #2 and #3 be one upstream issue or two? They are one user-visible symptom - metadata fails under wheels - reached through two independent defects.
