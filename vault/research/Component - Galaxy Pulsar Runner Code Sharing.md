---
type: research
subtype: component
tags: [research/component, galaxy/lib, galaxy/admin, galaxy/tools/runtime, galaxy/testing]
component: "Galaxy Pulsar Runner Code Sharing"
galaxy_areas: [lib, admin, tools/runtime, testing]
status: draft
created: 2026-08-17
revised: 2026-08-17
revision: 1
ai_generated: true
summary: "Four code-sharing channels between Galaxy and Pulsar, a manually synced util mirror with 20 of 23 files drifted, and stringly-typed job status mapping"
sources: ["/Users/jxc755/projects/repositories/galaxy-brain/.ingest-dossiers/Component-Galaxy-Pulsar-Runner-Code-Sharing.md"]
related_notes:
  - "[[Component - Backend Dependency Management]]"
  - "[[Component - Worktree Bootstrapping]]"
  - "[[Component - Private Object Stores]]"
  - "[[Component - Post Job Actions]]"
  - "[[Component - YAML Tool Runtime]]"
  - "[[Component - Tool Testing Infrastructure]]"
  - "[[PR 20936 - Resource Requirements via TPV]]"
---

# Galaxy Pulsar Runner Code Sharing

## Overview

Job-runner code crosses the Galaxy/Pulsar repository boundary through **four** distinct channels, not the two the folk description suggests. The two commonly-cited "paths" are really two Python *import paths* for the same logical source — `galaxy.jobs.runners.util.*` and `pulsar.managers.util.*` — and the important fact is that **both are importable inside a single Galaxy process simultaneously**, because Galaxy hard-depends on a Pulsar package that ships its own copy of the mirror. They have drifted: 20 of 23 shared files differ.

Verified against Galaxy `origin/dev` @ `08d4c8af5d` and Pulsar `origin/master` @ `8e9d162953`, on 2026-08-17.

**Scope**: the sharing mechanics — channels, sync procedure and drift, status-vocabulary translation, CI coupling. Not a Pulsar deployment guide, and not Pulsar's runtime architecture (AMQP, staging, coexecution) except where it explains a seam.

## Channel inventory

| # | Channel | Direction | Mechanism | Enforcement |
|---|---|---|---|---|
| 1 | `lib/galaxy/jobs/runners/util/` ↔ `pulsar/managers/util/` | bidirectional, ad hoc | manual file-for-file copy | **none** |
| 2 | `pulsar-galaxy-lib` PyPI package | Pulsar → Galaxy | hard runtime dependency | version pin |
| 3 | `galaxy-*` PyPI packages | Galaxy → Pulsar | declared requirements | version floors |
| 4 | Galaxy modules run *on the Pulsar host* | Galaxy → Pulsar (runtime) | operator-installed checkout via `galaxy_home` / `$GALAXY_LIB` | **none** |

**Channel 1** is the vendored mirror. Both `__init__.py` files carry the identical docstring — "This module should contain functionality shared between Galaxy and the Pulsar" — and no script, Make target, or CI check performs or verifies the sync.

**Channel 2** makes Pulsar's client mandatory for every Galaxy install: `pyproject.toml:75` lists `pulsar-galaxy-lib>=0.15.15` in the main dependency list, pinned to `==0.15.15` in `lib/galaxy/dependencies/pinned-requirements.txt:189`. See [[Component - Backend Dependency Management]] for the pinning machinery and [[Component - Worktree Bootstrapping]] for how it lands in a dev environment.

One codebase produces two PyPI identities. `pulsar/setup.py:44` switches the package name on an env var (`setup.py:12-13`), and `setup.py:29-30` strips every `galaxy-*` requirement when building the lib variant — a **manual dependency-cycle break** guarded by a single list comprehension with no test asserting it. Crucially `setup.py:55-80` ships the same package list either way, including `pulsar.managers.util` and its subpackages. That is the root of the two-paths problem: `pulsar-galaxy-lib` delivers Pulsar's entire copy of the mirror into every Galaxy environment.

