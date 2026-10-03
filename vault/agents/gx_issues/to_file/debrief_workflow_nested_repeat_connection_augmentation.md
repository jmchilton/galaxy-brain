# Debrief: workflow_nested_repeat_connection_augmentation

Source: `workflow_nested_repeat_connection_augmentation.md`, a Codex draft. Its only reproduction was a helper-level call with stand-in objects, at #23877's head b4740908. Proposal: `proposed_workflow_nested_repeat_connection_augmentation.md`.

## Research

Reproduced end to end on `origin/dev` 537915642fa. API tests imported and invoked Format2 workflows built on three scratch tools, one run at a time. Connected inputs were `one` and `two`, with no `state` unless noted.

| Case | Result |
|---|---|
| Nested repeat (`outer_0\|inner_1\|x`) | **Import fails with a 500.** `KeyError: 'inner'` via `recover_state` → `augment_tool_state_for_input_connections`. |
| Repeat under a section (`adv\|outer_0\|x`) | **Silent drop.** The stored step keeps the connections, `tool_state` has `outer: []`, and the job runs `ok` with no inputs. |
| Repeat under the active conditional case | Same silent drop. |
| Outer instance present, inner missing | Same silent drop. The recursion only runs when it creates a new outer instance. |
| Instances spelled out in `state` | **Works**, so a workaround exists. |

- Not tested: native `.ga` import (same code path, not claimed), and repeat `max`/sparse indices (acceptance tests only).
- No duplicate found. #21971 is related but is about validation and round-trips. #23877's docs call this branch "untested" and should say "broken" until it's fixed.

## Rewrite

- The draft became a table of connection pattern vs import vs invocation result, with a Format2 snippet, repro in details, and the code excerpt with its `TODO: untest branch` comment.
- The draft's intended change and acceptance list became the Proposed Approach details.

## Review (one round, subagent)

- Every claim checked out against the logs and code. Nothing egregious. Changes:
  - The cond row does supply `state` (`sel: a`); the table header now says "no `state` unless noted".
  - **Silent drop.** Galaxy already computes the unmatched connection keys and only logs them (`modules.py:3196`). That's now cited, and there's a new "Report leftovers" bullet: show unmatched keys as an upgrade message at import and as an invocation warning.
  - **Reuse.** The proposal now reuses `_populate_state_legacy`'s descent (`tools/parameters/__init__.py`) instead of a bespoke walker. It already creates repeat instances from flat-key prefixes and descends sections and conditional cases. `visit_input_values` can't, because it only visits existing instances.
  - Added an alternative: walk the `tool_util` parameter models (`convert.py`). Rejected for now because `Tool.parameters` can be `None`; it's the eventual home after #21971.
  - Softened making bad keys hard import errors. Stale connections after a tool version change would break existing workflows.

## Open

- Should unmatched or inactive-case connections be a hard failure or a warning? Left open in the issue.
- `_populate_state_legacy` matches repeats with a bare `startswith(f"{key}_{i}")`, so `outer_1` also matches `outer_10`. A shared helper should match `<name>_<i>|`. This is not in the issue; it's an implementation note.
- Recommend filing separately from #21971.
- Scratch worktree `scratchpad/gx_nr`: tools `nr_*.xml`, test `lib/galaxy_test/api/test_repro_nested_repeat.py`, logs `scratchpad/nr_run{1,2}.log`.
