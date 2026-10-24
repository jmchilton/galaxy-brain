# Normal review debrief

Acted on both real bugs and the naming nit in `66054950`: the `style=run` fetch now goes through `get_dict_from_workflow` (extended with `style`/`history_id`) and falls back to invoking without params, with a warning, if Galaxy errors (missing tools, cycles, empty workflows). Added a unit test for the fallback. Renamed the private helper to `_replacement_params_for_invocation`.

Not acted on:
- Local `${` text precheck to skip the request: misses subworkflows referenced by URL/ID; the fallback covers the failure risk.
- Specific exception class for the job-file error: bare `Exception` matches surrounding `activity.py` code.

<details><summary>Full review</summary>

Verdict: small and correct normally; matches Galaxy UI data source (`model.js` uses `runData.steps`, `step_type == "parameter_input"`, `step_label`). Subworkflow formal inputs already subtracted by `SubWorkflowModule.get_informal_replacement_parameters`. Job-dict check reasonable. CWL unaffected.

Bugs: (1) hard failure on the extra `style=run` request — `_workflow_to_dict_run` raises on missing tools, cycles, empty workflows, `ParameterValueError`; heavy on large/remote workflows. Fix: try/except, warn, return `{}`. (2) reuse `planemo/galaxy/api.py` `get_dict_from_workflow`.

Nits: bare `Exception`; confusing public/private helper names; missing fallback test.

</details>