**Channel 3** runs the other way — Pulsar's `requirements.txt` declares `galaxy-job-metrics>=21.9.0`, `galaxy-objectstore>=19.9.0`, `galaxy-tool-util>=19.9.0`, `galaxy-util>=23.0`. Floors of `19.9.0` in a repo read in 2026. The `objectstore` coupling connects to [[Component - Private Object Stores]].

**Channel 4** is Galaxy code executed on the remote node: `lib/galaxy/tools/remote_tool_eval.py` (see [[Component - YAML Tool Runtime]]), `lib/galaxy/metadata/set_metadata.py`, and `lib/galaxy/job_execution/container_monitor.py`. `remote_tool_eval.py:11-33` imports across a wide surface of Galaxy internals.

Galaxy does have a deliberate seam here, which is more interesting than the absence of one would be. The entry points actually invoked on the Pulsar node live in `lib/galaxy_ext/` — `metadata/set_metadata.py`, `container_monitor/monitor.py`, `expressions/handle_job.py` — a package whose `__init__.py` states the intent directly: things "loaded from outside Galaxy" and kept clear of the `galaxy` namespace, "which may be provided by other packages". The libraries above are what those entry points call.

What is unconstrained is the *version*. `lib/galaxy/jobs/command_factory.py:212-213` emits a command that runs `remote_tool_eval.py` out of `$GALAXY_LIB`, and `$GALAXY_LIB` comes from the Pulsar side — derived from the `galaxy_home` manager option or the `GALAXY_HOME` env var (`pulsar/managers/base/__init__.py:138-148`), prepended to `PYTHONPATH` by `DEFAULT_JOB_FILE_TEMPLATE.sh`, and read back by Galaxy at `runners/pulsar.py:1066-1082`. Pulsar's `extras_require['galaxy_extended_metadata']` governs a *different* path — metadata work Pulsar performs itself — and supplies none of `galaxy.tools`, `galaxy.model.store`, or `galaxy.datatypes`. So the remote Galaxy is whatever full checkout the Pulsar operator pointed `galaxy_home` at, constrained by nothing: no floor, no pin, no check.

## Why the sync must be manual

The design is deliberate. `pulsar/managers/util/cli/__init__.py:21-23` discovers plugins relative to whichever package root loaded the class:

```python
module_prefix = self.__module__
self.cli_shells = plugins_dict(f"{module_prefix}.shell", "__name__")
```

The same source therefore works unmodified under either root. That path-agnosticism is what makes verbatim copying viable — and simultaneously removes the natural seam for factoring the code into one shared package.

Two files resolve the dual path at runtime, and they **disagree with each other**:

- `util/cli/factory.py:1-10` tries `galaxy.jobs.runners.util.cli` and falls back to `pulsar.managers.util.cli` on `ImportError`. This file is byte-identical in both repos — written to be copied verbatim and resolve at load time.
- `util/cli/shell/rsh.py:5` does `from pulsar.managers.util.retry import RetryActionExecutor` — unconditional, no fallback. Galaxy has **no `retry.py` of its own**. A file inside Galaxy's vendored copy of the shared tree reaches back into the Pulsar package; the vendored tree is not self-contained. It resolves only because Channel 2 ships `pulsar.managers.util`.

Two files in the same directory take opposite positions on whether Pulsar is optional. That inconsistency is the sharpest symptom of the mess.

### Full cross-repo import inventory

Grepping Galaxy's `lib/` for `pulsar` imports gives ten hits, and they are not confined to the Pulsar runner:

