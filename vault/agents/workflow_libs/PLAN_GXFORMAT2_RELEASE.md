# Cut a gxformat2 release

Release `galaxyproject/gxformat2` to PyPI. Upstream owns the process; defer to it:

- `docs/developing.rst` → "Releases" — checklist, steps, trusted publishing.
- `.agents/skills/ready-release/SKILL.md` — the interactive walkthrough, through the GitHub release. Follow its steps and stop points.
- `Makefile` targets `add-history`, `check-release`, `release`, `release-notes`.

Read those from `origin/main` first; if they disagree with this file, upstream wins — tell John.

## Local specifics (not in upstream docs)

- Clone: `~/projects/repositories/gxformat2`. Remotes: `galaxyproject` (upstream, matches Makefile's default `UPSTREAM`) and `jmchilton` (fork). Don't pass `UPSTREAM=` overrides.
- The clone may be stale and dirty. Before starting: `git fetch galaxyproject`, check `git status`. Don't discard uncommitted work — show it to John. Release from a clean `main` fast-forwarded to `galaxyproject/main` (if clone is dirty - resolve with John before publication).
- `make release` commits the version, tags, mints the next `.devN`, and pushes `main` + tags directly to upstream. That push is outward-facing and irreversible (tag → PyPI publish). Get John's explicit go-ahead right before it, every time.

## Before release

- Confirm `galaxyproject/main` CI (`tox`, `typescript`, `maven`, `deploy` build job) is green on the commit being released: `gh run list --repo galaxyproject/gxformat2 --branch main`.
- Target version: propose from the HISTORY entries (minor bump for features/drops, patch for fixes only), confirm with John.
- Patch release after main already minted the next minor (e.g. `0.30.0.dev0` → `0.29.1`): set `__version__` and the HISTORY `.devN` header to `X.Y.Z.dev0` before `make add-history`. `make release` then mints `X.Y.(Z+1).dev0`; bump back to the minor afterwards only if John asks.
- Review `make add-history` output for junk/dupes; John may want dependabot lines trimmed or grouped — ask.

## After release

- Watch the tag's `Deploy` run reach `pypi-publish` success; verify the version on https://pypi.org/project/gxformat2/.
- Create the GitHub Release per upstream docs: `make release-notes RELEASE_TAG=X.Y.Z > <scratch>/notes.md`, show John the body first (its `@` thanks notify people), then `gh release create` as documented.
- Append this task to this dir's `TASKS.md` gb-tasks block (no need to ask; John launches tasks), per [`TASK_LIST_YAML_FORMAT.md`](../_shared/TASK_LIST_YAML_FORMAT.md), filling in `X.Y.Z`:

  ```yaml
  - prompt: |
      gxformat2 X.Y.Z is on PyPI. Create Galaxy branch gxformat2_X_Y_Z off origin/dev bumping gxformat2: `pyproject.toml` floor and `lib/galaxy/dependencies/pinned-requirements.txt` pin (check other pins, e.g. `packages/*/setup.cfg`, via `git grep gxformat2`). Note any HISTORY changes affecting Galaxy. Hand off per GX_IMPLEMENTATION_HANDOFF.md.
    agent_dir: workflow_libs
    description: Follow-up to the gxformat2 X.Y.Z release.
    status: recommended
    link: https://pypi.org/project/gxformat2/X.Y.Z/
  ```
- Note other downstream consumers that may want a bump (planemo, gxwf-web, galaxy-tool-util-ts fixtures/schema sync) — list, don't act.
- Sync any galaxy-brain notes per VAULT_SYNC.

## Unresolved questions

- npm/TypeScript (`typescript/`) or Java (`java/`) artifacts released too, or PyPI only? Upstream CI publishes PyPI only.
- Trim dependabot entries from HISTORY?
