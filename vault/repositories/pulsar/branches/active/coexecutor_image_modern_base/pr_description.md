Fix the coexecutor staging image build, which can no longer produce an image with current Pulsar.

`docker/coexecutor/Dockerfile` builds `galaxy/pulsar-pod-staging`, the image Galaxy's Kubernetes, TES and GCP Batch runners use to stage files around a job. It starts `FROM conda/miniconda3` (Debian 9, Python 3.7) and copies a `py2.py3` wheel. Current Pulsar needs Python 3.10 or newer and builds a `py3` wheel, so the build fails. The newest published tag, `0.15.0.2`, is from 2023. It predates `dataset_collector_descriptions`, and with Galaxy 26.x its jobs end `ok` with discovered outputs missing (`docs/compatibility.rst` marks that pair broken).

| | `0.15.0.2` (published) | this branch |
| --- | --- | --- |
| Base | `conda/miniconda3`, Debian 9, Python 3.7 | `python:3.12-slim-trixie` |
| Pulsar | 0.15.0.dev1 | wheel of the checkout, `[amqp,galaxy_extended_metadata]` |
| Staging transport | curl (pycurl) | curl (pycurl manylinux wheel, no compiler) |
| CVMFS client, Slurm/DRMAA, munge | installed | dropped |
| Conda for containerless jobs | always | default, `--build-arg CONDA_INIT=false` to skip |
| `docker run --read-only` | n/a | works |
| Content size | 537 MB | 391 MB |

<details><summary>What changed</summary>

- **Dockerfile.** Installs the wheel and pycurl in one `pip install` from a BuildKit bind mount, so the wheel never lands in a layer. pycurl is kept on purpose: `pulsar.client.transport` uses curl for `remote_transfer` staging whenever pycurl imports. Without it staging falls back to `requests`, which reads each uploaded output fully into memory (835 MB peak RSS for a 400 MB output, against 72 MB with curl) and can't resume downloads. The CVMFS client, Slurm/DRMAA and munge are gone: coexecution never talks to a scheduler, and an unprivileged pod or TES container can't mount CVMFS. Conda is still installed for containerless jobs (`Client.get_pulsar_app_config` points them at `/pulsar_dependencies/conda`), behind a `CONDA_INIT` build arg.
- **Read-only root.** With no `tool_dependency_dir`, the in-task Pulsar app creates `dependencies/` under the working directory `/`, so under Funnel's default `--read-only` template `pulsar-submit` exits 1 before staging anything. The image sets `PULSAR_CONFIG_TOOL_DEPENDENCY_DIR=/pulsar_dependencies`; app config still wins. A follow-up PR fixes the default in Pulsar itself and removes this line.
- **Makefile.** Tags with the Pulsar version by default (`galaxy/pulsar-pod-staging:0.16.1.dev0` here) and takes `IMAGE` and `DOCKER_BUILD_ARGS` overrides. `docker-image` now depends on `dist`, so `make -j` can't build the image before the wheel exists, and a failing `make dist` stops the build.

</details>

<details><summary>How it was tested</summary>

- Full `make -C docker/coexecutor all` builds of the final branch, with and without `CONDA_INIT=false`. Under `docker run --read-only`, `pulsar-submit --help` and `pulsar-finish --help` work, `pycurl` and `galaxy.metadata.set_metadata` import, and `pulsar.client.transport.get_file` comes from the curl module.
- Images built from earlier revisions of this Dockerfile ran real jobs: Galaxy v26.1.2 → Pulsar TES runner → Funnel v0.12.3 ran the fastp and MultiQC steps of the IWC short-read QC workflow, with outputs checked against the IWC test assertions.
- Not tested: the Kubernetes coexecution path end to end.

</details>

## Risks

Low, and nothing here publishes an image. The only one-way step is whoever pushes a tag built from this, because the image no longer contains CVMFS, Slurm/DRMAA or munge.

<details><summary>Risk Details</summary>

- A deployment that mounted CVMFS or used the DRM tools inside the staging container would lose them in an image built from this. Nothing in the coexecution path uses them.
- The base image and pip dependencies aren't pinned, so two builds a month apart can differ.
- The default tag now follows the Pulsar version. A published tag still needs adding to `KNOWN_PULSAR_CONTAINER_VERSIONS` in `pulsar/client/setup_handler.py` by hand; the Makefile comment says so.
- The bind mount needs BuildKit, which has been Docker's default builder since 23.0.

</details>

<details><summary>Risk Review Advice</summary>

The question worth a maintainer's minute is whether the Kubernetes coexecution path ever relied on CVMFS or the DRM bits in this image. The read-only `ENV` line is a stopgap for jobs with a tool container; containerless Conda jobs still need a writable `/pulsar_dependencies`.

</details>

## Context

Part of a set of fixes found while running Galaxy jobs on GA4GH TES servers (Funnel, TESK) through Pulsar coexecution. Later PRs in the set stack on this one.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Three structural fixes to the Dockerfile and Makefile, verified with full image builds.</summary>

- The wheel was `COPY`ed and then `rm`ed in a later layer, which didn't shrink the image. It's now installed from a bind mount.
- Build-only `PIP_*` settings were `ENV` and leaked into every container. Now only `PIP_NO_CACHE_DIR` is set, and only on the install step. It has to stay a variable rather than `--no-cache-dir`, which doesn't reach the pip that builds sdist dependencies. An unused `PYTHON_IMAGE` build arg is gone.
- `all: dist docker-image` could race under `make -j`, and `cd ../..; make dist; cp` hid failures. `docker-image` now depends on `dist`.

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/coexecutor_image_modern_base/thermo_nuclear_review/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings.</summary>

Codex was given the diff, the full Dockerfile and Makefile, and the surrounding build and coexecution code. It reported nothing to fix.

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/coexecutor_image_modern_base/codex_review/). Run via gpt-6.1-sol at high effort.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01S9mD3nK1ghSGVVYtkV411H