| Site | Import | Note |
|---|---|---|
| `jobs/__init__.py:37` | `pulsar.client.staging.COMMAND_VERSION_FILENAME` | **top-level, in core job machinery** — loads for every job on every Galaxy install, Pulsar configured or not |
| `metadata/set_metadata.py:24` | same constant | guarded |
| `objectstore/pulsar.py:4` | `pulsar.client.manager.ObjectStoreClientManager` | guarded |
| `jobs/runners/drmaa.py:90` | `pulsar.managers.util.drmaa.DrmaaSessionFactory` | function-level; **Galaxy has no `drmaa/` in its own util tree** |
| `jobs/runners/pulsar.py` | `pulsar.core` (`:19`), `pulsar.client` (`:22`), `pulsar.client.staging` (`:39`), `pulsar.client.client` (`:68`) | expected |
| `util/cli/factory.py:7`, `util/cli/shell/rsh.py:5` | mirror-namespace | as above |

Two consequences. First, `jobs/__init__.py:37` is the strongest evidence that Pulsar is genuinely mandatory rather than an optional runner — it is imported at module scope in the code path every job takes. Second, `drmaa.py:90` means Galaxy's DRMAA runner depends on `pulsar.managers.util.drmaa`, a directory that exists **only** in Pulsar's copy of the mirror. Together with `retry.py`, that makes two of the seven "Pulsar-only" files actually load-bearing for Galaxy — the mirror is not two parallel copies so much as one copy plus a partial one that reaches across for the rest.

## Drift inventory

Every path present in both trees was diffed. **23 shared files, 3 identical, 20 diverged.**

Identical: `cli/factory.py`, `cli/job/slurm_torque.py`, `external.py`.

Behavioural divergences (not cosmetic):

| File | Divergence |
|---|---|
| `__init__.py` | Galaxy's `runner_states` has `TOOL_TIMELIMIT_REACHED`; Pulsar lacks it |
| `cli/shell/__init__.py` | Galaxy marks `execute()` `@abstractmethod`; Pulsar leaves it concrete (both mark `__init__`) |
| `sudo.py` | Pulsar passes `text=True` to `Popen`; Galaxy does not (str vs bytes) |
| `cli/job/slurm.py` | 173 L vs 80 L — Galaxy 2.2× larger |
| `pykube_util.py` | 356 L vs 157 L — Galaxy 2.3× larger; effectively separate files now |
| `job_script/__init__.py` | 193 L vs 232 L — Pulsar larger; divergence runs both ways |

Files unique to one side (5 Galaxy, 7 Pulsar) partly show independent cloud-batch development — Galaxy grew `fork_safe_write.py` and `gcp_batch/`; Pulsar grew `aws_batch.py`, `cvmfsexec.py`, `gcp_util.py`, `tes.py`. But "unique to Pulsar" does not mean "unused by Galaxy": `retry.py` and `drmaa/` are both Pulsar-only *and* imported by Galaxy (see above). The seventh, `job_script/MEMORY_STATEMENT.sh`, is the sharpest exhibit in the whole note — see below.

Three factors are visible in the diffs. The first plausibly masks the others, though that ordering is a hypothesis, not a measurement. **Formatter/linter skew** (blank lines, import ordering, docstring style) inflates every diff until a `diff -r` between the trees is unreadable without a normalisation pass. Underneath sit **Python-version skew** (Galaxy adopted walrus operators and inline annotations, Pulsar did not) and **genuine feature divergence**.

## Job status translation

Pulsar's vocabulary lives in `pulsar/managers/status.py` as module-level string constants, opening with `# TODO: Make objects.` — `preprocessing`, `queued`, `running`, `complete`, `cancelled`, `failed`, `postprocessing`, `lost`, plus `is_job_done()`.

Galaxy consumes it in `lib/galaxy/jobs/runners/pulsar.py:362-388`, `_update_job_state_for_status`. Three findings:

