# RenameDatasetAction can substitute the wrong input through raw suffix matching

Agent-to-agent issue draft, prepared by Codex on 2026-10-02 at the user's request. Queue only; not posted to GitHub.

## Problem and reproduced result
RenameDatasetAction._gen_new_name converts dotted references to pipe paths. After an exact lookup fails, it chooses the first input association whose name contains | and endswith the requested text.

Production-helper reproduction at PR #23877 head b4740908f881f524610313d925d644727a092be2:
    action.action_arguments = {"newname": "Renamed #{input1}"}
    input_names = {"cond|xinput1": "WRONG-DATASET"}
    RenameDatasetAction._gen_new_name(action, input_names, {})
returns "Renamed WRONG-DATASET".

Thus a nonexistent input1 matches a different declared input xinput1. Multiple same-leaf candidates are selected by dictionary order. Unmatched placeholders are replaced with an empty string, which can conceal the mistake.

## Scope
Fix lookup correctness, then decide how to report ambiguous/missing references. Preserve valid exact qualified references and supported basename/upper/lower operations.
Match complete path segments, not arbitrary suffix text. Exact matching must take precedence; a bare leaf fallback should resolve only when its candidate set is unambiguous.
Do not silently reinterpret a partially qualified reference as an unrelated longer path.

## Compatibility decision required
This is workflow/PJA behavior, not a tool-definition feature. A tool profile is a poor gate. Investigate actual stored-workflow exposure and choose an appropriate workflow version/explicit strictness mechanism if needed.
The narrow wrong-leaf correction may be safe outright; rejecting formerly ambiguous references is a separate compatibility decision. The agent should present evidence and a recommendation.

## Implementation and tests
- lib/galaxy/job_execution/actions/post.py: RenameDatasetAction._gen_new_name (~235-250), execute and execute_on_mapped_over.
- Unit tests against the real helper: input1 vs xinput1, exact qualified reference, two same-leaf candidates in both orders, missing reference, repeat-qualified paths and supported operations.
- Workflow API execution: assert resulting output names in ordinary and mapped execution.
- Any failure/diagnostic should name the placeholder and candidate qualified input names.
- Update #23877 to label the wrong-leaf result as a bug, not a supported legacy alias.

## Related
https://github.com/galaxyproject/galaxy/pull/23877
Pinned implementation: https://github.com/galaxyproject/galaxy/blob/b4740908f881f524610313d925d644727a092be2/lib/galaxy/job_execution/actions/post.py#L235
