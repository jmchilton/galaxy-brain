# Cut a planemo release

Release `galaxyproject/planemo` to PyPI. Upstream owns the process; defer to it:

- `docs/developing.rst` → "Release Checklist" — the steps.
- The interactive walkthrough: `.agents/skills/ready-release/SKILL.md` once [#1773](https://github.com/galaxyproject/planemo/pull/1773) merges, `.claude/commands/ready-release.md` before. Follow its steps and stop points.
- `Makefile` targets `setup-venv`, `add-history`, `open-docs`, `check-release` (after #1773), `lint`, `release` (= `commit-version new-version check-dist push-release`), `release-artifacts` (manual PyPI fallback).
- `.github/workflows/deploy.yaml` — tag push → `pypi-publish` (trusted publishing). Pre-#1773 docs wrongly say `ci.yaml`.

Read those from `galaxyproject/master` first; if they disagree with this file or each other, upstream code wins — tell John and offer a small upstream doc fix.

## Ask John before starting

Gather the facts first (current `__version__`, last tag, commits since it, existing GitHub Releases), show them, then ask in one batch:

- Target version: patch or minor bump? `new-version` always mints the next **patch** `.dev0`. For a minor release, set `__version__` and the HISTORY `.devN` header to `X.Y.0.dev0` (committed) before `make add-history`. After release, the next dev version can be edited and pushed to `master` the same way if John wants.
- HISTORY trimming: drop/group dependabot lines? Dedupe hand-written entries vs `add-history` output?
- GitHub Release for this tag, and backfill of any recent tags missing one (compare `git tag` with `gh release list`).
- Anything to land on `master` before cutting (pending PRs, fixes)?

## Local specifics (not in upstream docs)

- Clone: `~/projects/repositories/planemo`. It has a `galaxyproject` remote (Makefile default `UPSTREAM`), plus `origin`/`upstream` aliases of the same repo and `jmchilton` (fork). Don't pass `UPSTREAM=` overrides.
- The clone may be stale, dirty, or on another branch. `git fetch galaxyproject`, check `git status`. Don't discard uncommitted work — show it to John. Release from a clean `master` fast-forwarded to `galaxyproject/master` (a temp `git worktree` is fine if the clone is busy; then `make setup-venv` there, or pass `VENV=` pointing at the clone's venv).
- `make release` commits the version, tags, mints the next `.devN`, and pushes `master` + tags straight to upstream. Outward-facing and irreversible (tag → PyPI). Get John's explicit go-ahead right before it, every time.
- `gh release create` is blocked by the auto-mode classifier as a public surface even after John's go-ahead. Hand John the exact command to run with `!`.

## Before release

- `galaxyproject/master` CI green on the commit being released (`Python CI`, `Deploy` build job): `gh run list --repo galaxyproject/planemo --branch master`. Recheck right before `make release`; runs may still be in progress.
- HISTORY: the `.devN` section may already hold hand-written entries. `make add-history` appends merge-commit acknowledgements since the last tag; flag ones duplicating hand-written entries, apply John's trimming answers, show the result. Commit HISTORY edits to `master` before the checks.
- `make check-release` must pass (after #1773; before, `make clean && make lint`). Optionally `make open-docs` to eyeball the changelog render.

## After release

- Watch the tag's `Deploy` run reach `pypi-publish` success (`gh run watch`); verify on https://pypi.org/project/planemo/. If publish fails, stop and ask John before `make release-artifacts` (needs PyPI credentials).
- GitHub Release: Planemo uses GitHub's auto-generated "What's Changed" notes, not HISTORY. Command for John: `gh release create X.Y.Z --repo galaxyproject/planemo --title X.Y.Z --verify-tag --generate-notes`. For a backfill, also pass `--latest=false` if a newer release exists, and `--notes-start-tag <previous tag>` if the auto-detected range looks wrong.
- Bioconda's autobump bot normally picks up the PyPI release; check later, don't act. `release-brew` is legacy — skip.
- Record the release (source SHA, tag, dev version, Deploy run, PyPI link) in `RELEASE_<date>.md` here, like `../pulsar/RELEASE_2026-10-11.md`, and sync galaxy-brain per VAULT_SYNC.
