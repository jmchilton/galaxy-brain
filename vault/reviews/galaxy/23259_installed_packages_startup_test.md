# PR 23259 — Test first startup from installed Galaxy packages

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23259 |
| **Author** | mvdbeek (Marius van den Beek) |
| **Base branch** | `release_26.1` |
| **Head reviewed** | `78a882de5c` (single commit on base `6bb043475e`; base tip has since advanced to `636ca92828`) |
| **Size** | 5 files, +168 / -33 — `.ci/installed_startup.sh` (new, +70), `.github/workflows/first_startup.yaml` (+25/-2), `Makefile` (+3), `packages/meta/setup.cfg` (+1), `packages/package-build-install.sh` (+69/-31) |
| **State** | OPEN, 0 reviews, 0 comments at time of writing; opened 2026-08-04 |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23259` |
| **Verdict** | **Approve the idea, request changes on the plumbing.** The gap this closes is real and the assertion is genuinely non-vacuous — I verified `lib/galaxy/webapps/base/webapp.py:68-72` defaults `static_dist_dir` to `galaxy.web_client`'s packaged `dist`, so a 200 on `/static/dist/<asset>` from an empty temp cwd can only have come out of the wheel. And I verified empirically that the packaging bug it guards against is **fail-open**: a `packages/meta` wheel built with `install_requires = file: requirements.txt` and no `requirements.txt` builds successfully with **zero** `Requires-Dist` and no warning. That is exactly the class of silent-empty-artifact bug #23254 was about, and nothing else in CI catches it. Two things block: (1) `make install-packages` with its default `VENV` now non-editably installs the whole metapackage into the developer's main `.venv`, and the script's default venv location silently relocated from `packages/.venv` to `<galaxy_root>/.venv` — created with a bare `uv venv` that bypasses `common_startup.sh`'s interpreter pin; (2) the new job triggers a full uncached production **client build** on every push and PR, four call-levels down from the diff, in a workflow that already builds and caches the client in a sibling job. Neither is visible from reading the patch. |

---

## What it does

One commit, `78a882de5c`. Four moving parts:

1. **`.ci/installed_startup.sh`** (new, 70 lines, mode 100755). Takes a venv path, asserts
   `galaxy.web_client` imports from inside that venv, discovers a `galaxy-app-*.js` asset from
   the package's `dist/`, boots `$VENV/bin/galaxy` in a scratch `mktemp -d`, polls
   `/api/version` until 200, then fetches `/` and `/static/dist/$ASSET`.
2. **`Makefile:217-218`** — new `install-packages` target: `cd packages && VENV="$(abspath $(VENV))" ./package-build-install.sh -m`.
3. **`packages/package-build-install.sh`** — rewritten. `-m` no longer walks
   `packages_by_dep_dag.txt` calling `make dist`; it shells out to `galaxy-release-util build`.
   `VENV_CMD`/`PIP_CMD` string variables become `ensure_venv()` / `pip_install()` functions that
   target `$VENV/bin/python` explicitly. `$VENV` is absolutized at script start.
4. **`.github/workflows/first_startup.yaml`** — new `installed-test` job on Python 3.14; also
   drops `packages/**` from `paths-ignore` on both `push` and `pull_request`.

Plus a one-line `packages/meta/setup.cfg` addition (see P2-1).

`$VENV/bin/galaxy` is **gravity's** console script, not Galaxy's — confirmed from
`galaxyproject/gravity` v1.2.3 `pyproject.toml:47` (`galaxy = "gravity.cli:galaxy"`, docstring
"Run Galaxy server in the foreground") and `gravity/settings.py:160-162` (default bind
`localhost:8080`, which is where the script's hardcoded `URL` comes from). Gravity is not in
any package's `install_requires`; it reaches the venv only via
`lib/galaxy/dependencies/pinned-requirements.txt:101` → the generated `packages/meta/requirements.txt`.
That chain is precisely what the test exercises.

---

## Verifying the description's claims

| claim | verdict |
|---|---|
| "add an `install-packages` target that builds the checkout with `galaxy-release-util`" | **True.** `Makefile:218` → `package-build-install.sh:107-108` → `build_release_packages()` at `:53-64`. |
| "installs the metapackage from a local wheelhouse" | **True.** `package-build-install.sh:132-137`, unchanged in substance from before. |
| "add Python 3.14 CI coverage" | **Overstated.** The matrix already read `python-version: ['3.10', '3.14']` at the base commit `6bb043475e` (`first_startup.yaml:28` there, `:26` in the reviewed head) — the PR does not touch it. What is new is *installed-package* coverage, which happens to run only on 3.14. |
| "boots the shipped `galaxy` command with no explicit configuration" | **Essentially true.** No `galaxy.yml`; the only env set is `GALAXY_CONFIG_DATABASE_AUTO_MIGRATE=true` (`installed_startup.sh:51`), which mirrors `tox.ini:51`. |
| "verifies the API, the root page, and a bundled web-client asset" | **True and non-vacuous** — all three use `curl --fail`, so a 500 fails. See "What's good" for why the asset check really does prove the wheel shipped assets. |

**Python 3.14 coherence — checked, no problem.** `packages/*/pyproject.toml` classifiers list
3.10 through 3.14; `python_requires = >=3.10` in every `setup.cfg`; root `pyproject.toml:13`
`requires-python = ">=3.10"`; `packages/pyproject.toml:5` the same; `scripts/check_python.py:10`
`MIN_VERSION_TUPLE = (3, 10)`. Nothing in the repo declares an upper bound. 3.14 is coherent.

One observation rather than a defect: `publish_artifacts.yaml:49` builds the *real* release
artifacts on Python **3.10**. So the new job validates packaging under an interpreter that is
not the one release wheels are actually built with. Running `installed-test` across the same
`['3.10', '3.14']` matrix as the sibling job would close that, at the cost of doubling P1-2.

---

## Base drift — which findings are computed against what

The worktree branched at `6bb043475e`; `release_26.1` is now `636ca92828` (83 commits).
`git merge-base --is-ancestor 6bb043475e 636ca92828` → yes.

The prompt flagged `80f67421a7` ("web-client wheel assets") as a drift risk for the
bundled-asset assertion. **It is not.** `80f67421a7` is the *merge commit* of PR #23254 and its
second parent is `6bb043475e` — this PR's own base. All of the web-client wheel-asset work
(`MANIFEST.in`, `check_artifacts.py`, `tests/test_packaging.py`, the `clean-web-client` rule) is
already in the reviewed tree. Nothing about how assets ship changed under this PR.

Real drift touching these paths, from `git diff --stat 6bb043475e 636ca92828 -- packages/ .ci/ Makefile .github/`:
every package's `setup.cfg` version bumped `26.1.1.dev0` → `26.1.2.dev0` plus `HISTORY.rst`
churn (`094145bc80` "Create version 26.1.1", `89f7f1f798` "Start work on 26.1.2.dev0"), and
`packages/tool_util/setup.cfg` for `7b8a44b15d` (jsonschema). Only one of those collides.

I rebased for real rather than eyeballing it — cherry-picked `78a882de5c` onto `636ca92828` in
a throwaway worktree:

```
Auto-merging packages/meta/setup.cfg
[detached HEAD 5e571b683f] Test first startup from installed Galaxy packages
 4 files changed, 167 insertions(+), 33 deletions(-)
 create mode 100755 .ci/installed_startup.sh
