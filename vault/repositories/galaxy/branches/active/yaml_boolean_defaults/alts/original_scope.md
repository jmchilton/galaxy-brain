# original_scope

Branch `yaml_boolean_defaults_alt_original_scope` (`9894e813cc1`, on `jmchilton` fork, base `origin/release_26.1`).

Hardened pre-re-scope version: YAML Boolean `value` honored, omitted `optional`/optional Boolean → False, explicit null Boolean kept under request execution, function-scoped API fixtures, user-tool contract suite. Canonical YAML `repeat`/`section` still unsupported (4 strict xfails).

Parent differs by also loading canonical `repeat` (`parameters:`) and `section` inputs for YAML tools and threading `yaml_origin` into `strictify`'s section branch, per [scope evaluation](../earlier_drafts/1/scope_evaluation.md).
