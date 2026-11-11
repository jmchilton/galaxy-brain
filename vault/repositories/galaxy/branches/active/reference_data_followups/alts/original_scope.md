# original_scope

Branch [`reference_data_followups_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/reference_data_followups_alt_original_scope) at `809d07fc8ad`: the hardened first-scope branch, before the re-scope.

It ports the #24798 round 0 findings only: contract-harness fixtures, closed-table and admin tests, the reference_data-only parity test, the shared helpers refactor, the YAML-only guard and loading through the authoring model.

The parent adds what [scope_evaluation.md](../earlier_drafts/1/scope_evaluation.md) recommended: a parity test over every user tool contract fixture plus the `YamlTextParameter.to_internal()` text-default fix it caught, and guard wording that names GalaxyTool/GalaxyUserTool.
