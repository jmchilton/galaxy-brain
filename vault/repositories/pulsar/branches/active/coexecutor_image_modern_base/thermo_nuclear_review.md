Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear code quality review: `coexecutor_image_modern_base`

- Reviewed range: `origin/master...HEAD`, `08dedcb..c4ae861` (`a87897c`, `92935e4`, `c4ae861`). Only `docker/coexecutor/Dockerfile` and `docker/coexecutor/Makefile`.
- Also read: root `Makefile` (`dist`, `clean-build`, `build-coexecutor-container`), `docker/kubernetes/`, `.dockerignore`, `.gitignore`, `.github/dependabot.yml`, `pulsar/client/setup_handler.py`, `pulsar/client/coexecution.py`, `pulsar/scripts/_conda_init.py`, `setup.py` extras, and the Dockerfile diffs of the later stack branches.
- Prompt: `vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md`. Earlier reviews (`review.md`, `codex_review.md`) not redone.

Two files, about 60 lines, no Python. No file-size, spaghetti or layering problem is possible at this scale. The findings are about knobs and lines that don't earn their place, plus one Makefile ordering hazard.

## Findings

### T1: `COPY` + `rm` of the wheel didn't do what it looked like (fixed, `c093471`)

`COPY pulsar_app-*.whl /tmp/` put the wheel in its own layer, so the `rm` in the next `RUN` hid the file without shrinking the image. Replaced by `RUN --mount=type=bind,target=/context pip install ...`, so the wheel never enters the image and there is no cleanup line. Needs BuildKit, the default builder since Docker 23. `docker/kubernetes` still uses `COPY`; that file wasn't touched.

### T2: Build-only settings lived in the runtime environment; unused base-image knob (fixed, `61ea98e`)

- `PIP_NO_CACHE_DIR`, `PIP_DISABLE_PIP_VERSION_CHECK` and `PIP_ROOT_USER_ACTION` were `ENV`, so they stayed in every container started from the image, including containerless tool runs. They matter only for the single `pip install`. Now `PIP_NO_CACHE_DIR=1` is set on that `RUN` alone. The other two only silenced build-log warnings and are gone.
- It must stay a variable, not `--no-cache-dir`. My first attempt used the flag, and the real build showed a 1.7 MB pip HTTP cache in `/root/.cache/pip`: `bagit` ships only an sdist, and the isolated pip that installs its build dependencies doesn't get the flag. The Dockerfile comment now says this, and also says dependencies may be pure Python sdists.
- `ARG PYTHON_IMAGE` was a build arg that nothing set. It is now a literal `FROM python:3.12-slim-trixie`, which also suits digest pinning or Dependabot later (review P3 2).
- Dropped "drmaa is left out: coexecution never talks to a DRM". It only described the difference from the old Dockerfile, and `a87897c`'s message already records that.

### T3: `all: dist docker-image` could race, and `dist` hid failures (fixed, `7b596b1`)

- `dist` and `docker-image` were independent prerequisites of `all`. The root `build-coexecutor-container` target calls `$(MAKE)`, which passes `-j` down, so `docker build` could start before the wheel existed. A bare `make docker-image` also built whatever wheel an earlier run had left behind. Now `docker-image: dist`, and `all: docker-image` keeps the root target working.
- `cd ../..; $(MAKE) dist; cp ...` used `;`, so the recipe's exit status came from the `cp`. It is now `$(MAKE) -C ../.. dist` and `cp ../../dist/pulsar_app-*.whl .` as separate recipe lines.

### Considered and not changed

- Turning `CONDA_INIT` into a multi-stage `--target`: the result is about the same, and it would rewrite the lines that `coexecution_dependency_dir_default` changes.
- Building from the repo root as the context instead of a copied wheel: this would delete the Makefile's `dist`/`cp` step, but it differs from `docker/kubernetes` and widens the context to the whole tree. The wheel is also what gets released.
- Parsing `PULSAR_VERSION` with `sed` is tied to the quote style in `pulsar/__init__.py`, but it works and `make -n` resolves `0.16.1.dev0`. The tag convention versus `KNOWN_PULSAR_CONTAINER_VERSIONS` is still review P3 3 and needs John's decision.
- Pre-existing, outside this branch: the root `clean-build` removes `pulsar.*.egg-info` but setuptools writes `pulsar_app.egg-info` (git-ignored). `docker/kubernetes/Makefile` has the same `;` chain.
- The still-open P3s from `review.md` that are outside this review's remit (no image CI, unpinned base and dependencies, tag convention, scope of the read-only workaround, HISTORY entry) are unchanged.

## Verification

- Full build with `make -C docker/coexecutor all IMAGE=pulsar-coexec-harden:thermo2` (Conda included): rc 0.
- `docker run --rm --read-only`: `pulsar-submit --help` and `pulsar-finish --help` work. `import pycurl, galaxy.metadata.set_metadata` works, and `pulsar.client.transport.get_file` comes from `pulsar.client.transport.curl` (PycURL 7.49.0, libcurl 8.23.0). conda is 26.10.0.
- No `/context` and no wheel in the image, and no `PIP_*` variables in its environment. `/root/.cache` holds only conda's 12 KB of notices, from the unchanged Conda step.
- `--build-arg CONDA_INIT=false` build: `pulsar-submit --help` works under `--read-only`, and `/pulsar_dependencies` exists.
- `git merge-tree` check: `ef7caea` (the Dockerfile commit of `coexecution_dependency_dir_default`) applies cleanly on the new head. The other stack branches don't touch `docker/`.
- Images removed. The wheel, `dist/`, `build/` and `pulsar_app.egg-info` were removed, and `git status` is clean.

## Gate

- `make lint`: passes (`ruff check .`, all checks passed). No Python changed, so there are no pytest or mypy targets.

## Result

Commits added: `c093471`, `61ea98e`, `7b596b1`. Nothing later branches modify was touched, and the restack applies cleanly. No private security report. Branch head `7b596b1`.

READY WITH NOTES
