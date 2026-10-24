Implement 🎯 #1750 - fill undeclared workflow `${...}` parameters with a loud sentinel and warn instead of leaving them literal.

A workflow whose rename reads `cat on ${undeclared}`, with no parameter input labelled `undeclared`, today runs under `planemo run`/`planemo test` without a word and produces a dataset literally named `cat on ${undeclared}`. That looks like a naming quirk, not a bug.

With this branch:

```
$ planemo run wf_undeclared_replacement_parameter.yml wf1.gxwf-job.yml ...
Workflow uses undeclared parameter ${undeclared}; sending "<DEPRECATED_PARAMETER_UNSET>". Declare a parameter input labelled undeclared.
```

and the output is named `cat on <DEPRECATED_PARAMETER_UNSET>`. **Workflows whose `${...}` names all match declared parameter inputs see no change.**

**There is still no way to supply a real value** - declaring a parameter input is the supported path. A job file that names an undeclared parameter now fails before invoking instead of being silently ignored. If Galaxy can't produce the run data planemo checks, the run warns and proceeds as before.

<details><summary>How</summary>

- After upload, planemo reads Galaxy's run-form data (`/api/workflows/{id}/download?style=run`), the same source the UI uses, and collects each step's `replacement_parameters` minus labels of declared parameter inputs. Galaxy's run data already includes informal names from subworkflows.
- It passes `replacement_params={name: "<DEPRECATED_PARAMETER_UNSET>"}` to `invoke_workflow` and warns once per name.
- The fetch reuses `get_dict_from_workflow`, extended with `style` and `history_id`.
- If Galaxy can't build run data (e.g. missing tools or cycles), planemo warns and invokes as before rather than failing a run that works today.

</details>

<details><summary>Tests</summary>

- `tests/test_galaxy_activity.py`: sentinel + warnings (including a subworkflow-level name and a declared label that must be dropped), no params when none are used, job-file rejection, fallback on fetch failure.
- `tests/test_run.py::test_run_fills_undeclared_replacement_parameter` and `..._in_subworkflow`: real Galaxy, top-level and nested rename; check the warning and that the downloaded output is named from the sentinel. `planemo test` goes through the same `_execute` path.
- On `master` the same workflow runs without any warning and keeps the literal `${undeclared}`.

</details>

## Risks

Risks are minimal - this change doesn't lock the project into particular difficult to change choices (a two-way door). Runs gain one extra API request per workflow invocation, and outputs that used to keep a literal `${name}` now carry the sentinel.

## Context

Lint side is handled in gxformat2 (branch `jmchilton/lint_untyped_params`), which planemo picks up with a gxformat2 bump. Tool-state `${X}` (the issue's open question) stays lint-only here.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approved on structure; no changes needed.</summary>

Reuses `get_dict_from_workflow`, keeps discovery a pure tested function, and adds one line to `_execute`. `activity.py` was already over 1k lines; splitting it is out of scope.

</details>

### ✅ Second Frontier Model Review

<details><summary>One finding: fail-closed vs fail-open when run data can't be fetched.</summary>

Codex argued that a failed run-data fetch should stop the invocation, since otherwise the sentinel and the job-file check are skipped. This branch keeps fail-open: Galaxy's run-form endpoint errors on workflows that invoke tolerates, and failing closed would break runs that work today. The warning is printed either way.

</details>
