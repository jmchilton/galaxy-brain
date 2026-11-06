# Draft issue for `galaxyproject/gxformat2`

Not posted. From [skunkworks_plan.md](skunkworks_plan.md). Owner: the `workflow_libs` agent. The TS port follows it: [upstream_galaxy_tool_util_ts_validate_draft_warnings.md](upstream_galaxy_tool_util_ts_validate_draft_warnings.md).

**Title:** `validate_draft`: warn on unconsumed inputs, unconsumed steps and dangling `contains_steps`

`validate_draft` reports a draft as valid when an edit leaves dead structure behind. On `gxwf` 1.15.0, a draft with a workflow input nothing consumes, a step nothing consumes, and a comment frame whose `contains_steps` names a missing step reports `draft valid` with no warnings. Foundry's `repair-galaxy-draft-topology` removes steps and has to compute this by hand. A required dead input is what a user meets on the run form.

Add three warnings, not errors:

- A workflow input with no consumer. Consumers are any step `in` source (including an input used only by a `when`), any `outputSource`, and a `${label}` placeholder in an `out:` `rename`.
- A step with no consumer and no workflow output. Plot-only steps are legitimate, so word this as something to check.
- A `contains_steps` entry matching no step. Match against the map key, `id` and `label`: real drafts list labels.

Apply them per scope, including nested subworkflows. Corpus check, as warnings: 7 of 916 inputs across 2 of 120 IWC format2 workflows, and 7 of 2,612 steps across 4 workflows, including `dada2` plot steps.

Add fixtures and `validate_draft.yml` expectations here, so `galaxy-tool-util-ts` picks them up through `sync-workflow-expectations`. Existing expectations on `warnings` counts may need revisiting.