1. **Stringly-typed across the repo boundary.** Galaxy compares against bare literals (`["complete", "cancelled"]`, `["failed", "lost"]`, `"running"`) and never imports `pulsar.managers.status` — despite hard-depending on the package that ships it. The shared enum exists, is reachable, and is unused. A rename on the Pulsar side is a silent runtime failure, not an `ImportError`.
2. **Three statuses handled only by omission.** `preprocessing`, `queued`, and `postprocessing` match no branch and fall through to "keep watching". Correct today, but a new Pulsar status is indistinguishable from a transient one.
3. **The `STOPPED` interjection is the compensating hack.** Mid-handler, Galaxy consults its *own database state* rather than the incoming Pulsar status, and if the job was stopped Galaxy-side it calls `client.kill()`. Galaxy-initiated stop has no representation in Pulsar's vocabulary, so reconciliation is bolted into the status handler. Its placement — `complete`/`cancelled` at `:369-371`, the `STOPPED` check at `:372-376`, `failed`/`lost` at `:377-384` — is load-bearing and undocumented.

Structurally this is the same failure mode as [[Problem - YAML Tool Post-Hoc State Divergence]]: two sources of truth that are supposed to agree, with no test proving they do.

## The sync was declared dead in 2015 and kept happening

From `pulsar/HISTORY.rst`, with release headers resolved:

| Release | Date | Entry |
|---|---|---|
| 0.6.0 | 2015-12-23 | "Pulsar now depends on the new `galaxy-lib` Python package **instead of manually synchronizing Python files across Pulsar and Galaxy**." |
| 0.7.0 | 2016-08-26 | "Updated cluster slots detection for SLURM from Galaxy." |
| 0.9.1 | 2019-05-01 | "Sync \"recent\" galaxy runner util changes." (PR 177) |
| 0.14.14 | 2022-10-30 | "Bring in updated Galaxy runner util code." (PR 303) |
| 0.15.0 | 2023-04-13 | "Re-import MEMORY_STATEMENT.sh from Galaxy." (PR 297) |

### The `MEMORY_STATEMENT.sh` exhibit

The last recorded sync illustrates the failure mode better than any row in the drift table. Both repos define `MEMORY_STATEMENT_DEFAULT_TEMPLATE` on **line 27** of `job_script/__init__.py`, and load **different filenames**:

- Galaxy: `resource_string(__name__, "MEMORY_STATEMENT_TEMPLATE.sh")`
- Pulsar: `resource_string(__name__, "MEMORY_STATEMENT.sh")`

Pulsar ships both files; its `MEMORY_STATEMENT_TEMPLATE.sh` is loaded by nothing. Meanwhile Galaxy commit `5dde30a9db` (2022-10-12), titled *"Synchronize job script module with Pulsar fixes."*, **deleted** `MEMORY_STATEMENT.sh` from Galaxy and added `MEMORY_STATEMENT_TEMPLATE.sh` in its place. Pulsar's 0.15.0 entry six months later (2023-04-13) reads *"Re-import MEMORY_STATEMENT.sh from Galaxy"* — importing, under that name, a file Galaxy no longer had.

That commit title is also independent evidence for the "bidirectional" label on Channel 1: Galaxy syncs *from* Pulsar as well.

### Timeline reading

The 0.6.0 entry announces the retirement of the manual sync. Every subsequent entry *is* a manual sync. The packaging route never covered the runner util tree — it covered `galaxy.util`, `galaxy.tool_util`, and friends. The mirror survived the migration meant to eliminate it, without an owner.

Last recorded sync: 2023-04-13, roughly three years and four months before this analysis — consistent with the 21-of-24 drift. The scare quotes in *Sync "recent" galaxy runner util changes* suggest the 2019 pass was already understood to be partial.

## CI coupling is one-directional

**Galaxy breakage is caught — in Pulsar's CI.** `pulsar/.github/workflows/galaxy_framework.yaml` checks out `galaxyproject/galaxy` at both `dev` and `master`, builds a Pulsar wheel, swaps it into Galaxy's pins via `tools/replace_galaxy_requirements_for_ci.py`, and runs Galaxy's own framework suite against it across `directory` and `extended` metadata strategies. The catch happens on Pulsar's PRs, not Galaxy's. See [[Component - Workflow Testing]] for the suite being driven.

