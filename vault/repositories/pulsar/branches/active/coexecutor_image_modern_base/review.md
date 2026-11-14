# Review: `coexecutor_image_modern_base`

- Branch: `coexecutor_image_modern_base` on the jmchilton fork, diffed against `origin/master` (`08dedcb`). Commits `a87897c` and `1138cd0`.
- Reviewed commit: `1138cd0971f0925c85c77e70c0094dc1bcdd8d09`
- Date: 2026-11-14
- Reviewer: stage 3 review agent, Claude Opus, effort high

The image builds from a clean checkout, runs, and resolves Conda dependencies for containerless jobs. Dropping CVMFS, Slurm/DRMAA and munge is safe for coexecution. Dropping pycurl is not. It silently changes how every output is staged back to Galaxy, and the Dockerfile comment that justifies it is wrong.

## Findings

### P1 1: Dropping pycurl makes stage-out read each output file fully into memory

`docker/coexecutor/Dockerfile:14-18`. `pulsar/client/transport/__init__.py:15-24` picks the module-level `get_file` and `post_file` used by `remote_transfer` staging by whether pycurl can be imported, not by `PULSAR_CURL_TRANSPORT`. That variable only chooses the transport class `get_transport` returns for Pulsar client API calls (`_get_transport_type`, line 38). The 0.15.0.2 image has pycurl, so its staging used `pulsar.client.transport.curl`. This image has neither pycurl nor `requests_toolbelt`, so staging falls back to `pulsar.client.transport.requests`. Its `post_file` does `requests.post(url, files={'file': f})` (`requests.py:26`), which builds the whole multipart body in memory. It even logs a warning saying so.

`remote_transfer` is Galaxy's default file action for every coexecution runner (`COEXECUTION_DESTINATION_DEFAULTS` in Galaxy's `lib/galaxy/jobs/runners/pulsar.py:1308`). So every output of every Kubernetes, TES and GCP Batch job goes through this path. I measured it by posting a 400 MB file with `post_file` to a local HTTP server inside each image:

| Image | Transport | Peak RSS |
| --- | --- | --- |
| this branch (`wes-tes/pulsar-pod-staging:0.16.1.dev0-1138cd0`) | `requests` | 835 MB |
| `galaxy/pulsar-pod-staging:0.15.0.2` | `curl` | 72 MB |

A multi-GB BAM output in a memory-limited pod or TES task is OOM-killed during stage-out. Stage-in also loses the curl transport's resume of partial downloads (`curl.get_file`). The commit message of `a87897c` and the demo doc repeat the wrong premise ("pycurl is opt-in (`PULSAR_CURL_TRANSPORT=1`)").

Fix: install pycurl again. It no longer needs a compiler: `pip download --only-binary=:all: pycurl` on this base fetches `pycurl-7.49.0-cp312-cp312-manylinux_2_28_x86_64.whl`, which bundles libcurl 8.23. With it installed, `pulsar.client.transport.get_file.__module__` is `pulsar.client.transport.curl` (checked in the image). For example, `pip install "$(ls /tmp/pulsar_app-*.whl)[amqp,galaxy_extended_metadata]" pycurl`. Adding `requests-toolbelt` instead would fix the memory use but not resume. Fix the Dockerfile comment and the commit message to match. Separately, Pulsar could declare `requests-toolbelt` or pycurl as a dependency so that no install gets this fallback silently, but that is beyond this branch.

### P3 1: Nothing builds the image in CI

No workflow under `.github/` builds `docker/coexecutor/Dockerfile`. That is how it rotted until it could no longer build at all (`conda/miniconda3`, the `py2.py3` wheel glob). Fix: add a cheap job that runs `make -C docker/coexecutor all DOCKER_BUILD_ARGS="--build-arg CONDA_INIT=false"`. Then smoke-test the image: `pulsar-submit --help`, `pulsar-finish --help` under `docker run --read-only`, and `python -c "import pycurl"` once P1 1 is fixed.

### P3 2: Base image and dependencies float

`docker/coexecutor/Dockerfile:5, 18, 27`. `python:3.12-slim-trixie` is a tag, not a digest. The debrief's `sha256:5e2bdb1b...` is only the digest this build happened to resolve; it is not pinned in the Dockerfile. pip resolves all of Pulsar's requirements at build time (today galaxy-* 26.1.2, kombu 5.7.0, requests 2.34.2). `_pulsar-conda-init` installs whatever Miniforge is current (conda 26.10.0 today). The old Dockerfile was no better, and a rebuild today gives the same package set (see "What I ran"). Still, two builds a month apart can differ. Fix: pin the base by digest in the `ARG` default (Dependabot can bump Docker digests) and record `pip freeze` in the image (e.g. `/pulsar_requirements.txt`) so a published tag can be audited. A constraints file is optional.

### P3 3: Default tag and `KNOWN_PULSAR_CONTAINER_VERSIONS` follow different conventions

`docker/coexecutor/Makefile:1-6` and `pulsar/client/setup_handler.py:14-24`. The Makefile now tags `galaxy/pulsar-pod-staging:<pulsar version>` by default, `0.16.1.dev0` on this branch. So the root `make build-coexecutor-container` produces a dev tag under the official repository name. The setup handler's comment still says tags don't follow releases, and it relies on someone hand-adding each published tag to the map. A tag that isn't in the map makes Galaxy report `pulsar_version_source: client`, which happens to be right for a new image, so this is not a bug today.

Fix: pick one convention and write it in both places. If published tags will equal the Pulsar version from now on, say so in the setup handler comment and keep the map for the legacy tags. Keep it in that case, because legacy tags such as `0.15.0.2` parse as PEP 440 versions but are not the Pulsar version. Consider refusing a `.dev` version in the default `IMAGE` so a dev build can't be pushed under `galaxy/` by accident.

