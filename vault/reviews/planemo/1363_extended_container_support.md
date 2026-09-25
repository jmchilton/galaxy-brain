# PR 1363 — Extended container support (singularity + container resolvers)

- **PR:** https://github.com/galaxyproject/planemo/pull/1363
- **Author:** bernt-matthias
- **Reviewed:** 2026-09-18 (rebased branch `container-ext-rebased`, 2 commits on `origin/master` @ `716a87a8`)
- **Worktree:** `~/projects/worktrees/planemo/pr/1363`
- **Size of surviving delta:** +147 / -15 across 3 files (`planemo/galaxy/config.py`, `planemo/options.py`, `tests/test_galaxy_config.py`)

## Summary

The rebase is small, sane, and mostly correct. `flake8` is clean and
`PLANEMO_SKIP_GALAXY_TESTS=1 pytest tests/test_galaxy_config.py -q` is green (46 passed,
3 skipped). No duplicate click option registration — I verified per-command `--help`
output for `serve`, `test`, `run`, `ci_setup`, `shed_test`, `upload_data`.

There is **one real behaviour regression** (`--biocontainers --no_singularity` now errors
where master fell back to Docker), **one missed reuse of an existing planemo abstraction**
(`_handle_kwd_overrides`' `kwds_gx_properties` list is exactly the "config-file kwd →
Galaxy property" idiom the new code reimplements inline), and **one structural
asymmetry** (`--singularity` gets wired in without its config options, which only work by
accident via `profile_database_options()`).

Test coverage is the weakest part: three of the nine new tests exercise code this PR does
not touch, and would pass unmodified on master.

## Supersession finding — what's actually left of #1363

The original PR had 4 commits. Two are fully superseded by master's migration to
`gxjobconfinit` (`galaxy-job-config-init`). `planemo/galaxy/config.py:1670-1693`
(`_handle_job_config_file`) now delegates to
`build_job_config(ConfigArgs.from_dict(**kwds), DevelopmentContext(...))`, and
`gxjobconfinit`'s `ConfigArgs` already carries `singularity`, `singularity_cmd`,
`singularity_sudo`, `singularity_sudo_cmd`, and `singularity_extra_volume`. Verified
directly:

```
$ python -c "from gxjobconfinit.generate import build_job_config, ConfigArgs, DevelopmentContext; \
             print(build_job_config(ConfigArgs.from_dict(singularity=True, \
                 singularity_extra_volume=['/data:ro']), DevelopmentContext(None, [])))"
...
      singularity_enabled: true
      singularity_cmd: singularity
      singularity_volumes: $defaults,/data:/data:ro
```

Likewise `planemo/options.py` on master already had every singularity option factory
(`singularity_enable_option`, `singularity_cmd_option`, `singularity_sudo_option`,
`singularity_sudo_cmd_option`, `singularity_config_options`,
`singularity_extra_volume_option`). What master *lacked* was the wiring:
`singularity_enable_option()` reached only `job_config_init_options()`
(`planemo/options.py:2385`), and `singularity_extra_volume_option()` reached nothing at
all.

So the surviving delta is genuinely just five things:

1. `singularity_enable_option()` + `container_resolvers_config_file_option()` into
   `galaxy_target_options()` (`planemo/options.py:1489,1491`).
2. `singularity_extra_volume_option()` into `galaxy_serve_options()`
   (`planemo/options.py:1546`) and `engine_options()` (`planemo/options.py:1746`).
3. `--biocontainers` satisfied by `--singularity` instead of forcing `--docker`.
4. `_handle_mulled_container_kwds()` extracted for testability
   (`planemo/galaxy/config.py:347-369`).
5. A new `--container_resolvers_config_file` → Galaxy property passthrough
   (`planemo/galaxy/config.py:1719-1721`).

That is a real, still-useful delta. `planemo test --singularity` and
`planemo test --biocontainers --singularity` are not achievable on master today — the
options do not exist on those commands.

## Findings

### 1. (High) Regression: `--biocontainers --no_singularity` now raises

`planemo/galaxy/config.py:354-363`:

```python
if not (kwds.get("docker", False) or kwds.get("singularity", False)):
    if (
        ctx.get_option_source("docker") != OptionSource.cli
        and ctx.get_option_source("singularity") != OptionSource.cli
    ):
        kwds["docker"] = True
    else:
        raise Exception("Specified --no_docker/--no_singularity and mulled containers together.")
```

By the time control reaches the inner `if`, we already know **neither** runtime is
enabled. The only question that matters is whether the user explicitly said `--no_docker`.
Folding `singularity`'s option source into the `and` means that a user who explicitly
typed `--no_singularity` (and never mentioned Docker) is refused the Docker fallback that
master gives them.

Reproduced against this branch:

```python
kwds = {"mulled_containers": True, "docker": False, "singularity": False}
# option sources: docker=default, singularity=cli
_handle_mulled_container_kwds(ctx, kwds)
# -> Exception: Specified --no_docker/--no_singularity and mulled containers together.
# master: kwds["docker"] == True
```

Master's equivalent (`git show origin/master:planemo/galaxy/config.py`, lines 364-372) only
consults `ctx.get_option_source("docker")`, so `--biocontainers --no_singularity` works
there.

Fix: drop the singularity clause from the guard.

```python
if not (kwds.get("docker", False) or kwds.get("singularity", False)):
    if ctx.get_option_source("docker") != OptionSource.cli:
        kwds["docker"] = True
    else:
        raise Exception("Specified --no_docker and mulled containers together.")
```

The error message should then name only `--no_docker` again, because that is the only
flag that can produce it.

### 2. (Medium) `--container_resolvers_config_file` reimplements `_handle_kwd_overrides`

`planemo/galaxy/config.py:1719-1721` adds a bespoke `if`-block inside
`_handle_container_resolution`. Planemo already has exactly this abstraction —
`_handle_kwd_overrides` at `planemo/galaxy/config.py:1753-1764`:

```python
kwds_gx_properties = [
    "tool_data_path",
    "job_config_file",
    "job_metrics_config_file",
    "dependency_resolvers_config_file",
    "vault_config_file",
]
```

`dependency_resolvers_config_file` is the direct sibling of the new option (same shape,
same purpose — hand Galaxy a plugin-config file). Adding `"container_resolvers_config_file"`
to that list is a one-line change and keeps the "pass a config file kwd to a Galaxy
property" knowledge in one place. The CLI option itself is already copied from the right
template (`dependency_resolvers_option()` at `planemo/options.py:270-276`) — the config
side should match too.

Counter-argument worth stating: `_handle_container_resolution` is called from *both*
`docker_galaxy_config` (`:289`) and `local_galaxy_config` (`:498`), while
`_handle_kwd_overrides` is only called from `local_galaxy_config` (`:508`). But see
finding 4 — the `docker_galaxy_config` call site is broken anyway, so that is not a
reason to keep the bespoke block.

### 3. (Medium) `--singularity` is wired in without `singularity_config_options()`

`galaxy_target_options()` composes `galaxy_docker_options()`
(`planemo/options.py:1242-1247`), which deliberately bundles
`docker_enable_option()` + `docker_config_options()`. The PR adds a bare
`singularity_enable_option()` next to it (`planemo/options.py:1489`) and relies on
`--singularity_cmd` / `--singularity_sudo` / `--singularity_sudo_cmd` arriving from
`galaxy_config_options()` → `profile_database_options()` → `singularity_config_options()`
(`planemo/options.py:1926-1933`).

That group exists for `--database_type postgres_singularity`, not for tool execution. The
coupling is invisible and fragile: if `profile_database_options()` ever stops pulling in
`singularity_config_options()`, `--singularity` silently loses every knob it needs. The
gap is already observable — `planemo ci_setup` composes `galaxy_target_options()` without
`galaxy_config_options()`:

```
$ planemo ci_setup --help | grep singularity
  --singularity / --no_singularity
$ planemo serve --help | grep singularity
  --singularity / --no_singularity
  --singularity_cmd TEXT
  --singularity_sudo / --no_singularity_sudo
  --singularity_sudo_cmd TEXT
  --singularity_extra_volume PATH
```

The symmetric fix is a `galaxy_singularity_options()` factory mirroring
`galaxy_docker_options()`, used in `galaxy_target_options()`. `planemo_option` tolerates
the resulting duplicate declaration of the config options only if the other group drops
them, so this wants a small cleanup of `profile_database_options()` as well — but it
leaves behind the reusable abstraction the repo owner asks for, instead of an accidental
one.

Related, smaller: `container_resolvers_config_file_option()` was placed in
`galaxy_target_options()`, while its sibling `dependency_resolvers_option()` lives in
`galaxy_config_options()`. `galaxy_config_options()` is the more consistent home, and it
would stop `planemo ci_setup` (which only installs Galaxy's deps) from advertising a
container-resolvers flag it cannot use.

### 4. (Medium) `--container_resolvers_config_file` is broken under `--engine docker_galaxy`

`_handle_container_resolution` is called from `docker_galaxy_config`
(`planemo/galaxy/config.py:289`), so the new property is set for the dockerized engine
too. But the volume list built at `planemo/galaxy/config.py:275-329` mounts only tool
directories, `config_directory`, the export directory, and `--docker_extra_volume`. A host
path passed to `--container_resolvers_config_file` is therefore not visible inside the
container, and Galaxy logs `Unable to find config file '<path>'`
(`galaxy/tool_util/deps/containers.py:307-308`) and silently falls back to the default
resolvers. Either append the file's directory to `volumes`, or restrict the option to the
local engine (which finding 2's fix does for free, since `_handle_kwd_overrides` only runs
in `local_galaxy_config`).

The same class of issue applies to `--singularity` under `--engine docker_galaxy`:
`docker_galaxy_config` never calls `_handle_job_config_file`, so `--singularity` is
accepted and silently ignored. Worth at least a warning.

### 5. (Low) `--docker --singularity` together silently prefers Docker

`gxjobconfinit` emits both `docker_enabled: true` and `singularity_enabled: true` on the
same destination when both kwds are set (verified above). Galaxy then walks its resolver
list in order and skips any resolver whose `container_type` is not enabled
(`galaxy/tool_util/deps/containers.py:387`); the default list puts every Docker resolver
ahead of its singularity counterpart (`:320-346`), so Docker wins and `--singularity`
becomes a silent no-op. Not an error, but the combination deserves either a warning or a
documented precedence rule. The new tests do not cover it.

### 6. (Low) `--biocontainers --singularity` still forces an involucro download

`_handle_container_resolution` (`planemo/galaxy/config.py:1714-1718`) calls
`build_involucro_context(ctx, **kwds)` unconditionally for `--biocontainers`, and
`planemo/mulled.py:27-28` does `ensure_installed(involucro_context, True)` — a network
fetch that raises on failure. involucro is the mulled *build* tool and is Docker-only;
Galaxy itself declines to load `BuildMulledDockerContainerResolver` /
`BuildMulledSingularityContainerResolver` when the Docker CLI is absent
(`galaxy/tool_util/deps/containers.py:336-345`). Under `--biocontainers --singularity` on
an HPC node with no Docker and no outbound network, this is a hard failure on a code path
that has no reason to run. Pre-existing, but this PR is what makes that combination a
supported configuration.

Good news on the substance: I confirmed Galaxy's default resolver list does include
`CachedMulledSingularityContainerResolver` and `MulledSingularityContainerResolver` when
`enable_beta_mulled_containers` is on (`galaxy/tool_util/deps/containers.py:320-346`),
which planemo already sets at `planemo/galaxy/config.py:1715`. So
`--biocontainers --singularity` really does resolve biocontainers via
`docker://quay.io/biocontainers/...` — no extra Galaxy properties are needed.

### 7. (Medium) Three of the nine new tests do not test this PR

`tests/test_galaxy_config.py:512`, `:520`, `:528` all go through `_write_job_config` →
`_handle_job_config_file`. That function is **not touched by this branch** (confirm with
`git diff origin/master...HEAD -- planemo/galaxy/config.py`), and neither is
`gxjobconfinit`. These three tests pin third-party behaviour; they would pass on
unmodified master. They will catch a `gxjobconfinit` upgrade regression, which has some
value, but they provide zero coverage of the change this PR actually makes.

What is untested is the entire options.py delta — the real risk surface. Nothing asserts
that `--singularity` is reachable from `planemo test`, that
`--container_resolvers_config_file` exists on `planemo serve`, or that no option got
registered twice. A cheap and genuinely regression-catching test:

```python
def test_singularity_options_wired_into_serve():
    from planemo.commands.cmd_serve import cli
    names = [p.name for p in cli.params]
    assert names.count("singularity") == 1
    assert names.count("singularity_extra_volume") == 1
    assert names.count("container_resolvers_config_file") == 1
```

`tests/test_galaxy_config.py:536-547` (the two `container_resolvers_config_file` tests) are
close to tautological — they restate the two-line implementation. They are cheap enough to
keep, but they are not what makes the feature safe.

### 8. (Low) `config["execution"]["environments"][config["execution"]["default"]]` is fine, but repeat it once

Following the `default` pointer is the right call — better than hardcoding `"local"` — and
it *is* an assertion about gxjobconfinit's contract rather than its template text, which is
the correct level. The nit is that the expression appears verbatim at
`tests/test_galaxy_config.py:514`, `:522`, and `:530`; a two-line
`_default_environment(config)` helper alongside `_write_job_config` would read better.

### 9. (Low) `exists=True` + `use_global_config=True` is safe here

I checked this specifically against the #1714 (`config-option-conversion` branch) problem.
Two reasons it does not apply:

- On master, `planemo/config.py:63-75` (`_find_default`) returns global-config values
  straight out of the YAML without running them through the click `ParamType`, so
  `exists=True` is enforced only for CLI-supplied values today.
- The #1714 fix (`a9162611`, "Drop exists=True from `--tool_dependency_dir`") was needed
  because profiles *synthesize* `<profile_dir>/deps` and planemo creates it itself via
  `_ensure_directory`. A container-resolvers config file is never synthesized by planemo —
  it must pre-exist, exactly like `--dependency_resolvers_config_file`
  (`planemo/options.py:273`) and `--job_config_file` (`planemo/options.py:531`), both of
  which already carry `exists=True` + `use_global_config=True`.

So the new option matches the established precedent and would survive #1714 landing. No
change needed; noting it because the question was reasonable.

### 10. (Low) Help text / docs gaps

- `singularity_extra_volume_option()` help (`planemo/options.py:659`) reads "Extra path to
  mount if --engine docker or `--biocontainers` or `--singularity`." The `--engine docker`
  clause is copy-pasted from `docker_extra_volume_option()` and is wrong — the
  `docker_galaxy` engine mounts `--docker_extra_volume`, never
  `--singularity_extra_volume`.
- The updated `--biocontainers` help says "Requires --docker or --singularity". That is
  accurate for the Galaxy engines but not for the cwltool/toil paths
  (`planemo/cwl/run.py:88`, `planemo/cwl/toil.py:37`), which consume `mulled_containers`
  independently.
- `docs/commands/*.rst` are checked in and regenerated by `make ready-docs`
  (`scripts/commands_to_rst.py`); they are stale after this change. No CI job enforces it,
  so it is a convention gap rather than a red build.
- No prose docs. `docs/_running_slurm.rst:57-62` documents `--singularity` only for
  `profile_job_config_init`. The new `planemo test --singularity` /
  `planemo test --biocontainers --singularity` story — the actual user-facing win here —
  is undocumented. `docs/_writing_dependencies_containers*.rst` is where it belongs.
- No `HISTORY.rst` entry under `0.75.48.dev0`. Optional (entries are usually generated at
  release from PR titles) but recent PRs like `95601fe8` add one by hand.

### 11. (Info) Import hygiene and extraction placement — clean

All imports are at module top level in both `planemo/galaxy/config.py:33-55` and
`tests/test_galaxy_config.py:1-39`. No function-local imports introduced.

`_handle_mulled_container_kwds` is well placed (module-private, adjacent to its caller,
consistent with the `_handle_*` family already in the file) and the docstring is
appropriately short. One loose end: the extracted block replaced the comment
`# Duplicate block in docker variant above.` That comment was already stale on master —
`docker_galaxy_config` has no such block — but it was the only marker that somebody once
thought the dockerized engine needed this reconciliation too. Now that a reusable helper
exists, either call it from `docker_galaxy_config` or note in the commit why the docker
variant does not need it.

## Recommendation: land it, after fixing #1 and #2

The delta is **not** redundant. gxjobconfinit made the *generation* half of #1363
unnecessary, but it did nothing about the *wiring*, and without the wiring there is no way
to ask `planemo test` or `planemo serve` for singularity execution at all. That is a real
capability gap and this is the right, minimal way to close it. bernt-matthias' original
motivation survives master's evolution intact.

Blocking before merge:

- **Finding 1** — the `--no_singularity` regression, plus a test that pins the corrected
  semantics. `test_mulled_containers_rejects_explicit_opt_out`
  (`tests/test_galaxy_config.py:485-491`) sets *both* sources to `cli`, so it passes under
  both the buggy and the correct logic and does not protect this.
- **Finding 2** — move the property passthrough into `_handle_kwd_overrides`'
  `kwds_gx_properties`. One line, removes the bespoke block, and incidentally fixes
  finding 4.

Strongly recommended, non-blocking:

- **Finding 3** — a `galaxy_singularity_options()` mirroring `galaxy_docker_options()`.
  This is the "leave behind a reusable abstraction" ask; the current shape works only by
  accident of `--database_type postgres_singularity`.
- **Finding 7** — one test that actually asserts the option wiring. Consider dropping or
  relabelling the three gxjobconfinit tests so the suite does not overstate its coverage.
- **Finding 10** — regenerate `docs/commands/*.rst`, fix the `--singularity_extra_volume`
  help string, and add a short prose section on container runtimes for `planemo test`.

Findings 5, 6, 8, and 9 are follow-ups, not merge conditions.

## Follow-ups

- [ ] Fix `--biocontainers --no_singularity` fallback; add a test with only
      `singularity` sourced from `cli`.
- [ ] Move `container_resolvers_config_file` into `_handle_kwd_overrides`.
- [ ] Introduce `galaxy_singularity_options()`; untangle `singularity_config_options()`
      from `profile_database_options()`.
- [ ] Add a wiring test over `cmd_serve.cli.params` / `cmd_test.cli.params`.
- [ ] Decide `--docker --singularity` precedence: warn, or document Docker wins.
- [ ] Skip the involucro download when `--biocontainers` runs under `--singularity`.
- [ ] Warn (or reject) `--singularity` / `--container_resolvers_config_file` under
      `--engine docker_galaxy`.
- [ ] `make ready-docs`; fix `--singularity_extra_volume` help text; document
      `planemo test --singularity` in `docs/_writing_dependencies_containers*.rst`.

---

## Status after review (2026-09-18)

Fixed on `container-ext-rebased` in `464a0af4`:

- **Finding 1** — the fallback guard no longer consults `singularity`'s option source. Only an
  explicit `--no_docker` can leave `--biocontainers` with no runtime. Verified across all six
  flag combinations; `--biocontainers --no_singularity` enables Docker again, matching master.
- **Finding 2** — `container_resolvers_config_file` moved into `_handle_kwd_overrides`'
  `kwds_gx_properties`, next to `dependency_resolvers_config_file`. The bespoke block in
  `_handle_container_resolution` is gone. This also resolves finding 4's placement half.
- **Finding 3** — new `galaxy_singularity_options()` (enable + config), swapped in where
  `singularity_config_options()` was used. No command now offers `--singularity` without
  `--singularity_cmd`; `ci_setup` no longer offers a bare enable flag.
- **Finding 7** — `test_mulled_containers_rejects_explicit_opt_out` set both option sources to
  `cli`, so it passed under the buggy and correct logic alike. Split into three cases:
  `--no_docker` raises, `--no_singularity` falls back to Docker, both raise.
- **Finding 10 (partial)** — `--singularity_extra_volume` help no longer claims `--engine docker`.

Still open: finding 4's docker_galaxy mount gap, 5, 6, 8, and the docs half of 10.

`tests/test_galaxy_config.py`: 48 passed, 3 skipped. flake8/black/isort clean.
