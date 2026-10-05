# planemo #1733 - Publish pinned planemo-cli in parallel to planemo

- PR: https://github.com/galaxyproject/planemo/pull/1733 (head `jmchilton:publish-planemo-cli`, single commit `8c1050de`, Codex-authored)
- Worktree: `~/projects/worktrees/planemo/branch/publish-planemo-cli` (based on origin/master `515e928e`)
- Reviewed: 2026-10-05. PR CI was still all-pending at review time (incl. `build_packages`), so CI results are not in here.

## What the PR does

- Moves runtime deps from `requirements.txt` (dynamic) to static `project.dependencies` in `pyproject.toml`; dev deps move to PEP 735 `[dependency-groups]` (`test`, `lint`, `docs`, `release`, `cwl-test`, `dev`).
- Adds `uv.lock` (universal, `requires-python >=3.10`) and a committed `requirements-cli.txt` = `uv export` of the runtime closure (111 exact pins, with markers).
- `requirements.txt` and `dev-requirements.txt` become generated "compatibility" files; `scripts/update_dependencies.py` generates/checks all three.
- `scripts/build_distributions.py`: `python -m build` for planemo, then unpacks that sdist into a tempdir, rewrites `pyproject.toml` with tomlkit (name -> `planemo-cli`, deps -> dynamic from `requirements-cli.txt`), deletes egg-info/PKG-INFO, and builds again.
- `planemo-cli` is a **full copy** of the planemo package (same `planemo/` payload, same `planemo` console script), not a metapackage depending on `planemo==X`.
- `scripts/check_distributions.py` (post-build metadata/payload assertions) and `scripts/check_installed_distribution.py` (installed smoke test) are wired into `make dist` and a new `test_packages` job (Py 3.10-3.14 x {planemo, planemo-cli} + macOS 3.13 cli) that gates `pypi-publish`.
- `planemo/__init__.py` falls back to `planemo-cli` metadata; `PROJECT_NAME` hard-coded to `"planemo"`.
- `make setup-venv` becomes `uv sync --locked`; new `make update-dependencies` / `make check-dependencies`.
- Docs: install section for `uv tool install planemo-cli`; release/dependency docs in `developing.rst`.

## Verified locally

- `update_dependencies.py --check` passes; `uv lock --check` passes; `uv export --frozen --no-dev --no-emit-project --no-hashes --no-header --no-annotate` output is byte-identical to `requirements-cli.txt` minus its header line.
- `build_distributions.py` + `check_distributions.py` + `twine check` all pass (uv 0.10.7, build on 3.13). Four artifacts: `planemo-0.75.48.dev0{.tar.gz,-py3-none-any.whl}`, `planemo_cli-0.75.48.dev0{.tar.gz,-py3-none-any.whl}`.
- planemo wheel payload is identical to an origin/master build; only metadata diff is the dropped `stdlib-list; python_version < "3.10"` (dead since requires-python >=3.10). The "planemo.scripts / planemo.xml.xsd absent from packages" setuptools warnings are pre-existing on master.
- planemo-cli wheel: `Name: planemo-cli`, 111 `Requires-Dist: X==Y` pins, `console_scripts: planemo = planemo.cli:planemo`, `top_level.txt: planemo`.
- planemo-cli sdist is self-contained: `uv build --wheel <planemo_cli sdist>` rebuilds a wheel with the same name and 111 pins.
- Installed planemo-cli wheel into clean uv venvs on 3.10 and 3.14: `uv pip check` clean, `check_installed_distribution.py planemo-cli` passes. `uvx --from <planemo_cli wheel> planemo --version` -> `planemo, version 0.75.48.dev0` (one `SyntaxWarning: invalid escape sequence '\Z'` from a pinned dep on 3.14 - cosmetic).
- `uvx zizmor --offline --config zizmor.yml` on deploy.yaml: no findings on PR or master (offline audits only).
- `docs/developing.rst` new heading: docutils clean.
- `planemo-cli` does not exist on PyPI (`/pypi/planemo-cli/json` -> 404). Latest `planemo` on PyPI is 0.75.47.

## Verdict: will it work with the current release workflow?

**Mostly yes, but not on the first tag without a manual PyPI step, and as written that first tag will probably produce a half-published release.**

Release path traced: `make release` = `commit-version` (rewrites `__version__` + HISTORY, commits, tags) -> `new-version` -> `check-dist` (now builds + checks both dists) -> `push-release` (pushes tag) -> `deploy.yaml` on tag push: `build_packages` -> `test_packages` -> `pypi-publish` (OIDC trusted publishing via `pypa/gh-action-pypi-publish@release/v1`, `id-token: write`, no `environment:`).