### P3 4: The read-only root fix is an image-side workaround for a Pulsar default

`docker/coexecutor/Dockerfile:31-38` and `pulsar/core.py:180-193`. `PULSAR_CONFIG_TOOL_DEPENDENCY_DIR=/pulsar_dependencies` works, and an explicit app config value still wins (`apply_env_overrides_and_defaults`). But the cause is in Pulsar: `__setup_dependency_manager` defaults `tool_dependency_dir` to `dependencies`, relative to the working directory. Any Pulsar started in an unwritable directory hits the same crash, not just this image. Two smaller points:

- Containerless jobs on a read-only root still fail. Conda `auto_install` writes into `/pulsar_dependencies/conda`. The comment reads as if read-only roots now work in general, but only tool-container jobs do.
- Without `dependency_resolution` in the app config, the default Conda resolver now looks for Conda in `/pulsar_dependencies/_conda`, not `/pulsar_dependencies/conda` where the image installed it. That case is container jobs, which resolve no dependencies, so it is harmless.

Fix: keep the env var for now. Say in the comment that it covers jobs with a tool container. Track the core fix separately, for example defaulting `tool_dependency_dir` under `staging_directory`, or not building a dependency manager that creates directories when dependency resolution isn't configured. The debrief already lists this as open.

### P3 5: Commit message of `1138cd0` (known)

It says the tool executor waits forever. In fact `pulsar-submit` exits 1 and the TES task ends `EXECUTOR_ERROR`. The rewording is recorded in `index.md` and waits on John. Squashing it into `a87897c` when that commit is reworded for P1 1 would do both at once.

### P3 6: No HISTORY.rst entry

The image is a user-facing artifact, and its base, contents and default tag change. Fix: add a line to the unreleased section with the PR number. Mention that the image drops CVMFS, Slurm/DRMAA and munge, and that `CONDA_INIT` and `IMAGE` exist.

## Checked and fine

- Build. A clean `git archive` of `1138cd0` produces a wheel with the venv's `python -m build`, and `make docker-image` with `--no-cache` builds it in about 3.5 minutes. It resolved base digest `sha256:5e2bdb1b0d54…`, the same as stage 2's build. Its `pip freeze` matches stage 2's image `wes-tes/pulsar-pod-staging:0.16.1.dev0-1138cd0` except for the wheel hash (wheel builds are not byte-reproducible), and it has the same conda 26.10.0.
- Makefile. `PULSAR_VERSION` parses `0.16.1.dev0` from `pulsar/__init__.py`. `make dist` runs `clean-build`, which removes stale `docker/coexecutor/*whl`, so the `$(ls /tmp/pulsar_app-*.whl)` glob sees one wheel. `IMAGE` and `DOCKER_BUILD_ARGS` overrides work. `.PHONY` is right.
- CVMFS. Nothing in the coexecution path mounts CVMFS. `cvmfsexec` is a separate per-job feature for queued and unqueued managers, and the client's Conda-only `dependency_resolution` has a `TODO: add CVMFS resolution`. `_pulsar-configure-galaxy-cvmfs` only copied config files for a client that an unprivileged container cannot run.
- Slurm, DRMAA and munge. Coexecution uses the `coexecution` and `unqueued` managers only. pykube is used by the Galaxy-side Kubernetes client, not inside the pod. paramiko and psutil still arrive through Pulsar's requirements.
- Kubernetes coexecution path. It runs `pulsar-submit --wait` with the same app config and staging actions as TES, so P1 1 is the only regression that applies to it. Neither image has `rsync` or `scp`, so `remote_rsync_transfer` and `remote_scp_transfer` were already unsupported in the old image.
- Conda init path. `_pulsar-conda-init` installs Miniforge (conda 26.10.0, conda-forge). In the image, the dependency manager that `Client.get_pulsar_app_config` configures for a containerless job auto-installed `seqtk=1.4` from bioconda into `/pulsar_dependencies/conda/envs/__seqtk@1.4` and returned the activation shell. The image does not set `PULSAR_CONFIG_CONDA_PREFIX` any more, which is fine because the client's resolvers name the prefix.
- Remote metadata. `galaxy_extended_metadata` brings in galaxy-job-execution and CT3 (Cheetah 3.4.0), and `import galaxy.metadata.set_metadata` works.
- Read-only root. With `docker run --read-only`, `pulsar-submit --help` and `pulsar-finish --help` work, and `PULSAR_CONFIG_TOOL_DEPENDENCY_DIR` is set.
- Size and user. Content size is 391 MB against 537 MB for 0.15.0.2, and Miniforge accounts for about 577 MB of the unpacked image. The image runs as root, as before. The demo doc explains why: shared TES and `emptyDir` volume ownership. Keep it.
- Fork CI for `1138cd0`. Everything is green except `Test (3.10, master, directory)`, which is also red on upstream `08dedcb` and so unrelated. The branch changes no Python.

## What I ran

- `make lint` in the worktree: passes.
- Wheel and `docker build --no-cache` from a `git archive` of `1138cd0` in a scratch directory, tagged `wes-tes/pulsar-review:1138cd0`. Removed afterwards.
- `pip freeze` diff, conda version and `--read-only` smoke checks against both the rebuilt image and stage 2's image.
- Memory measurement of `pulsar.client.transport.post_file` on a 400 MB file in this image and in `galaxy/pulsar-pod-staging:0.15.0.2`.
- Check that a manylinux pycurl wheel installs on this base without a compiler, and that it switches staging to the curl transport. Done in a throwaway container.
- Containerless Conda resolution of `seqtk=1.4` in the image.
