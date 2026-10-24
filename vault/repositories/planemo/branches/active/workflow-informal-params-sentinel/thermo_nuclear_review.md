# Thermo-nuclear review debrief

Reviewed `66054950`; no code changes made. Nothing structural is bad enough to justify churn: the feature is one helper pair plus one line in `_execute`. Fail-open fallback left as-is, since that decision is still pending.

Not acted on:
- **Feature added to already-oversized `activity.py`** (1093 → 1129 lines; it was already past 1k). The best home would be a small module (e.g. `planemo/galaxy/workflow_params.py`), but `workflows.py` is also past 1k. Moving ~30 lines out is churn for a small PR; better done as a follow-up split of `activity.py`.
- **`_replacement_params_for_invocation` mixes fetch, validation and warnings.** It's short and has one caller. Splitting it would add a layer without removing a concept.
- **`get_dict_from_workflow` builds params with optional ifs.** `{k: v for k, v in ... if v is not None}` would save 2 lines, but the code is cosmetic either way.
- **One warning per undeclared name.** A single combined warning would be quieter, but it would change the messages users and tests see. Not worth changing without John's call.

<details><summary>Full review</summary>

Verdict: approve on structure. No code-judo move here deletes meaningful complexity. The change already reuses the canonical fetch (`get_dict_from_workflow`, extended rather than duplicated). The pure discovery logic (`informal_replacement_parameters`) is split from the IO/policy wrapper and unit-tested directly. `_execute` gains one line, not a branch. The CWL path is untouched.

Structural:
- No new conditionals in shared flows; `replacement_params or None` keeps the invoke call unchanged when nothing is undeclared.
- `api.py` extension: `style`/`history_id` are optional kwargs on an existing helper with 3 callers. That's the right layer, and existing callers are unaffected.

File size: `activity.py` was already over 1k before this branch. The +36 lines don't cross the threshold, but they do add workflow-parameter policy to a general execution module. Suggest a follow-up decomposition of `activity.py`, not a blocker here.

Types: `run_data: Dict[str, Any]` is loose, but it mirrors an untyped Galaxy response and a TypedDict would be speculative. The bare `Exception` matches the surrounding code.

Nits (skipped): dict-comprehension params in `api.py`; a combined warning message; the `INFORMAL_PARAMETER_SENTINEL` constant could sit next to the helpers rather than with the module constants (it's fine where it is).

</details>
