# gxformat2 #264 — Text parameter input validators are dropped in format2 conversion

- [Issue](https://github.com/galaxyproject/gxformat2/issues/264) (filed by Claude for John)
- Fix: [gxformat2#265](https://github.com/galaxyproject/gxformat2/pull/265) (CI green 2026-10-15), branch `jmchilton:text_input_validators`, worktree `~/projects/worktrees/gxformat2/branch/text_input_validators`
- Origin: Galaxy branch [invocation_parameter_expected_failure](../../../../galaxy/branches/active/invocation_parameter_expected_failure/index.md) had to patch a native export because of this bug

## 2026-10-15 — confirmed and PR opened

Reproduced on `origin/main` `5bcaa9d`: regex validators were dropped by `to_native`, `python_to_workflow`, `to_format2`, and `from_galaxy_native`.

Galaxy's persisted shape (`lib/galaxy/workflow/modules.py` `get_export_state`) is `{type: regex, expression, message, negate: false}`. Galaxy always writes `validators: []`, even when empty. The field names match `RegexParameterValidatorModel` in `tool_util_models/parameter_validators.py`.

PR #265 commits:
- `d57ee3b` — regenerated `v19_09_draft.py` only. `main`'s copy drifts from the pinned schema-salad 8.10.20260825112551 even with unchanged sources.
- `6d4dbe4` — added a `WorkflowTextValidator` record in `common.yml` and a `validators` field on `WorkflowTextParameter` and the catch-all `WorkflowInputParameter`. Changed conversion in `_conversion.py` both ways. `validators` is now a text-only semantic field. Declarative fixtures and expectations were added, written red first.

Local: 890 passed / 8 skipped. ruff (CI version), black, flake8, mypy, pyrefly, and the schema dry-run build all pass. Remaining isort/ruff E402 hits in `scripts/` and `docs/conf.py` were already there.

Found while working, not fixed:
- Strict validation of **dict-form** `inputs` falls back to `dict[str, Any]`, so unknown keys pass `validate_format2_strict`. The new fixture uses list form so its strict check actually runs.
- A list-form `type: [string]` input fails even lax validation (it hits the discriminated union).
- In-repo `java/` and `typescript/` codegen is stale and doesn't build (the TS fails with `TS2339`). `make lint` skips both.
- `directory_uri` has no Format2 type, and `_build_input_step` raises on it.
- galaxy-tool-util-ts needs `make sync-schema-sources` plus a fixture sync to pick this up.

## 2026-10-15 — closed

PR #265 merged as `eb1d3ff`; GitHub closed #264. The worktree is still in place. It holds only untracked `.DS_Store` files, and its HEAD `6d4dbe4` is the merged PR head.
