# original_scope

Branch `issue_24200_workflow_input_validators_alt_original_scope` (head `3a0384164ee`, on the `jmchilton` remote). This is the hardened implementation before the re-scope.

It keeps declared workflow parameter validators through import, export, run and editor re-save, and rejects validators that cannot be built. It differs from the parent in one way: it does not check that a validator type suits the parameter type. For example, an `in_range` on a text input is stored as declared, and at run time it either does nothing or misbehaves. The parent adds that check, and moves the tool linter's `PARAMETER_VALIDATOR_TYPE_COMPATIBILITY` table into `tool_util_models` to share it.