What works:
- Versioning is consistent by construction: both dists read `version = {attr = "planemo.__version__"}` from the same source, `commit_version.py` needs no change. There is no `planemo==X` pin to drift because planemo-cli vendors the code.
- `uv.lock` doesn't record the project version (dynamic), so version bumps don't stale the lock and `uv sync --locked` keeps working across `commit-version`/`new-version`.
- A single `gh-action-pypi-publish` step uploads every file in `dist/`, so both projects' files go up in one step - this is fine **if** the OIDC token is authorized for both projects.
- `make check-dist` in `make release` now catches packaging breakage locally before the tag is pushed.

What is required / will break:
1. **Trusted publisher for `planemo-cli` must be configured on pypi.org before the first tag.** PyPI trusted publishing is per project; `planemo-cli` doesn't exist, so it needs a *pending publisher* (owner `galaxyproject`, repo `planemo`, workflow `deploy.yaml`, environment blank to match the current job - or set one on both projects if `environment:` is added). A pending publisher does not reserve the name; it only takes effect at first upload, so set it up promptly (the PR makes the name public).
2. **Partial release risk.** Without (1), the upload of `planemo_cli-*` files is rejected (403) while `planemo-*` files - which sort first - have already been uploaded. Re-running the job then fails on "file already exists" for planemo since the action does not set `skip-existing`. Fix: configure the pending publisher first; optionally add `with: skip-existing: true` so a re-run after fixing PyPI config completes the release.
3. `docs/developing.rst` mentions configuring the publisher, which is good, but it's buried at the end of a paragraph; it should be an explicit pre-merge checklist item in the PR (and the PR shouldn't be merged before it's done, since master's next tag would hit (2)).

Pins freshness at release: `requirements-cli.txt` is a static committed snapshot; nothing refreshes it automatically (no `uv` ecosystem in `.github/dependabot.yml`, only `github-actions`). Pins will be exactly as old as the last manual `make update-dependencies`. This is by design per the docs ("Dependency-only updates use a new Planemo patch release") but means the release checklist needs a "refresh deps?" step or automation (see findings).

## Findings (by severity)

### Blocking / will fail

1. **lint_docs CI will fail** - `docs/installation.rst:5-6`: title "Pinned command-line installation" is 32 chars, underline is 31 `=`. docutils emits `WARNING: Title underline too short.` (confirmed locally), and `scripts/lint_sphinx_output.py` fails on any WARNING. Fix: add one `=`.
2. **First tagged release half-publishes** unless the `planemo-cli` pending trusted publisher exists (see verdict 1-2). Not a code bug, but a merge precondition.

### Design / should discuss