```

**Five files became four.** The `packages/meta/setup.cfg` hunk vanishes on rebase — see P2-1.
Every other finding below is identical against `78a882de5c` and against the rebased result;
P2-1 is the only one where it matters, and it is called out inline.

---

## P1 findings

### P1-1 — `make install-packages` defaults to overwriting the developer's main virtualenv, and the script's default venv silently moved

`Makefile:217-218`:

```make
install-packages: ## Build and install Galaxy packages from this checkout into VENV
	cd packages && VENV="$(abspath $(VENV))" ./package-build-install.sh -m
```

`VENV` here is the root Makefile's own `VENV?=.venv` (`Makefile:2`) — the variable that
`IN_VENV` (`Makefile:4`) uses for roughly forty other targets, and the same directory
`scripts/common_startup.sh:98` defaults `GALAXY_VIRTUAL_ENV` to. So a bare `make install-packages`
non-editably installs the metapackage — 27 `galaxy-*` wheels plus every pinned runtime dep —
straight over a developer's editable working environment. CI is fine because it passes an
explicit `$RUNNER_TEMP` path (`first_startup.yaml:76`); the hazard is entirely local.

Independently, the script's *own* default relocated. Before:

```sh
: "${VENV=../.venv}"
...
    pushd "$package"
    ...
        if [ ! -d "$VENV" ]; then
            ${VENV_CMD} "$VENV"
