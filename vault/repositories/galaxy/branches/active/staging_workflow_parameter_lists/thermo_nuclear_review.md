Run via Claude Opus at high effort.

# Thermo-nuclear review — staging_workflow_parameter_lists

Scope: `git diff origin/dev...HEAD` at `1d9fe514` (base `fd43a3c6`). Review prompt: `vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md`.

## Verdict

Approve after one small fix, now applied as `74afe81b` and pushed to `jmchilton`.

The core change is in the right layer. It is one guard in `galactic_job_json`'s single top-level dispatch loop, plus keyword plumbing through `StagingInterface.stage` and `stage_inputs`. There is no structural regression, no new abstraction layer and no scattered special cases. The `populators.py` adoption deletes a mechanism (`raw_params` pop, `del`, `update`) rather than adding one, which is the code-judo outcome. File sizes: `util.py` is 707 lines and `staging.py` 388. `populators.py` was already 5254 lines and the branch adds roughly nothing net, so the 1k rule doesn't apply.

## Findings

### 1. Duplicate branches in `run_workflow` (fixed, `74afe81b`)

After the adoption, the bare-scalar branch and the scalar-list branch had identical bodies (`parameter_input_keys.add(k)`). That duplication was new on this branch: before, both bodies did `raw_params[k] = v; del job_copy[k]`. I collapsed them into one `elif test_data_format == "cwl_style" and _is_scalar_or_scalar_list(v)`, with a module-level predicate next to `_uses_class_syntax`. Behavior is unchanged:
- non-list values match when they aren't dicts (old branch A);
- lists match when they contain no nested dict or list (old branch B);
- dicts never reached either branch.

I also dropped `list(...)` around `job_copy.items()`. It existed only because the old loop `del`ed during iteration. The loop now only reassigns existing keys, which doesn't change the dict's size.

### 2. Considered, rejected: making `parameter_input_keys` non-optional (`= frozenset()`)

That would drop the `if parameter_input_keys and ...` truthiness check. But the planned planemo adoption (implementation_debrief.md) passes `parameter_input_keys=None` explicitly. Removing `None` from the public `galactic_job_json` / `StagingInterface.stage` signatures would break that caller's typing, and at runtime `key in None` raises. Keep `Set[str] | None`.

### 3. Considered, rejected: rewriting the `util.py` loop as a comprehension

The guard sits at the canonical spot. A comprehension rewrite would be churn on dev-owned lines, not a simplification.

### 4. Considered, not done: extracting the whole `cwl_style` job-prep loop into a pure helper

That would shorten `run_workflow` by about 20 lines. It wouldn't decompose anything, and the `type: raw` unwrap path is only covered by an API test outside this run's allowed test set. Left as is.

## Runs

- Unit: `test_cwl_util.py` + `test_staging.py`, 25 passed.
- Framework workflow: `multiple_text` passed.
- ruff, black and isort are clean on the 4 touched files. mypy has no errors on the touched `populators.py` lines. Pre-commit hooks passed.
- Not re-run: `multiple_integer_into_data_column` (framework) and `api/test_workflows.py::test_run_subworkflow_with_boolean_parameter_in_when_condition`.
  - `74afe81b` drops the `list()` copy on the loop that unwraps `type: raw`. This should be safe, since the loop only reassigns existing keys. A Python 3.14 check confirmed that reassigning values mid-iteration doesn't raise.
  - That API test is the only coverage of this path, so please run it.

## Questions for John (out of scope, not done)

- Should the `cwl_style` shape heuristic (`_is_scalar_or_scalar_list`) eventually become type-aware, deriving keys from the workflow's parameter inputs as planemo does? The implementation debrief says that needs gxformat2 normalization; review 1 says the shape heuristic is enough.
- `collections.abc.Set` has no other use in `lib/`. Is it OK as the new convention for "set-like, not str"? It was chosen deliberately in `d1592a31`.
