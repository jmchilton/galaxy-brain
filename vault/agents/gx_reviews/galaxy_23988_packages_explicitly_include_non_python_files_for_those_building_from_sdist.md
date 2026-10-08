# galaxy#23988 — packages: explictly include non-Python files for those building from sdist

- PR: https://github.com/galaxyproject/galaxy/pull/23988 (mr-c, not draft, base `dev`)
- Head reviewed: `ac656b19129cb9079dd560628bec33f7b5c22c6d` (1 commit, +20/-2, 3 files)
- Worktree: `~/projects/worktrees/galaxy/pr/23988`
- Status: reviewed locally, review **unposted**.
- Verdict: **approve, with one suggested addition** (graft `functional_tools` in tool_util). The PR's own entries are correct; it just doesn't cover everything its stated goal (running the tests downstream) needs.

## Summary

- `packages/tool_util/MANIFEST.in:1-15` — explicit `include` for the 15 non-Python data files under `lib/galaxy/tool_util`.
- `packages/util/MANIFEST.in:1-3` (new) — the 3 data files under `galaxy/util` and `galaxy/exceptions`.
- `packages/package.Makefile:8` — `SOURCE_DIR?=src/galaxy` so `make test` (`pytest $(SOURCE_DIR) tests`) points at a real path. Plus one trailing-whitespace fix (`:85`).

Mechanism: these packages use setuptools + `setuptools-scm`, which includes every git-tracked file. With no git (unpacked sdist) setuptools falls back to the sdist's `*.egg-info/SOURCES.txt`. Only when that egg-info is also gone (e.g. a distro clean step) do data files depend on `MANIFEST.in`. MANIFEST.in is already the established mechanism in tool_util (exclude/prune of `functional_tools` agent files) and web_client, so this extends the existing mechanism instead of adding `[tool.setuptools.package-data]`. Good.

## Findings

1. **`functional_tools` still missing (tool_util).** `lib/galaxy/tool_util/unittest_utils/functional_tools` is a git-tracked symlink to `test/functional/tools` (477 files in the wheel). Built from git, or from an sdist that still has its egg-info, it ships. Built from an egg-info-stripped sdist it is dropped even with this PR. `functional_test_tool_directory()` (`lib/galaxy/tool_util/unittest_utils/__init__.py:30-36`) resolves to it, and 12 modules in `test/unit/tool_util` use it. The PR says the target is downstream test runs, so those tests would still fail. Fix, placed before the existing `exclude`/`prune` lines so they still apply:
   ```
   graft src/galaxy/tool_util/unittest_utils/functional_tools
   ```
   Verified: with this line, the stripped-sdist wheel matches the normal wheel exactly. No `CLAUDE.md`/`.claude` gets in, and the git-built sdist is unchanged.
2. **Enumerated list will rot silently.** In normal builds (git, or `uv build` with egg-info) setuptools-scm hides any gap. A new data file added under `lib/galaxy/tool_util` will be missing only for downstream builders, and nobody upstream will notice. Not blocking. A cheap check is possible (see "Regression check" below). The alternative `graft src/galaxy/tool_util` + `global-exclude *.py[cod]` doesn't rot, but it also picks up untracked junk from dirty dev checkouts. The explicit list is a reasonable choice for this PR.
3. **`py.typed` not listed but fine.** Setuptools auto-includes `py.typed` in the stripped build (verified: all 4 present on dev already). No action.
4. **Scope: 2 of ~15 affected packages.** The same gap exists for every package with non-Python data. Rough tracked non-`.py` counts: data 468, tool_shed 272, objectstore 84, app 78, config 52, test_base 40, files 39, web_framework 6, schema 4. Fine if Debian only packages util/tool_util. Worth one sentence asking whether more packages are coming.
5. **Makefile change correct.** `package-pytest.ini` `--ignore=` entries are all `src/...`-relative, and CI `packages/test.sh` runs `pytest .`. `src/galaxy` makes `make test` agree with both. Not exercised (`make test` does `uv sync --all-extras` into a package venv). `meta/` has no `src/`, but `galaxy` didn't exist there either, so no regression. `web_client/Makefile:8` keeps its own `SOURCE_DIR?=galaxy`, but its `TESTS` doesn't use it, so it's harmless dead config.
6. Pre-existing sibling, out of scope: `packages/web_apps/MANIFEST.in` uses `galaxy/webapps/...` paths without the `src/` prefix, so its exclude/prune lines are no-ops. Don't put this in the review body unless the user wants it. It's a separate cleanup.
7. Nit: title/commit typo "explictly".

