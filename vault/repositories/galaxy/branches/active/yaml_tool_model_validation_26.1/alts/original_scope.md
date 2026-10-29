# yaml_tool_model_validation_26.1_alt_original_scope

[View on GitHub](https://github.com/jmchilton/galaxy/tree/yaml_tool_model_validation_26.1_alt_original_scope) · tip `1a5b68ca6b2`

The branch as it stood after the first hardening pass, before the re-scope: John's 2026-10-28 "Base" scope only. `class: GalaxyTool` YAML validates against its model on every load path; admin dataset outputs are strict; scalar outputs are gone; fixtures are converted; YAML tool tests verify collections and stdout/stderr.

How it differs from the parent: the parent adds the scope evaluation's Scope 2, which closes the three places where the model accepts a field and the loader drops it. `requirements: [{type: container}]` leaves the model, and the stored user-tool lift strips it. `citations` are now loaded. Collection-output `hidden` is honored.
