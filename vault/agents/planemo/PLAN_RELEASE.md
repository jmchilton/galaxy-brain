# Cut a planemo release

Release `galaxyproject/planemo` to PyPI. Upstream owns the process; defer to it:

- `docs/developing.rst` → "Release Checklist" — the steps.
- `.claude/commands/ready-release.md` — the interactive walkthrough. Follow its steps and stop points.
- `Makefile` targets `setup-venv`, `add-history`, `open-docs`, `lint`, `release` (= `commit-version new-version check-dist push-release`), `release-artifacts` (manual PyPI fallback).
- `.github/workflows/deploy.yaml` — tag push → `pypi-publish` (trusted publishing).

Read those from `origin/master` first; if they disagree with this file or each other, upstream code wins — tell John and offer a small upstream doc fix.

## Ask John before starting

Gather the facts first (current `__version__`, last tag, commits since it, existing GitHub Releases), show them, then ask in one batch:

- Target version: patch or minor bump? `commit-version` drops `.devN` from `__version__`; `new-version` mints the next patch `.dev0`.
- HISTORY trimming: drop/group dependabot lines? Dedupe hand-written entries vs `add-history` output?
- GitHub Release: create one for this tag? Backfill any recent tags missing one?
- Anything to land on `master` before cutting (pending PRs, fixes)?

## Local specifics (not in upstream docs)

- Clone: `~/projects/repositories/planemo`. It has a `galaxyproject` remote (Makefile default `UPSTREAM`), plus `origin`/`upstream` aliases of the same repo and `jmchilton` (fork). Don't pass `UPSTREAM=` overrides.
- The clone may be stale, dirty, or on another branch. `git fetch galaxyproject`, check `git status`. Don't discard uncommitted work — show it to John. Release from a clean `master` fast-forwarded to `galaxyproject/master` (a temp `git worktree` is fine if the clone is busy; then `make setup-venv` there).
- `make release` commits the version, tags, mints the next `.devN`, and pushes `master` + tags straight to upstream. Outward-facing and irreversible (tag → PyPI). Get John's explicit go-ahead right before it, every time.

## Before release

- `galaxyproject/master` CI green on the commit being released (`Python CI`, `Deploy` build job): `gh run list --repo galaxyproject/planemo --branch master`.
- HISTORY: the `.devN` section may already hold hand-written entries. `make add-history` appends merge-commit acknowledgements since the last tag; apply John's trimming answers and show the result. Commit HISTORY edits to `master` before `make release`.
- `make clean && make lint` must pass. Optionally `make open-docs` to eyeball the changelog render.

## After release

- Watch the tag's `Deploy` run reach `pypi-publish` success; verify on https://pypi.org/project/planemo/. If publish fails, stop and ask John before `make release-artifacts` (needs PyPI credentials).
- GitHub Release (if John said yes): historically created by hand from the HISTORY section. Draft notes, offer clipboard; don't create without a fresh go-ahead.
- Bioconda's autobump bot normally picks up the PyPI release; check later, don't act. `release-brew` is legacy — skip.
- Record the release (source SHA, tag, dev version, Deploy run, PyPI link) in `RELEASE_<date>.md` here, like `../pulsar/RELEASE_2026-10-11.md`, and sync galaxy-brain per VAULT_SYNC.