```

The existence test and creation ran **inside** `pushd "$package"`, so `../.venv` meant
`packages/.venv`. The deleted comment said so in as many words: *"Used inside the package dir,
so refers to `<source_root>/packages/.venv`"*. After (`package-build-install.sh:18-24`):

```sh
# Use one environment for package build dependencies and the installed Galaxy.
: "${VENV=../.venv}"
case "$VENV" in
    /*) ;;
    *) VENV="$(pwd)/$VENV" ;;
esac
```

`$(pwd)` is `packages/`, so the default is now `<galaxy_root>/.venv`. Same literal, different
directory, and the comment that documented the old meaning was removed rather than updated.

Compounding it, `ensure_venv()` (`:34-42`) will *create* that directory:

```sh
ensure_venv() {
    if [ ! -d "$VENV" ]; then
        if command -v uv >/dev/null; then
            uv venv "$VENV"
```

A bare `uv venv` with no `--python`. `scripts/common_startup.sh:129-141` deliberately does not
do that: it runs `scripts/check_python.py` first and creates the venv with an explicit
`$GALAXY_PYTHON` / `$CONDA_PREFIX` interpreter. So on a fresh clone,
`packages/package-build-install.sh -e` now materializes Galaxy's main `.venv` with whatever
interpreter `uv` happens to pick, and a later `run.sh` will adopt it.

There is a third, quieter half to this. Old `pip_install`-equivalents did **not** target `$VENV`
— `${PIP_CMD} install -e .` and `${PIP_CMD} install dist/*.whl` used the *active* virtualenv
(`VIRTUAL_ENV` was set for the `dev-requirements.txt` install only). New `pip_install()`
(`:44-51`) always passes `--python "$VENV/bin/python"`, which makes `uv` ignore `VIRTUAL_ENV`
entirely. Being explicit is the right call, but it means an activated venv is now silently
ignored instead of used, and that is not mentioned anywhere.

**Is any of this a regression?** No — and that is worth stating precisely, because it changes
what the finding is asking for. `install-packages` does not exist at the base
(`git show HEAD~1:Makefile | grep install-packages` → nothing), so the destructive default is
new code, not a break in something that used to work. And `package-build-install.sh` had
**zero in-tree callers** at the base (`git grep package-build-install HEAD~1` finds only the
script itself) — this PR's Makefile target is the first one. So the venv relocation cannot break
existing automation either; its blast radius is people who run the script by hand.

That is the argument for treating it as a design comment rather than a merge blocker. The
argument for keeping it at P1 anyway is that both halves are *silent* and one is *destructive*:
`make install-packages` reads like an ordinary dev-convenience target and will non-editably
install 27 wheels over a working editable environment with no prompt, and the relocation removes
the comment that documented the old meaning rather than updating it. Neither is visible from
reading the diff.

Note also that the two halves are independent, and the writeup above bundles them. `Makefile:218`
passes `VENV="$(abspath $(VENV))"` explicitly, so the target would clobber the root `.venv`
even if the script's internal default had not moved. Fixing one does not fix the other.

Third piece of context: the venv's *role* changed, which is what makes its location matter. At
the base it was a build-dependency scratch venv — the deleted comment literally says *"Prevent
making a venv for build deps for each package"*. In the new `-m` non-editable mode it is the
install target. A throwaway build-dep venv pointed at `.venv` is untidy; an install target
pointed at `.venv` overwrites the developer's environment.

Suggested fix — any one of:

- Give the target its own variable so it cannot collide with the dev venv:
  ```make
  PACKAGES_VENV ?= .venv-packages
  install-packages: ## Build and install Galaxy packages from this checkout into PACKAGES_VENV
  	cd packages && VENV="$(abspath $(PACKAGES_VENV))" ./package-build-install.sh -m
  ```
- Or keep `VENV` but refuse to proceed when it resolves to `$GALAXY_VIRTUAL_ENV`/root `.venv`
  without an explicit opt-in flag.
- At minimum: restore a comment at `:18` stating the default is now the *root* venv, say so in
  `usage()` (`:73-78`), and have `ensure_venv` honour `$GALAXY_PYTHON` the way
  `common_startup.sh` does.

### P1-2 — The new job runs a full, uncached production client build on every push and PR, and nothing in the diff says so

The chain is four levels deep and entirely invisible from the patch:

| step | location |
|---|---|
| `make install-packages VENV=...` | `first_startup.yaml:75-76` |
| `./package-build-install.sh -m` | `Makefile:218` |
| `if $META && ! $EDITABLE; then build_release_packages` | `package-build-install.sh:107-108` |
| `galaxy-release-util build --galaxy-root ..` | `package-build-install.sh:55` |
| per package: `make clean` → `make dist` → `make lint-dist` | `galaxy_release_util/point_release.py:489-494` (v0.4.2) |
| `clean` → `clean-web-client`: `rm -rf src/galaxy/web_client/dist` | `packages/web_client/Makefile:30, 47-49` |
| `_dist` prerequisite `client_build_hash.txt` now missing → rebuild | `packages/web_client/Makefile:59, 65-73` |
| `cd ../..; uv venv ...; uv pip install nodejs-wheel; make client-production` | `packages/web_client/Makefile:66-73` |
| `client-production: client-node-deps` → `corepack enable pnpm; pnpm install --frozen-lockfile; pnpm run build-production` | `Makefile:181-185, 223-224` |

`packages/web_client/src/galaxy/web_client/dist` is not tracked by git (`MANIFEST.in` says so
explicitly: *"Generated assets must be included explicitly because they are not tracked by
Git"*; `git ls-files packages/web_client` confirms only source files). So on a fresh CI checkout
the rebuild is unconditional — and it cannot be skipped, because `make lint-dist` runs
`check_artifacts.py`, which hard-fails when the wheel has no files under
`galaxy/web_client/dist/` (`check_artifacts.py:31-34, 75-79`).

Meanwhile the *same workflow* already builds the client and caches it:
`first_startup.yaml:17-18` `build-client: / uses: ./.github/workflows/build_client.yaml`, which caches
`galaxy root/static` under `galaxy-static-<sha>` (`build_client.yaml:33-37`) and which the
sibling `test` job restores with `fail-on-cache-miss: true` (`first_startup.yaml:45-50`). The new
job takes no `needs:` and restores nothing.

I want to be fair about the reuse: it is **not** drop-in. `build_client.yaml` runs `make client`
(dev build, output landing in `static/`), while `web_client/Makefile:72` *moves* `client/dist`
into the package after `make client-production`. Different target, different artifact location.
But "not drop-in" is an argument for solving it, not for paying for a second full client build
on every PR.

Compounding the cost, the workflow removes `packages/**` from `paths-ignore` on both triggers
(`first_startup.yaml:7, 12` in the diff), so the *whole* workflow — including `build-client` and
the two-way matrix startup test — now also fires on packages-only changes. And
`galaxy-release-util build` additionally runs `make lint-dist` for all 27 packages, each
spawning `uvx --with-requirements dev-requirements.txt --from twine twine check`
(`packages/package.Makefile:83-84`), which the old `-m` path never did.

Suggested fix, roughly in order of preference:

1. Scope the trigger. This is packaging plumbing; it does not need to run on every client-only
   PR. `paths:` on `packages/**` + `.ci/installed_startup.sh` + `Makefile`, or move it to
   `schedule:` / a release-branch-only trigger.
2. Restore/populate `packages/web_client/src/galaxy/web_client/dist` from a cache keyed on
   `client/` content before invoking the build, so the `client_build_hash.txt` prerequisite is
   already satisfied and `make dist` short-circuits. Note this also needs `make clean` not to
   delete it — `galaxy-release-util build` calls `make clean` unconditionally
   (`point_release.py:490`), so a `--no-clean` upstream or a `galaxy-release-util build --packages meta ...`
   subset would be needed.
3. Add `timeout-minutes:` regardless, so a hung pnpm build fails in 30 minutes rather than
   burning the 6-hour default.

I could not run the job, so I have no wall-clock number for it — the claim here is the code
path, which is read straight out of the Makefiles and `galaxy-release-util` v0.4.2 above.

---

## P2 findings

### P2-1 — The `packages/meta/setup.cfg` line is correct, load-bearing, and already upstream

The one-liner adds, at `packages/meta/setup.cfg:15`:

```ini
[options]
install_requires = file: requirements.txt
```

**What it pulls in.** `packages/meta/requirements.txt` is gitignored (`.gitignore:170`) and
generated by `galaxy_release_util/point_release.py:952-962` — `galaxy-<pkg>==<version>` for every
package except `meta` and `tool_shed`, plus every non-comment line of
`lib/galaxy/dependencies/pinned-requirements.txt`. That is where `gravity==1.2.3`
(`pinned-requirements.txt:101`) comes from, and hence where `$VENV/bin/galaxy` comes from.
Without the line the metapackage wheel carries no dependencies at all. Correct and necessary.

**It regressed in `b7f83c8469`** ("python packages: convert to src layout", Michael R. Crusoe),
which deleted the line that `aa537317df` had added in March 2025.

**It is already on `release_26.1`.** `094145bc80` ("Create version 26.1.1", mvdbeek, authored
nine minutes after this PR's commit) restored it — because `galaxy-release-util`'s own
`_ensure_setup_cfg_requirements_file` (`point_release.py:1024-1038`) inserts exactly this line
at exactly this position whenever `[project].dependencies` in `pyproject.toml` is dynamic, which
`packages/meta/pyproject.toml:5-15` makes it. That byte-for-byte match is why my rebase
auto-merged the hunk away and the cherry-pick landed 4 files instead of 5.

So: **against `78a882de5c` this is a correct fix; against the rebased result it is a no-op** and
should just be dropped from the branch to keep the diff honest.

Worth recording because it justifies the whole PR: I checked what happens when
`install_requires = file: requirements.txt` points at a file that does not exist. Built a
minimal package with that exact stanza and no `requirements.txt`:

```
Successfully built dist/zzdemo-0.0.1-py3-none-any.whl
$ unzip -p dist/*.whl "*/METADATA"
Metadata-Version: 2.4
Name: zzdemo
Version: 0.0.1
```

No error, no warning, and **no `Requires-Dist` at all**. Adding the file produces
`Requires-Dist: requests>=2` / `Requires-Dist: click` as expected. The mechanism is fail-open:
a `galaxy` metapackage that installs nothing is a *successful* build. Nothing else in CI would
notice — and this PR's test would, because `$VENV/bin/galaxy` would not exist. That is the
strongest argument for merging some version of this.

### P2-2 — The asset assertion is pinned to a rolldown `manualChunks` implementation detail

`.ci/installed_startup.sh:41-48`:

```python
dist = files("galaxy.web_client").joinpath("dist")
print(next(asset.name for asset in dist.iterdir() if asset.name.startswith("galaxy-app-") and asset.name.endswith(".js")))
```

`galaxy-app` is not an entry point. It is a **manual chunk name**, returned conditionally from
`client/vite.config.mjs:141-151`:

```js
manualChunks: (id) => {
    if (id.includes("node_modules/jquery/") && !id.includes("jquery-migrate")) {
        return "jquery-core";
    }
    // Keep app/* files together to avoid circular dependency issues
    if (id.includes("/src/app/")) {
        return "galaxy-app";
    }
},
```

emitted through `chunkFileNames: "[name]-[hash].js"` (`:133`). Whether that file exists at all is
a bundler decision. If the chunking heuristic is retuned — or `/src/app/` is reorganized — this
CI job breaks with an uncaught `StopIteration` traceback out of a heredoc, which is about the
least diagnosable failure shape available, in a job whose entire purpose is diagnosing packaging
failures.

There are stable names right there, and the templates actually reference them.
`templates/js-app.mako:29` is `${ h.dist_css('base') }` → `/static/dist/base.css`, and `:55` is
`${ h.dist_js('libs.bundled', '%s.bundled' % js_app_name )}` → `/static/dist/libs.bundled.js`
and `/static/dist/analysis.bundled.js`. Those come from declared entry points with
`entryFileNames: "[name].bundled.js"` (`vite.config.mjs:124-132`) — no hash, no bundler
heuristic.

Suggested fix, in ascending order of how much it proves:

```sh
# minimum: assert on a name the templates actually ask for
for asset in libs.bundled.js analysis.bundled.js base.css; do
    curl --fail --max-time 5 --silent --output /dev/null "$URL/static/dist/$asset" \
        || { echo "Installed Galaxy did not serve /static/dist/$asset" >&2; exit 1; }
