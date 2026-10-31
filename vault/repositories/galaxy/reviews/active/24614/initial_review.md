# Initial review: galaxyproject/galaxy#24614

- Profile: default
- Model: Claude Opus 5.5, medium effort
- Reviewed commit: `cbb45b061b1`

## Verdict

Approve-worthy. Small, well-scoped change; `install_uv` extraction is a reasonable reuse of the existing install branch, and the weekly workflow path checks out: `setup-uv` installs the old pin, `make update-dependencies` bumps `.tool-versions` and locks/exports with latest uv, then the `--check` step sees caller uv != new pin and installs the new pin, so the PR's own `--check` runs against the bumped version. `peter-evans/create-pull-request` picks up `.tool-versions` with the other changed files, and `dependency_exports.yaml` already triggers on `.tool-versions`. The awk rewrite only touches the `uv` line (checked with a multi-tool file; other lines, spacing and comments preserved). No bugs found; two minor items.

## Findings

### P3 1: `.tool-versions` is overwritten before the lock and exports succeed

`update.sh` copies the new pin into `.tool-versions` right after installing latest uv, before `uv lock --upgrade` and the exports run. If the lock or an export fails (`set -e`), a local run leaves the checkout with a bumped pin but the old `uv.lock`/exports — exactly the state `dependency_exports.yaml` rejects. This also diverges from the script's own rule a few lines later: "Generate all files before updating any checked-in export."

Suggested fix: keep writing to `"$temp_dir/tool-versions"` where it is, and move the `cp` into the final `if [ "$mode" != check ]` block (guarded by the same full-upgrade condition, or by the temp file's existence).

### P3 2: `packages/README.md` hardcodes the uv version that will now change weekly

`packages/README.md:24-25` says the pin is in `.tool-versions` "(`uv 0.12.23`)". With this PR the weekly bot bumps that pin, so the README goes stale on the first run. Drop the parenthetical; the sentence already points readers at `.tool-versions`.

## Not raised

- Missing-pin error "now in every mode": it already was on base; the PR description slightly overstates the change, harmless.
- `uv pip install uv` runs from the workspace root and so inherits `[tool.uv]` `extra-index-url`/`unsafe-best-match`; pre-existing for the pinned install too, and Galaxy's wheel index doesn't carry `uv`.
