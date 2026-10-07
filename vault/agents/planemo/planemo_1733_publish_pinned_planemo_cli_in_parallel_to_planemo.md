# planemo #1733 - Publish pinned planemo-cli in parallel to planemo

- PR: https://github.com/galaxyproject/planemo/pull/1733 (branch `jmchilton:publish-planemo-cli`, independently reviewed head `d929cefaf203ae6e6ec4de37b476ce1af357d7c2`, locked-CI follow-up `92359c14ad15097d1b3f9fd696f4e60536cff872`)
- Worktree: `~/projects/worktrees/planemo/branch/publish-planemo-cli` (based on origin/master `515e928e`)
- Reviewed: 2026-10-06. CI verified 2026-10-07 at locked-CI head `92359c14`: 21 successful checks and the expected skipped PyPI upload. Mergeable and out of draft.
- Current verdict: implementation sound and clear, no new correctness findings or merge blockers. See [Independent Codex review — 2026-10-06](#independent-codex-review--2026-10-06) below. The requested full-matrix locked-runtime follow-up is implemented in `92359c14`; see the final section for validation.

The older review passes below record prior heads and findings, including issues subsequently resolved. They are historical context, not the current verdict.

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
6. [x] (69e03a46) Instead of dependabot uv: weekly `dependencies.yaml` mirroring Galaxy's (galaxybot PAT, push-to-fork). Needs admin: `galaxybot/planemo` fork + `GALAXYBOT_PAT` repo secret on planemo.
7. [x] (e007de62) Trim `check_distributions.py` to non-tautological checks; drop `MANIFEST.in` scripts line; replace `scripts/test_wheel.bash` with the new smoke test.
8. [x] (e007de62) Reduce `test_packages` matrix on PRs.
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
- 69e03a46: weekly `uv lock --upgrade` PR workflow (John chose scheduled workflow over dependabot). zizmor offline clean. Blocked on admin setup: galaxybot fork of planemo + `GALAXYBOT_PAT` secret (Galaxy's is repo-level; not visible to planemo). Side note: planemo still has a 2020 `PYPI_PASSWORD` repo secret, unused since trusted publishing - candidate to delete.
- e007de62: deleted `check_distributions.py`, `check_installed_distribution.py`, `test_wheel.bash`; MANIFEST scripts line gone; `PROJECT_EMAIL` hardcoded (no importlib.metadata). `test_packages` = 4 jobs running the wheel via `uvx --from` (cli 3.10/3.14/macOS 3.13, planemo 3.13). Smoke script verified locally for cli/3.10 and planemo/3.13. Only new script left: `build_distributions.py`.

## Re-review (e007de62)

Re-reviewed 2026-10-05 against origin/master `515e928e`. PR CI at review time: `build_packages` pass; everything else pending.

### Findings (by severity)

1. **Blocking - CI `mypy` jobs (3.10 and 3.13) will fail.** `tox.ini:31` `lint,mypy: lint` gives the `skip_install` mypy env the whole lint group; `black` pulls in `click` (8.5.0), so mypy now type-checks against real click stubs and errors on `planemo/cli.py:128` `class PlanemoCLI(click.MultiCommand)` (`Variable "click.MultiCommand" is not valid as a type` + `Invalid base class`). Master's mypy env had only mypy (click unresolved, `ignore_missing_imports`) and passes. Same error happens in a `make setup-venv` `.venv`. Fix: separate group `typecheck = ["mypy"]` (included in `dev`), `lint: lint` + `mypy: typecheck` in tox - verified passes in a scratch copy. Porting `PlanemoCLI` to `click.Group` is the real follow-up.
2. **Medium - `scripts/test_workflow_tests.sh:18`** `PLANEMO_TARGET="$PROJECT_DIRECTORY/dist/planemo*whl"` now matches both wheels, so `run_galaxy_workflow_tests.sh:23` `pip install ${PLANEMO_TARGET}` installs planemo and planemo-cli into one venv - the combination `docs/installation.rst` says not to do. Not in the CI matrix but it is the `gxwf_test_test` tox env. Fix: `dist/planemo-*.whl`.
3. **Low - `deploy.yaml:12-19`** still installs `build twine tomlkit` unpinned via pip (plus `cache: pip`, now keyed off `docs/requirements.txt`) while the `release` dependency group lists the same tools in the lock and has no consumer besides `dev`. Fix: move setup-uv first, replace the pip step with `uv sync --locked --only-group release`, drop `cache: pip`; `make dist`'s `IN_VENV` then uses `.venv`. Verified locally: builds all 4 artifacts, `twine check` passes.
4. **Low - `scripts/build_distributions.py:17`** `--frozen` -> `--locked`, so a stale `uv.lock` fails `make dist` / `make release` locally (the release path never runs `check-dependencies`) instead of shipping stale pins.
5. **Nit - `deploy.yaml:25`** `make check-dependencies VENV=SKIP`: `VENV` has no effect on that target; drop it.
6. **Nit - `scripts/build_distributions.py:48`** "This archive was produced immediately above by our own build backend." still there (earlier finding 16).
7. **Nit - stale docs.** `CONTRIBUTING.rst:71` still says "Assuming you have virtualenvwrapper installed" before `make setup-venv`; it now requires uv. `docs/developing.rst:46` "consume the committed snapshot" -> "the committed `uv.lock`".
8. **Still open from earlier:** `skip-existing: true` on publish (next step 4). PR body has no precondition checklist (galaxybot/planemo fork + `GALAXYBOT_PAT` secret pending).

### Verified clean

- No leftover references to deleted files/targets (`requirements.txt`, `dev-requirements.txt`, `update_dependencies`, `check_distributions`, `check_installed_distribution`, `test_wheel`) outside historical `docs/notebooks/cwl.ipynb` output. `.claude/commands/ready-release.md`, Makefile, tox, MANIFEST, workflows clean. `stdlib-list` drop is dead code (guarded by `< 3.10`); `wheel` drop is fine (build backend handles it); toil kept in `cwl-test`.
- `uv lock --check` passes (uv 0.10.7).
- `build_distributions.py`: 4 artifacts, `twine check` pass; CLI wheel `Name: planemo-cli`, 111 `==` pins with markers kept; wheel payloads identical; CLI sdist ships `requirements-cli.txt`, regenerated `planemo_cli.egg-info`, rebuilds with no uv on PATH (111 pins). Imports at top.
- deploy.yaml: setup-uv runs before both `check-dependencies` and `make dist`; pip `tomlkit` still needed only because of finding 3. uvx smoke step emulated exactly (shell function, `ls` glob, temp cwd) for planemo_cli/3.14 and planemo/3.13: all pass (cosmetic glob2 `\Z` SyntaxWarning). `pypi-publish` needs `[build_packages, test_packages]` correct.
- tox (4.50.1, py313): lint pass; unit-quick/lint_docs/lint_docstrings provision with the right groups (test group + package deps; docs group + package deps). lint_docs warnings identical to master locally (pre-existing autodoc failures on macOS).
- `gxwf_test_test`: `make setup-venv` = `uv sync --locked` (default `dev` group incl. `release`) so `make dist` works; needs uv on PATH, not in CI matrix. Old `setup-venv` exited after creating the venv without installing - now fixed.
- dependencies.yaml mirrors Galaxy's (branch/fork renamed, `dependencies` label exists on planemo, setup-uv pinned version instead of `python-version` - fine for a universal lock). `uvx zizmor --offline --config zizmor.yml .github/`: no findings.

### Verdict

Close. Fix 1 before merge (CI mypy red); 2 is a one-character fix worth folding in. 3-7 are small cleanups; 3 also gives the `release` group a real consumer.

### Re-review fixes (ec92e116)
All re-review findings addressed except `click.MultiCommand` -> `click.Group` (follow-up). `typecheck` group for tox mypy; deploy uses `uv sync --locked --only-group release` (pip step + `cache: pip` gone); `skip-existing: true`; `uv export --locked`; `test_workflow_tests.sh` glob `planemo-*.whl`; CONTRIBUTING/developing docs. Verified: py313 mypy + lint OK, `make check-dependencies`, release-only venv `make dist` -> 4 artifacts twine PASSED, zizmor clean. Remaining: PR body w/ admin checklist (galaxybot fork, `GALAXYBOT_PAT`, delete `PYPI_PASSWORD`).

## Independent Codex review — 2026-10-06

Reviewed exact head `d929cefaf203ae6e6ec4de37b476ce1af357d7c2` against `origin/master` (`515e928e`). Read the full implementation diff, dependency graph, packaging consumers, tox configuration, and release workflows. Verification used temporary copies; the author's worktree was left untouched.

**Verdict: the implementation is sound and clear. No new correctness findings or merge blockers.** The earlier implementation fixes remain in place; operational publisher/bot setup was not reverified. The intentionally brief PR description is outside this verdict.

The central abstraction is now small: `scripts/build_distributions.py:25-51` stages the CLI from the ordinary sdist, exports the runtime lock, removes stale distribution metadata, and uses the standard build backend again. This keeps code, assets, entry points, and versions aligned without a second package implementation. Moving the original dependencies into `pyproject.toml` preserves their ranges; the removed `stdlib-list` requirement was conditional on Python below the project's existing minimum. Package discovery returns the same 19 packages as the former explicit list.

### Independent verification

- Built both distributions with uv 0.10.7 and Python 3.13 from an archive of the exact head. All four wheel/sdist artifacts pass `twine check`.
- Both wheels contain identical code/data payloads: 203 files. Their versions match (`0.75.48.dev0`), and both expose the `planemo` command.
- The ordinary wheel retains 24 ranged runtime requirements; the CLI wheel has 111 exact `==` requirements, including environment markers. No test/release tools or dependency on the `planemo` distribution leak into the CLI requirements. Across Python 3.10–3.15 and Linux/macOS/Windows marker environments, no package has overlapping active pins, and every direct runtime pin satisfies its original range. This is a metadata check, not installation testing on all those platforms.
- Rebuilt the CLI sdist with ordinary `python -m build --wheel`, with uv absent from `PATH`. The resulting wheel's metadata and code/data exactly match the first wheel (excluding `RECORD`). The exported requirements are embedded in the sdist, so rebuilding does not consult the development lock or require uv.
- Simulated changing `__version__` from `0.75.48.dev0` to `0.75.48` in a separate temporary project: `uv lock --check` still passes. Release version changes do not stale the lock; both distributions derive their version from the same staged source.
- Installed the exact exported runtime constraints plus the test dependency group on macOS/Python 3.14. `uv pip check` passes. Ran the quick suite with `PLANEMO_SKIP_SLOW_TESTS=1 PLANEMO_SKIP_GALAXY_TESTS=1 PLANEMO_SKIP_GALAXY_CWL_TESTS=1`: **494 passed, 103 skipped, 2 failed** in 212.55 seconds. The failures are excluded from PR findings: the unchanged test `tests/test_autopygen_parser_discovery.py:104` references `ast.Str`, removed in Python 3.14 (production autopygen code does not), and the Docker profile test cannot connect to the local Docker daemon.
- All checks reported by GitHub for this exact head pass: packaging build, all four artifact smoke jobs, every Python CI job, and workflow analysis. PyPI publishing is skipped on the PR, as expected.

### Optional follow-up

One main-suite CI job using the locked runtime would strengthen the assurance behind the CLI pins. `.github/workflows/deploy.yaml:49-59` currently checks version output, tool linting, and report generation against the built wheels; the broader `.github/workflows/ci.yaml` tox suite resolves dependencies independently. The local pinned quick-suite run did not uncover a runtime incompatibility, so this is a validation improvement rather than a defect or merge condition.

The migration uses standard dependency groups and uv export behavior; consulted the primary [uv dependency documentation](https://docs.astral.sh/uv/concepts/projects/dependencies/) and [uv command reference](https://docs.astral.sh/uv/reference/cli/#uv-export) when checking group selection and export semantics.

## Locked CI implementation — 2026-10-06

John requested that the full existing test matrix exercise the locked runtime, rather than adding just one locked test job. Implemented and pushed [92359c14](https://github.com/jmchilton/planemo/commit/92359c14ad15097d1b3f9fd696f4e60536cff872) on [publish-planemo-cli](https://github.com/jmchilton/planemo/tree/publish-planemo-cli).

- All 13 existing Python CI matrix entries export `uv.lock` with every dependency group and apply it through tox's `constraints` option. This covers both dependency-group installation and Planemo's package dependencies, including all existing Galaxy integration jobs. Galaxy's separate environments resolve their own dependencies.
- One additional Python 3.13 quick-test job resolves the latest allowed dependencies to retain coverage of the library's loose requirements. Existing check names are preserved, and the extra job has a distinct name.
- Raised tox's minimum to 4.28, which introduced the `constraints` option. The path is supplied through `PLANEMO_TEST_CONSTRAINTS`; ordinary local tox use remains unconstrained unless explicitly supplied. Developer documentation includes the matching local commands. No generated requirements file is committed.

Validation: all original matrix combinations are preserved and locked; the latest job has no constraints in the effective tox configuration. Tox's installation logs confirm the constraints apply to both test tools and runtime requirements. All 106 installed dependencies covered by the active constraints match their lockfile versions, and `uv pip check` passes. Python 3.10 locked lint and mypy pass; the locked Python 3.13 quick suite reports **495 passed, 103 skipped, 1 deselected** (the unavailable local Docker test). Developer documentation parses without warnings, `uv lock --check` and `git diff --check` pass, and zizmor reports no workflow findings.

The new [Python CI run](https://github.com/galaxyproject/planemo/actions/runs/37486220225) is queued for the pushed head. Full integration results are pending; the local checks above do not substitute for those jobs.