done
```

Better still, scrape `/` for its `/static/dist/...` references and fetch those — that verifies the
served page and the shipped wheel agree, which is the property #23254 actually regressed, and it
survives any future renaming. Either way, replace the bare `next(...)` with something that emits
a sentence when it finds nothing.

### P2-3 — Pinning `galaxy-release-util` in the workflow makes the script's fallback dead code in CI

`first_startup.yaml:73-74`:

```yaml
      - name: Install release tooling
        run: uv tool install galaxy-release-util==0.4.2
```

That pin already exists at `lib/galaxy/dependencies/dev-requirements.txt:52`
(`galaxy-release-util==0.4.2`) — and `build_release_packages()` was written specifically to read
it (`package-build-install.sh:56-59`):

```sh
    elif command -v uvx >/dev/null; then
        local release_util_requirement
        release_util_requirement=$(grep '^galaxy-release-util==' ../lib/galaxy/dependencies/dev-requirements.txt)
        uvx --from "$release_util_requirement" galaxy-release-util build --galaxy-root ..
```

Because the workflow installs the tool first, `command -v galaxy-release-util` always succeeds
and CI **always** takes the first branch. The uvx fallback — the more interesting path, and the
one that keeps the pin in one place — is never exercised by CI at all.

There are now four places that say something about this version: `dev-requirements.txt:52`,
`first_startup.yaml:74` (pinned), `publish_artifacts.yaml:53` (`uv tool install galaxy-release-util`,
**unpinned**), and the grep above. Drop the workflow step entirely and let the script's fallback
resolve the pin — that both removes a duplicate and gives the fallback CI coverage. If the step
must stay, install from the requirements file rather than restating the version.

### P2-4 — `-m` now silently ignores `up_to` and `PACKAGE_LIST_FILE`

`package-build-install.sh:107-108` routes `-m` (without `-e`) away from the loop entirely:

```sh
if $META && ! $EDITABLE; then
    build_release_packages
