# Workflow input connections fail to create nested repeat instances

Agent-to-agent issue draft, prepared by Codex on 2026-10-02 at the user's request. Queue only; not posted to GitHub.

## Problem and evidence
ToolModule.augment_tool_state_for_input_connections populates repeat instances needed by input_connections, but its recursion always looks up repeats in self.tool.inputs. It does not carry the current parameter subtree. The traversal also stops when a leading segment is a section or conditional rather than an indexed repeat.

At PR #23877 head b4740908f881f524610313d925d644727a092be2, direct calls to this production method with minimal parameter/state stand-ins showed:
- outer_0|inner_1|x, with inner declared inside outer: KeyError: 'inner'.
- adv|outer_0|x, with outer beneath a section: returned without creating any repeat instances.
This is a helper-level reproduction, not a full imported-workflow execution.

## Why it matters
Runtime replacement visits existing repeat instances. A connection whose instance was never created cannot reach the intended tool input. Imported workflows should not require authors to redundantly supply matching state instances for valid connections.

The documentation currently describes the nested-repeat branch as untested; source and helper checks establish a concrete defect worth an explicit bug label.

## Implementation pointers
- lib/galaxy/workflow/modules.py: ToolModule.augment_tool_state_for_input_connections (~2941), recovery and runtime replacement.
- test_inputs_to_steps in lib/galaxy_test/api/test_workflows_from_yaml.py covers a top-level repeat.
- test_nested_key_to_path checks path conversion only; it does not prove augmentation or connection execution.

## Intended change
Walk the declared parameter tree and current state together. Carry the current subtree into repeat instances, descend sections and active conditional cases, and create/default missing instances before runtime replacement.
Account for existing outer instances with missing inner instances: current recursion is also conditional on creating a new parent instance.
Respect repeat bounds and give useful errors for invalid connections; avoid inventing inactive conditional branches.

No new profile is needed for correctly connecting previously broken valid paths.

## Acceptance
Import and invoke native/Format2 workflows starting without the required state instances:
- nested repeat with a nonzero inner index;
- repeat beneath a section;
- repeat beneath the active conditional case;
- existing outer repeat instance with absent inner instances;
- sparse connection indices, valid repeat defaults/bounds.
Assert both actual command/output content and that the expected dataset association was consumed. Include a round-trip check if import/export changes.

## Related
https://github.com/galaxyproject/galaxy/pull/23877
https://github.com/galaxyproject/galaxy/issues/21971 (larger workflow state effort; this is a focused runtime repair)
Pinned helper: https://github.com/galaxyproject/galaxy/blob/b4740908f881f524610313d925d644727a092be2/lib/galaxy/workflow/modules.py#L2941