**Galaxy → Pulsar is disabled.** `test_galaxy_packages_for_pulsar.yaml:20-21` carries `if: false` with the comment "disabled because it is currently redundant with `test_galaxy_packages.yaml`". That claim is **half right**:

- *Package coverage is genuinely subsumed.* `packages_for_pulsar_by_dep_dag.txt` (`tool_util_models, util, job_metrics, objectstore, tool_util`) is a strict subset of the main list.
- *Marker coverage differs, but is covered elsewhere.* `packages/test.sh:93-97` shows `--for-pulsar` drops the `-m 'not external_dependency_management'` exclusion, so only that variant ran the marked mulled/conda tests in `test/unit/tool_util/mulled/` (see [[Component - Tool Testing Infrastructure]]). Those tests are **not** orphaned, however: `.github/workflows/mulled.yaml` is live and runs `tox -e mulled`, and `tox.ini:52` sets `mulled: marker=external_dependency_management` — i.e. a dedicated workflow runs exactly that marked set on every push and PR. `tox.ini:57` gives the plain `unit` env the mirror-image `marker=not external_dependency_management`.

So the "redundant" justification largely holds, and disabling the job did **not** open the coverage hole it first appears to. The one residual difference is narrow and unverified: `--for-pulsar` ran the marked tests inside each package's *isolated throwaway venv*, installed from that package's own `pyproject.toml`, whereas `mulled.yaml` runs them against a full Galaxy environment. Only the former would catch a missing or wrong dependency declaration in, say, `galaxy-tool-util`'s own metadata. Sharpening rather than blunting the point: `mulled.yaml` carries `paths-ignore: packages/**`, so changes under `packages/` do not even trigger it — nothing now exercises the *packaged* mulled path. Whether that has ever caught a real bug is unknown; this is inference from reading the two harnesses, not a demonstrated regression.

Galaxy-side integration coverage exists — eight `test/integration/test_pulsar_embedded*.py` modules plus job-conf fixtures — but these exercise the *embedded* Pulsar path using the in-process manager, so they do not test the vendored-mirror drift or the two-import-path resolution.

## Seams for de-messing

Ordered by cost, honest where there is no clean answer:

1. **Import Pulsar's status constants instead of literals.** Galaxy already hard-depends on the package defining them. A few-line change converting silent drift into an `ImportError`. Smallest and most concrete item here.
2. **Normalise formatting across both trees in one no-op commit.** Removes the noise hiding the real divergence; a precondition for anything below.
3. **Resolve the `rsh.py` / `factory.py` inconsistency.** Either give Galaxy its own `retry.py`, or adopt the try/except pattern. Currently the directory contradicts itself.
4. **Extract the mirror into a real package** — the obvious answer, and there is **no clean seam**. The `self.__module__`-relative plugin discovery is *designed* around living under two roots; a shared package would have one root and would need that indirection removed, plus entry in the Pulsar package DAG and survival of the `setup.py` cycle-break. Real work, not a refactor.
5. **A drift check in CI.** The cheapest durable guard: diff the two trees and fail on unexpected changes with an allow-list for intentional divergence. Cannot live in Galaxy's CI alone (it needs both checkouts) — Pulsar's `galaxy_framework.yaml` already checks out both and is the natural host.

## Notes

Job destination routing that selects the Pulsar destinations this runner services is covered in [[PR 20936 - Resource Requirements via TPV]]. Post-job processing on the Galaxy side of the same lifecycle is [[Component - Post Job Actions]].

The relevant PRs for the sync history are Pulsar PRs (177, 297, 303), not Galaxy PRs, so `related_prs` is left empty rather than polluted with numbers that would resolve against the wrong repository.