else
    while read -r package; do
```

But `usage()` (`:73-78`) still advertises `usage: $0 [-bem] [up_to_package]`, `:100-105` still
parses and validates `up_to`, and `:10` still honours `PACKAGE_LIST_FILE`. On the `-m` path all
three are inert: `galaxy-release-util`'s `get_sorted_package_paths` (`point_release.py:276-280`)
hardcodes `packages/packages_by_dep_dag.txt` and has no notion of stopping early. So
`./package-build-install.sh -m util` — previously "build up to util" — now quietly builds
everything, and `PACKAGE_LIST_FILE=packages_for_pulsar_by_dep_dag.txt ... -m` quietly ignores the
override.

Fix: error out rather than ignore.

```sh
if $META && ! $EDITABLE; then
    if [ -n "$up_to" ]; then
        echo "ERROR: up_to_package is not supported with -m (galaxy-release-util builds all packages)" >&2
        exit 2
    fi
    build_release_packages
```

`galaxy-release-util build` does take `--packages`, so a subset could be forwarded if that is
wanted instead. Either way, update `usage()`.

---

## P3 findings

- **Polling arithmetic and the failure message disagree.** `installed_startup.sh:56` is
  `for ((i = 0; i <= TRIES; i++))` — 121 iterations, not 120 — and each carries `curl --max-time 1`
  *plus* `sleep 1` (`:57, 66`), so `:69`'s "did not become ready after $TRIES seconds" understates
  the real wall clock by up to 2x once the socket is listening but slow. The `TRIES=120` /
  `--max-time 1` shape is inherited from `.ci/first_startup.sh:20, 26-30`, so the pattern is
  consistent; only the message is new and wrong. Either count elapsed seconds properly or say
  "after $TRIES attempts".
- **Not reachable from tox.** `.ci/first_startup.sh` is wired in at `tox.ini:19`
  (`first_startup: bash .ci/first_startup.sh`) and `:28` for reports, so a developer can
  reproduce it locally with `tox -e first_startup`. The new script has no such entry — it exists
  only inside a GitHub workflow. Adding `installed_startup` to `tox.ini`'s envlist and commands
  would match the house pattern and make the thing debuggable without pushing to CI.
- **`PIP_EXTRA_ARGS` literal duplicated.** `package-build-install.sh:28` is byte-identical to
  `packages/test.sh:9`. The root `pyproject.toml:278-279` already declares the same two settings
  in `[tool.uv]`. I checked whether that could just be inherited — it cannot, because uv stops
  config discovery at the nearest ancestor `pyproject.toml` containing a `[tool.uv]` table, and
  `packages/pyproject.toml:8-11` has one (verified with a two-level fixture: `uv pip install -v`
  from the child hit only PyPI, from the parent it also hit the parent's `extra-index-url`).
  So hardcoding is defensible today — but adding `extra-index-url` and `index-strategy` to
  `packages/pyproject.toml`'s `[tool.uv]` would let *both* scripts drop the literal, which is
  the reusable version of this fix.
- **Silent grep failure.** `package-build-install.sh:58` — if the `galaxy-release-util==` line is
  ever renamed or the file moves, `set -e` aborts with grep's bare exit 1 and no message, in a
  branch whose sibling at `:60-62` takes the trouble to print a real error. Add an `|| { echo ...; exit 1; }`.
- **`: "${VENV=../.venv}"`** (`:19`) uses `=`, not `:=`, so an explicitly-empty `VENV=` survives
  and `:20-23` turns it into `$(pwd)/`. Probably nobody does this; `:=` costs nothing.
- **Hardcoded port 8080** (`installed_startup.sh:8`) with no free-port selection. It matches
  `.ci/first_startup.sh:5` and gravity's default (`gravity/settings.py:160-162`), so it is
  consistent rather than novel, and on a dedicated GH runner the race is theoretical. A one-line
  comment pointing at gravity's default would stop the next reader wondering where 8080 came from.
- **shellcheck is clean.** `uvx --from shellcheck-py shellcheck .ci/installed_startup.sh packages/package-build-install.sh`
  reports exactly one finding, `SC2329 (info): This function is never invoked` on `cleanup` —
  a known false positive for `trap` handlers. `bash -n` passes on both files.

---

## Reuse and abstraction

The user's standing question is whether this leaves behind something reusable or just accretes.
Mixed, and the mixture is worth naming precisely.

**Genuinely factored out.** `ensure_venv()` / `pip_install()` / `build_release_packages()`
(`package-build-install.sh:34-64`) replace two stringly-typed command variables with functions
that make the target interpreter explicit. That is a real improvement to a script that had been
relying on ambient `VIRTUAL_ENV` state. `local release_util_requirement` is declared on its own
line at `:57` before the assignment at `:58` — avoiding the classic `local x=$(cmd)` exit-code
masking under `set -e`. Someone was paying attention.

**Duplicated rather than shared.** `.github/workflows/publish_artifacts.yaml:47-56` is already
"set up Python, `uv tool install galaxy-release-util`, `galaxy-release-util build`". The new
`installed-test` job is that same sequence with a different interpreter, plus install-and-boot.
Between the two workflows and `build_release_packages()`, there are now three places that know
how to invoke `galaxy-release-util build`. A composite action or a `workflow_call` job — mirroring
how `build_client.yaml` is already shared via `first_startup.yaml:17-18` — would collapse them and
would also let `installed-test` inherit whatever caching the build half eventually grows (P1-2).

**Two divergent startup probes.** The new script is *better* than `.ci/first_startup.sh` on
every axis that matters: `set -euo pipefail` vs. none, a trap that dumps the log on any exit path
vs. an unconditional `cat` at the end, `kill -0` liveness detection so a crashed server fails in
seconds instead of after the full 120, and `curl --fail`. That last one is the sharpest contrast
— `.ci/first_startup.sh:27` is `curl --max-time 1 "$URL"` with **no** `--fail`, so the existing
first-startup test passes on any HTTP response including a 500. The PR fixes that for its own
script and leaves the old one alone. Converging them (or at least adding `--fail` next door) is
a small change with real value, and this PR is the natural moment.

**A loop that was touched but not converged.** `package-build-install.sh:110-129` still reads
the DAG file with a bare `while read -r package`, which drops a final unterminated line and does
not skip `#` comments. `packages/test.sh:54-62` handles both, and `galaxy-release-util`'s
`get_sorted_package_paths` (`point_release.py:280`) filters comments too. Three readers of the
same file, two of which are careful. Minor, but the PR rewrote the surrounding block.