## Regression check (feasible)

`packages/test.sh:109` runs `uv build -o dist`. That already builds the wheel from the sdist, but the egg-info's `SOURCES.txt` masks MANIFEST gaps, so CI can't catch this today. A cheap check after that line: unpack `dist/*.tar.gz` into a temp dir, delete `*.egg-info`, `uv build --wheel`, and diff `unzip -Z1` listings against `dist/*.whl`. A precedent is `packages/web_client/check_artifacts.py` (run from `web_client/Makefile:85`), which already checks built artifacts for expected members. It could be generalized. Suggest as an optional follow-up, not a blocker for this PR.

## Verification

Builds went to the session scratchpad, which was then deleted, along with the in-tree `src/*.egg-info` dirs the builds created. Worktree is clean.

- `uv build` (sdist, then wheel from sdist) for `util` and `tool_util` at the PR head, and again with `packages/*/MANIFEST.in` reverted to merge-base (restored afterwards).
- Git-built sdist and wheel: identical non-Python contents on dev and the PR. The only difference is `MANIFEST.in` itself now in util's sdist. Setuptools-scm already covers the normal path.
- Unpacked each sdist outside git and rebuilt with `uv build --wheel`, (a) keeping and (b) deleting `*.egg-info`. Non-Python, non-dist-info wheel entries:

  | build | util | tool_util |
  |---|---|---|
  | dev, egg-info kept | 6 | 493 |
  | dev, egg-info stripped | 3 (py.typed only) | 1 (py.typed only) |
  | PR, egg-info kept | 6 | 493 |
  | PR, egg-info stripped | 6 (complete) | 16 (all 15 listed + py.typed; **no functional_tools**, 477 missing) |
  | PR + `graft functional_tools`, stripped | — | 493, full wheel listing identical to normal build |

- All 15 + 3 globs match real files (every listed path appears in the stripped-build wheel). `datatypes_conf.xml.sample` is a symlink and resolves fine.

## Draft GitHub review (UNPOSTED)

> _Posted by Claude (AI assistant) on behalf of jmchilton. Not written by them personally._
>
> Thanks! This looks right. MANIFEST.in is already how these packages handle the sdist file list, and all the listed paths exist. I checked by building util and tool_util sdists, unpacking them outside git, deleting the `*.egg-info`, and rebuilding the wheel. With this PR, util's wheel is complete, and tool_util gets all 15 data files back (on dev only `py.typed` survives).
>
> One gap for the downstream-tests use case. `galaxy/tool_util/unittest_utils/functional_tools` (a symlink to `test/functional/tools`, ~477 files) still drops out of that stripped build, and `functional_test_tool_directory()` plus a dozen `test/unit/tool_util` modules depend on it. Adding this before the existing `exclude`/`prune` lines fixes it. The rebuilt wheel then matches the normal one exactly, and the agent files stay excluded:
>
> ```
> graft src/galaxy/tool_util/unittest_utils/functional_tools
> ```
>
> Two non-blocking thoughts:
> - Other packages (data, tool_shed, objectstore, app, config, ...) carry non-Python files the same way. Are those on your list too, or only util/tool_util for now?
> - setuptools-scm hides any gap here in normal builds, so these lists can go stale unnoticed. A cheap guard in `packages/test.sh` would catch it: rebuild the wheel from the sdist with egg-info removed and diff the listing. `web_client/check_artifacts.py` is a precedent. Happy to see that as a follow-up.
>
> The `SOURCE_DIR` fix matches the `src/`-relative ignores in `package-pytest.ini`. Trivial: "explictly" in the title.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).