3. *(Resolved 2026-10-05: full copy is intentional for a hermetic `uvx` CLI.)* **planemo-cli duplicates the `planemo` package instead of depending on `planemo==X`** (`scripts/check_distributions.py:42` even asserts "CLI must contain its own code"). Consequences: two PyPI distributions own the same files; installing both in one env (e.g. a project depending on `planemo` + someone adding `planemo-cli`) silently clobbers, and uninstalling either breaks the other. The docs warn about it (`docs/installation.rst`) and `check_installed_distribution.py:30-35` asserts it, but nothing prevents it for users. The alternative - `planemo-cli` as a metapackage with `planemo==<version>` + the pins - lets the resolver catch conflicts, drops the `planemo/__init__.py` metadata fallback, drops the payload-identity checks, and makes the wheel tiny. Cost: the pin has to be generated at build time (the same build script can write it). Worth an explicit decision in the PR description either way, since the vendoring choice drives most of the new code.
4. **`requirements-cli.txt` as a committed generated file + custom check is the wrong source of truth.** It's provably just `uv export --no-dev --no-emit-project --no-hashes --no-header --no-annotate`. Committing it means any lock-only update (dependabot `uv` ecosystem, manual `uv lock --upgrade-package`) fails `check-dependencies` until someone regenerates. Generating it in `build_distributions.py` (staged into the planemo-cli sdist, which already happens) makes `uv.lock` the single source and makes enabling dependabot for `uv` trivial.
5. **No automation keeps the lock fresh** - `.github/dependabot.yml` only covers `github-actions`. Add a `package-ecosystem: "uv"` entry (grouped, with cooldown like actions), contingent on (4); otherwise pins rot silently between manual refreshes.
6. **`update_dependencies.py` re-implements `uv lock --check`** (`scripts/update_dependencies.py:32-53` compares pyproject deps/groups/requires-python against `uv.lock` metadata by hand). `uv lock --check` (or `--locked`) does exactly this and is maintained by uv. With that and `uv export -o`, most of the script disappears.
7. **`requirements.txt` / `dev-requirements.txt` kept as generated compat files** - only consumer is `tox.ini:30-31` (`lint_docs: -rdev-requirements.txt`; `lint_docs,quick,unit: -rrequirements.txt`). `-rrequirements.txt` is redundant for non-`skip_install` envs now that deps are static in pyproject, and recent tox 4.x supports `dependency_groups =` (min version not verified here). Dropping both files (follow-up OK) removes a whole generated-file class. Also `dev-requirements.txt` header "edit pyproject.toml and refresh the lock" is slightly misleading for that file (it's group names, not lock pins). RTD uses `docs/requirements.txt` (unchanged), fine.

### Reuse / accretion

8. **Four new scripts, ~280 lines, mostly verifying uv/setuptools against themselves.**
   - `check_distributions.py:43-48` asserts `Requires-Dist` == `requirements-cli.txt` - tautological, setuptools reads that file.
   - `check_distributions.py:49-65` re-checks that each pin satisfies the loose specifiers across 3.10-3.14 x 3 OSes - this is what `uv lock` already guarantees; also hard-codes `range(10, 15)` and the resource list (`:32-36`) which will drift from `requires-python`/`package-data`.
   - Valuable bits worth keeping: names, version equality, payload equality (if vendoring stays), all-pins-are-`==`.
   - `check_installed_distribution.py` overlaps the stale `scripts/test_wheel.bash` (nosetests, `py2.py3` wheel name, `python2`-era). Replace/delete `test_wheel.bash` rather than adding a parallel smoke test.
   - Not reusable abstractions; they're planemo-only release glue. If the metapackage route is chosen, `check_distributions.py` mostly evaporates.
9. **`MANIFEST.in:2` ships the four release scripts in both sdists.** Nothing in an sdist build needs them (`build_distributions.py` runs from repo root). `check_installed_distribution.py` also references `tests/data`, which isn't the point of an sdist. Drop the line.

### Workflow nits (ordinary hardening/cost)

10. `deploy.yaml:32-44` - `test_packages` adds 11 jobs to **every push and PR** (workflow is `on: [push, pull_request]`). Consider a smaller PR matrix (e.g. 3.10 + 3.14 for each dist) and the full matrix only on tags, or `paths:` filtering.
11. `deploy.yaml:65` - inline Python to glob the wheel; `ls dist/${DISTRIBUTION//-/_}-*.whl` or passing the glob straight to `uv pip install` is simpler.
12. `deploy.yaml:19` - build job mixes `pip install build twine tomlkit` with a pinned uv. Since uv is now required anyway, `uv sync --locked --only-group release` (or `uvx --from build`) would make the release toolchain itself locked. uv version `"0.10.7"` is pinned in two places (and implicitly by `uv.lock` format); fine, but dependabot won't bump that string.
13. `pypi-publish` has no `environment:` (pre-existing). If one is added for hardening, it must be added to both PyPI publishers.
14. `ci.yaml` unchanged and still installs via tox+pip, so CI tests run against **unpinned** latest deps, while `planemo-cli` ships the lock. Nothing tests planemo's test suite against the pinned set except the 4-command smoke test. Reasonable trade-off, but worth stating; a single `uv sync --locked` + `unit-quick` job would cover it.

### Small code nits

15. `planemo/__init__.py:3-6` - the metadata lookup now exists only to derive `PROJECT_EMAIL`. Hard-coding `"galaxy-committers@lists.galaxyproject.org"` removes the try/except and the import-time metadata dependency (which also breaks running from a source tree without an installed dist - pre-existing).
16. `scripts/build_distributions.py:37` - comment "This archive was produced immediately above by our own build backend." reads like a linter appeasement; drop it or make it a `# noqa`-style justification if that's what it is.
17. `scripts/check_distributions.py` uses bare `assert` for release gating - stripped under `-O`. Low risk in practice; raise explicitly if kept.
18. `Makefile:4` `ENV?=py38` and `pyproject.toml` classifiers stop at 3.13 while the new matrix tests 3.14 - pre-existing drift, could fix opportunistically (add 3.14 classifier since `test_packages` now covers it).
19. Imports are all module-level in the new scripts; no buried imports. Good.

### Brief: conda / brew

- bioconda `planemo` recipe builds from the `planemo` sdist with its own dependency list; unaffected. `planemo-cli` should **not** go to bioconda/conda-forge (pins conflict with conda solving; it's a pip/uv tool artifact). `scripts/update_bioconda.bash` / `update_planemo_recipe.bash` are untouched and already python2-era.

## Next steps

1. [x] (029f1b0b) Fix `docs/installation.rst` underline (one char) - otherwise `lint_docs` fails.
2. [x] Decided: vendored full copy is intentional (hermetic `uvx` CLI). Still record rationale in PR body.
3. [x] (done 2026-10-05 by John) Configure a PyPI pending trusted publisher for `planemo-cli` (galaxyproject/planemo, `deploy.yaml`, no environment) **before merge**; make it an explicit checklist item in the PR.
4. [ ] Consider `skip-existing: true` on the publish step so a failed partial upload can be re-run.
5. [x] (029f1b0b, c3d7f056) Replace committed `requirements-cli.txt` + hand-rolled lock check with `uv lock --check` and build-time `uv export`; shrink `update_dependencies.py` accordingly.
6. [ ] Add `uv` ecosystem to `.github/dependabot.yml` (after 5).
7. [ ] Trim `check_distributions.py` to non-tautological checks; drop `MANIFEST.in` scripts line; replace `scripts/test_wheel.bash` with the new smoke test.
8. [ ] Reduce `test_packages` matrix on PRs.
9. [ ] Follow-up (optional): move tox to `dependency_groups`, drop generated `requirements.txt`/`dev-requirements.txt`.
10. [ ] Re-check PR CI once it runs (`build_packages`, `test_packages`, `lint_docs`).

## Trim plan (given full-copy decision)

Core that must stay: `build_distributions.py`, `uv.lock`, deploy build + smoke job, docs.

- ~~Split out the dev-tooling migration~~ Revised 2026-10-05: John wants the uv modernization kept. Keep dependency-groups, static `dependencies`, `packages.find`, `uv.lock`, `setup-venv` -> `uv sync --locked`. Finish it instead of shimming: delete `requirements.txt`/`dev-requirements.txt`, switch `tox.ini` deps to `dependency_groups =` (tox >= 4.22; dedupes the hand-copied tox deps), add `uv` to dependabot. Nothing left to generate -> `update_dependencies.py` + `check-dependencies` go away. Optional: tox-uv `uv-venv-lock-runner` for one env so CI exercises the locked set `planemo-cli` ships; keep unit envs unpinned to catch upstream breakage for library users.
- Don't commit `requirements-cli.txt`; `build_distributions.py` runs `uv export --frozen ...` into the unpacked sdist (`include *.txt` already ships it). Staleness gate = `uv lock --check`.
- Delete `check_distributions.py`: payload identity, pin==file, and marker compatibility all hold by construction / by uv resolution.
- Replace `check_installed_distribution.py` with workflow lines using `uvx --from dist/planemo_cli-*.whl planemo ...` (the real UX) + `uv pip check`. Delete stale `scripts/test_wheel.bash`.
- Drop `MANIFEST.in` scripts line; hardcode `PROJECT_EMAIL`, drop metadata lookup in `planemo/__init__.py`.
- Matrix: planemo-cli on 3.10, 3.14, macOS; planemo once (~4 jobs vs 11).

### Progress
- 029f1b0b: deleted `requirements.txt`, `dev-requirements.txt`, `update_dependencies.py`; tox uses `dependency_groups` (`requires = tox>=4.22`); `check-dependencies` = `uv lock --check` + diff of `uv export` vs `requirements-cli.txt` (interim until build-time export). Verified: tox envs install groups (incl. skip_install envs), `make dist` 111 pins. Local `lint_docs` fails on autodoc circular-import warnings on py3.13/macOS - same on unmodified master, pre-existing. `scripts/test_wheel.bash` still references `dev-requirements.txt` (slated for deletion).
- First PR CI run: lint / lint_docs / build_packages "failed" = runner not acquired (infra), not code.
- c3d7f056: `requirements-cli.txt` no longer committed; `build_distributions.py` runs `uv export` into the staged CLI source. Verified 111 pins in wheel; CLI sdist ships the file and rebuilds with no uv on PATH. `check-dependencies` = `uv lock --check`.
- Dependabot `uv` deferred - known issues: `versioning-strategy` dropped before the uv updater (raises pyproject floors; dependabot-core#16112), and `lockfile-only` skips transitives (dependabot-core#14073). Needs decision vs a scheduled `uv lock --upgrade` workflow.
