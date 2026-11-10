# Implementation debrief

Commit `a9f7a45b` on `origin/main` `e72d75cb`.

## What changed

- `content/research/nextflow-to-galaxy-channel-shape-mapping/index.md`: new "Per-element parameters from `meta`" section (route, wiring, pairing rule, evidence table, fallback order). `val(meta)` row points at it. `branch { ... }` row untouched (#758). Revision 3.
- `verification/workflows/per-element-parameter-from-file/`: #674's workflow and test, `name:` → `label:` to match siblings, plus a second case with the value collection reversed.
- Casts (3) and `content/Dashboard.md` regenerated.

## Verification

- `planemo test` (0.75.48, Galaxy `release_26.1`): 2/2 passed. Case 1 jobs ran `head -n 1` / `head -n 3`. Case 2 (values reversed) ran `head -n 3` for `a`, `head -n 1` for `b`: pairing is positional.
- `planemo workflow_lint --skip best_practices`: clean.
- IWC `consensus-peaks-atac-cutandrun` steps 18–20 re-checked on `iwc` `origin/main`: `split_file_to_collection` → mapped `param_value_from_file` → `samtools_view` `mode|subsample_config|subsampling_mode|target` (a conditional case parameter, not a test parameter).
- Galaxy refs checked on `release_26.1`: `map_over_expression.gxwf.yml`, `test_run_workflow_conditional_step_map_over_expression_tool`, `walk_collections` (indexes by position).

## Local gate

`make check` parts: validate, check-generated, check-planemo-pin, check-casts, check-verify, check-assemble-pipelines, check-fixtures, test all pass. `check-vendored` fails on local upstream drift only (known, machine-specific). `validate-roadmap` fails on GitHub state unrelated to the branch (`#768` has sub-issue `#783` without `roadmap/substep`).

## Notes

- No red-to-green: docs plus a new fixture; there is no failing check on the base to turn green. The fixture is the test.
- Local planemo needed `uvx --python 3.11 ... --galaxy_python_version 3.11`: `~/.planemo/gx_venv_3_release_26.1` is a stale Python 3.9 venv.