---

## What's good

Worth saying plainly, because the P1s are about plumbing rather than the idea:

- **The asset assertion is not vacuous, and I checked rather than assumed.**
  `lib/galaxy/webapps/base/webapp.py:68-72` imports `galaxy.web_client` and sets
  `default_static_dist_dir` to that package's `dist`; `:1191-1195` maps `/static/dist` to it
  unless `static_dist_dir` is configured. The script `cd`s into a fresh `mktemp -d` with no
  `static/` directory and no config, so a 200 on `/static/dist/<asset>` can only be served out
  of the installed wheel. This is a real end-to-end proof of the thing #23254 fixed.
- **The failure modes are mostly diagnosable.** The `trap cleanup EXIT` at `:14-27` dumps
  `$LOG_FILE` on any nonzero exit, and gravity's multiprocessing process manager launches
  services as `multiprocessing.Process` children inheriting stdout/stderr
  (`gravity/process_manager/multiprocessing.py:32`), so the gunicorn traceback really does land
  in the captured log rather than in a separate gravity logfile that `rm -rf "$WORK_DIR"` would
  destroy. I checked that specifically, expecting to file it as a finding, and it holds up.
- **`kill -0 "$GALAXY_PID"`** (`:62-65`) — the loop distinguishes "still starting" from "already
  dead" and prints a different message for each. That is exactly the thing the existing
  `.ci/first_startup.sh` lacks, and it is the difference between a 5-second failure and a
  2-minute one.
