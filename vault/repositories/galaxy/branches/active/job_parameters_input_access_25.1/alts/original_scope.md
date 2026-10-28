# Alt: original scope

Branch `job_parameters_input_access_25.1_alt_original_scope` at `fba59af067f` ([GitHub](https://github.com/jmchilton/galaxy/tree/job_parameters_input_access_25.1_alt_original_scope)).

`parameters_display` only (both endpoints + markdown directive): inaccessible hda/hdca/dce inputs described by `{src, id}`; access predicate is a closure in `summarize_job_parameters`. Hardened once (normal review, test challenges, Codex, thermo-nuclear, baseline refactor).

Differs from the parent: parent also applies the contract to tool-form data options (`/api/jobs/{id}/build_for_rerun`) and moves the predicate to `GalaxyRBACAgent`.
