# original_scope

Branch `issue_24199_workflow_numeric_bounds_26.0_alt_original_scope` at `bfe5dc0e49f` (pushed to `jmchilton`).

Run-form fix only: workflow integer/float bounds reach the run form as `min`/`max`, and FormNumber handles one-sided bounds and empty optional fields. Fully hardened (normal review, test challenges, Codex, thermo-nuclear, refactor baseline).

Differs from the parent: the parent also bounds the editor's Default Value field and turns a saved `min > max` into a clear error (scope evaluation recommendation).
