## What

`make config-rebuild` is not a no-op on `dev`. This makes it one again and adds CI to keep it that way.

Three commits:

1. **Rebuild generated config artifacts from schema** — the drift that exists on `dev` today.
2. **Config generators: emit whitespace pre-commit will not rewrite** — the reason the drift keeps coming back.
3. **CI: fail when generated config files drift from the schema** — the guard.

## The drift

Running `make config-rebuild` on `dev` at `7524f5e2507` produces:

| File | Change |
| --- | --- |
| `lib/galaxy/config/_galaxy_config_schema_attributes.py` | adds the missing `expression_evaluation_isolation_command: str` |
| `lib/galaxy/config/sample/galaxy.yml.sample` | rewraps the `retry_job_output_collection` description |
| `doc/source/admin/galaxy_options.rst` | rewraps `retry_job_output_collection` and `expression_evaluation_isolation_command` |

The type stub being stale is the one with teeth — a schema option had no annotation on `GalaxyAppConfigurationAttributes`, so type checkers could not see it.

## Why the drift recurs

The generators emitted whitespace that `.pre-commit-config.yaml.sample` strips back out:

- `_write_to_file` left a trailing blank line at EOF (`trailing-whitespace`'s sibling `end-of-file-fixer` strips it)
- `_to_rst` ended the file with three blank lines, same story
- `_build_sample_yaml` turned blank description lines into `"# "` (`trailing-whitespace` strips the space)

So the committed files flipped back and forth depending on whether the person who last ran `make config-rebuild` had pre-commit installed. `git log` on `galaxy.yml.sample` shows the EOF byte alternating between `...se\n` and `...se\n\n` across the last ~25 commits that touched it.

This matters beyond tidiness: without it the new CI check would be a trap. A contributor edits `config_schema.yml`, runs `make config-rebuild`, commits with pre-commit installed, and CI tells them to run `make config-rebuild` — which they just did.

Commit 2 makes the generators emit the stripped form, so the two agree. Verified by running `trailing-whitespace-fixer` and `end-of-file-fixer` directly against all four generated files: both are now no-ops, and the pre-commit run on commit 2 itself passed every hook.

## The check

`.github/workflows/config_drift.yaml` follows the existing `lint_openapi_schema.yml` shape — install deps, run the make target, fail if the tree is dirty, with the diff printed first so the failure is readable.

Two deliberate differences from that file:

- **`doc/**` is not in `paths-ignore`.** `galaxy_options.rst` is one of the generated files, so a PR that only hand-edits it is exactly the case this should catch.
- **Single Python version** rather than a `3.10` / `3.14` matrix. The generators read an ordered YAML schema and the output does not depend on the interpreter; a second job would double the cost for no coverage.

## Testing

- `make config-rebuild` twice in a row is byte-identical (md5 of all four artifacts) — the generators are idempotent, so the check cannot flap.
- Simulated the CI step locally: dirty (3 files) at `dev`, clean after the branch.
- `test/unit/config/` — 73 passed, including the 12 in `test_config_manage.py`.
- `black`, `ruff`, `flake8`, `isort` clean on `config_manage.py`; `check-jsonschema --builtin-schema vendor.github-workflows` and `zizmor` clean on the new workflow.
- Commits 2 and 3 were made with the repo's own pre-commit hooks enabled and passed all of them, including `trim trailing whitespace` and `fix end of files` on the regenerated files.

## Noticed, not fixed here

`Makefile`'s `config-rebuild` no longer builds reports artifacts, but `config/reports.yml.sample` and `doc/source/admin/reports_options.rst` are gone from `dev` too, so nothing is orphaned — just noting that the target now covers galaxy and tool_shed only.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
