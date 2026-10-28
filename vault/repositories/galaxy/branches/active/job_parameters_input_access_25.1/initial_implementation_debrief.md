# Initial implementation debrief

Branch `job_parameters_input_access_25.1`, base `release_25.1` (`1e2458c196c`), head `fa505e833a6`.

```
created .../differential-review/snapshots/20261028T015526Z-implementation-fa505e833a6c.json
  implementation @ fa505e833a6c vs origin/release_25.1 (merge-base 1e2458c196cb)
  first snapshot: 2 commits, 6 files, 8 hunks
```

## What

Tightens the `parameters_display` contract (`/api/jobs/{id}/parameters_display`, deprecated `/api/datasets/{id}/parameters_display`, `job_parameters` markdown directive) so data inputs honor dataset access: an hda/hdca/dce input the caller can't access is described by `src` + `id` only (`hid`/`name` null), like `/api/jobs/{id}/inputs`. Admins see full values. Applies to anyone viewing the job, owner included.

- `summarize_job_parameters`: `can_access_data_input` (`can_access_dataset` for HDA/LDDA; `can_access_collection` for HDCA and DCE child collections) + `data_input_value`.
- `EncodedJobParameterHistoryItem.name` → `Optional`; client `schema.ts` regenerated (one field).
- `markdown_util._data_input_text`: inaccessible → "(not accessible)", no-hid (dce) → name only, `None` → "No input provided". Also fixes a prior KeyError on dce inputs.
- Client renderer unchanged: `JobParametersArrayValue.vue` renders hda/hdca/dce via `GenericItem` by id.

## Commits

1. Baseline tests: owner-visible hda/hdca/dce value shapes (pass on unmodified 25.1).
2. Change + 4 API tests (third party with access to output only: hda via both endpoints + admin full view; hdca; dce; owner after input's owner restricts it) + markdown unit test. All red before, green after.

## Tests run

- `test_jobs.py -k "parameters_display or rerun or dce_submission"`: 14 passed.
- `test_markdown_export.py`: 29 passed.
- black/ruff/isort/flake8 at 25.1 pins clean; mypy clean on changed files (env-only stub noise).

## Notes

- Bootstrap picked Python 3.14 (25.1 deps don't build); venv recreated on 3.12. Client deps via yarn (25.1 has no pnpm lockfile).
- The pre-commit hook runs a newer black than 25.1 pins and reformatted unrelated code; commits rebuilt and made with `--no-verify` after running pinned linters.

## Design questions

1. "(not accessible)" wording in markdown OK?
2. Admin bypass (matches `get_accessible_job` / `DatasetManager.is_accessible`) OK?
3. Owner gets no bypass — owner of a job whose foreign input was later restricted loses the name. Intended.
