# Debrief: type_source nested inputs and digit names

Source: `type_source_nested_inputs_and_digit_names.md`. Proposal: `proposed_type_source_nested_inputs_and_digit_names.md`.

## Research

- The source draft's evidence was a helper call with stand-ins. I replaced it with real framework tool runs on `dev` @ `4f78c5014e8`, in a scratch worktree (`scratchpad/gx_dev`) with three added test tools:
  - `cond|input_collect` gives `'Conditional' object has no attribute 'inputs'`.
  - The bare alias `input_collect` (inside the conditional) gives `'NoneType' object has no attribute '_history_query'`.
  - A top-level `reads_1` gives the same `NoneType` error.
- No tool in tools-iuc, bgruening/galaxytools or tools-devteam uses `type_source`, so nothing published is broken today.
- No duplicate issue exists.

## Review corrections

- **I was wrong that mapped runs avoid the crash.** The reviewer ran a mapped-over workflow test (`scratchpad/wf_mapped.log`). `sliced_input_collection_structure` builds the outer structure, then every job still calls `create_collection` and crashes. The invocation fails. The opener and the code walk were rewritten.
- **The Proposed Approach now reuses an existing abstraction.** `collect_input_dataset_collections` already walks the active tree with `tool.visit_inputs` and builds the `input_collections` keys. The fix records the parameter there, in a parallel `LegacyUnprefixedDict`, and drops the string walk. My grouping-aware walk became the alternative, because it would be a third copy of the tree walk.
- The repeat and section claims were dropped as untested.

## Follow-ups

- #23877's draft docs say conditionals work for `type_source` "mapped only". That's wrong. Fix it on the `tool_parameter_references` branch.
- The scratch worktree `scratchpad/gx_dev` is a registered git worktree of `~/projects/repositories/galaxy`. Run `git worktree remove --force` on it once the repro tools aren't needed, or copy them into a fix branch as red tests.
