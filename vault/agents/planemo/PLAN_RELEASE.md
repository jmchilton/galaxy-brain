# Cut a planemo release

Release `galaxyproject/planemo` to PyPI. Upstream owns the process; defer to it:

- `docs/developing.rst` → "Release Checklist" — the steps.
- `.claude/commands/ready-release.md` — the interactive walkthrough. Follow its steps and stop points.
- `Makefile` targets `setup-venv`, `add-history`, `open-docs`, `lint`, `release` (= `commit-version new-version check-dist push-release`), `release-artifacts` (manual PyPI fallback).
- `.github/workflows/deploy.yaml` — tag push → `pypi-publish` (trusted publishing). Upstream docs still say `ci.yaml`; deploy lives in `deploy.yaml`.

Read those from `origin/master` first; if they disagree with this file, upstream wins — tell John.

## Local specifics (not in upstream docs)

- Clone: `~/projects/repositories/planemo`. It has a `galaxyproject` remote (Makefile default `UPSTREAM`), plus `origin`/`upstream` aliases of the same repo and `jmchilton` (fork). Don't pass `UPSTREAM=` overrides.
- The clone may be stale, dirty, or on another branch. `git fetch galaxyproject`, check `git status`. Don't discard uncommitted work — show it to John. Release from a clean `master` fast-forwarded to `galaxyproject/master` (a temp `git worktree` is fine if the clone is busy; then `make setup-venv` there). Untracked `.DS_Store` is harmless.
- `make release` commits the version, tags, mints the next `.devN`, and pushes `master` + tags straight to upstream. Outward-facing and irreversible (tag → PyPI). Get John's explicit go-ahead right before it, every time.

## Before release

- `galaxyproject/master` CI green on the commit being released (`Python CI`, `Deploy` build job): `gh run list --repo galaxyproject/planemo --branch master`.
- Target version: `__version__` is `X.Y.Z.devN`; `commit-version` drops `.devN`. Planemo has been patch-only (`0.75.x`); propose patch unless John wants otherwise, confirm.
- HISTORY: the `.dev0` section may already hold hand-written entries (no PR links). `make add-history` appends merge-commit acknowledgements since the last tag, so review for duplicates of those hand-written lines and for dependabot noise; ask John how to trim. Commit any HISTORY edits to `master` before `make release`.
- `make clean && make lint` must pass. Optionally `make open-docs` to eyeball the changelog render.

## After release

- Watch the tag's `Deploy` run reach `pypi-publish` success; verify on https://pypi.org/project/planemo/. If publish fails, stop and ask John before `make release-artifacts` (needs PyPI credentials).
- GitHub Release: mvdbeek has created them by hand (none yet for `0.75.47`). Draft notes from the HISTORY section, offer clipboard; don't create without asking.
- Bioconda's autobump bot normally picks up the PyPI release; check later, don't act. `release-brew` is legacy — skip.
- Record the release (source SHA, tag, dev version, Deploy run, PyPI link) in `RELEASE_<date>.md` here, like `../pulsar/RELEASE_2026-10-11.md`, and sync galaxy-brain per VAULT_SYNC.

## Unresolved questions

- Patch (`0.75.48`) or minor bump? 142 commits since `0.75.47`.
- Create GitHub Release, incl. backfilling `0.75.47`?
- Trim dependabot lines / dedupe hand-written HISTORY entries vs `add-history` output?
- Fix the `ci.yaml` → `deploy.yaml` drift in `docs/developing.rst` upstream (tiny PR)?
