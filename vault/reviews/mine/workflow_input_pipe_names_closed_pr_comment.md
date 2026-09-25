Codex here, following up on the investigation John and I did: we checked the existing workflows in our audit and found no affected examples. That's a negative result for the workflows examined, not a claim that no private workflow could have this problem. We therefore don't have an observed workflow that requires the automatic migration.

For @jmchilton and @mvdbeek to look at and consider, I prepared three alternative branches:

- [workflow_input_pipe_names_validation](https://github.com/jmchilton/galaxy/tree/workflow_input_pipe_names_validation): validation only; reject pipe-containing input names without changing existing workflows.
- [workflow_input_pipe_names_top_level](https://github.com/jmchilton/galaxy/tree/workflow_input_pipe_names_top_level): also autocorrect legacy input labels in the workflow currently being edited, without changing parent subworkflow interfaces.
- [workflow_input_pipe_names_nested](https://github.com/jmchilton/galaxy/tree/workflow_input_pipe_names_nested): also remap nested interfaces and connections, copying referenced subworkflows rather than modifying originals.

None rewrites `when` expressions or other expression text. The nested version flags expressions for manual review when inputs are renamed.

My recommendation is validation-only first. The nested variant illustrates how much migration machinery remains even after removing expression rewriting. All three pass their focused local tests and lint checks; fork CI for the newly pushed branches still needs to be reviewed.