- **`$(abspath $(VENV))`** at `Makefile:218` rather than `$(realpath ...)`. GNU make's `realpath`
  returns empty for a path that does not exist yet, which is the normal case for a venv about to
  be created; `abspath` is purely lexical and correct here.
- The `install_requires` insertion lands at the same position `galaxy-release-util` generates it
  (`point_release.py:1036` `lines.insert(options_start, ...)`), which is why the rebase merged
  cleanly instead of conflicting.

---

## Tests

No tests were weakened or removed — verified, nothing under `test/` or `packages/*/tests/` is
touched by the diff. `packages/web_client/tests/test_packaging.py` and `check_artifacts.py`
(both from #23254, already in the base) remain the unit-level guard; this PR adds the
integration-level one. That layering is right.

The gap is P2-2: the integration assertion is currently coupled to a bundler chunking heuristic
rather than to the contract (`templates/js-app.mako:29, 55`), so it is more likely to fail
spuriously than to fail for the reason it exists.

---

## Verification honesty

Did **not** run: the CI job, a Galaxy venv bootstrap, `make install-packages`,
`galaxy-release-util build`, or the startup script — per the review brief, and because the client
build alone would dominate.

Did run: `git fetch origin-https release_26.1` (→ `636ca92828`); a real cherry-pick of
`78a882de5c` onto `636ca92828` in a throwaway worktree (output quoted above); `bash -n` on both
shell scripts; `uvx --from shellcheck-py shellcheck` on both; a minimal setuptools package
exercising `install_requires = file: requirements.txt` with and without the file (output quoted);
and a two-level `pyproject.toml` fixture with `uv pip install -v` to check where uv stops
discovering `[tool.uv]` config.

Everything else is read from the sources cited — the worktree, `galaxy-release-util` v0.4.2
(`galaxy_release_util/point_release.py`, fetched from the `v0.4.2` tag), and gravity v1.2.3
(`pyproject.toml`, `gravity/settings.py`, `gravity/cli.py`,
`gravity/process_manager/multiprocessing.py`).

---

## Summary for the author

The idea is right and the packaging hole is real — I confirmed a metapackage wheel can be built
with zero dependencies and no error at all, which nothing else in CI catches. Three asks before
merge:

1. Don't let `make install-packages` default to the developer's main `.venv`, and say out loud
   that the script's default venv moved from `packages/.venv` to `<galaxy_root>/.venv` (P1-1).
2. Decide deliberately about the client rebuild the new job triggers — it is four call levels
   below the diff and duplicates the workflow's own cached `build-client` (P1-2).
3. Assert on `libs.bundled.js` / `base.css` (or whatever `/` actually references) rather than on
   a rolldown manual-chunk name (P2-2).

And drop the `packages/meta/setup.cfg` hunk on rebase — `094145bc80` already landed that exact
line.
