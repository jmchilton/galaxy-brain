# Batched dataset-access helpers are unused duplicates with dead debug blocks

- Area: lib/galaxy/model/security.py (GalaxyRBACAgent)
- Found while: [[Component - Dataset and Collection Access Checks]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

- `dataset_access_mapping` (`lib/galaxy/model/security.py:455-468`) and `dataset_permission_map_for_access` (`:470-493`) have the same body: `datasets_are_public` OR `allow_action_on_libitems(..., DATASET_ACCESS, ...)`.
  - Neither has a caller in `lib/`, `test/` or templates at this SHA.
  - The first carries `# DELETEME: SM: DO NOT TOUCH! This actually works.`
- `item_permission_map_for_modify`, `item_permission_map_for_manage` and `item_permission_map_for_add` (`:495-502`) also have no callers.
- `get_actions_for_items` (`:368-396`) and `allow_action_on_libitems` (`:442-452`) each contain a `test_code = False` debug block that can never run. The one in `get_actions_for_items` would also index `ret_permissions[item.library_dataset_id]` for `Dataset` items.
- Meanwhile hot paths do per-item `can_access_dataset` loops instead of a batch, e.g. `HistoryManager` sharing at `lib/galaxy/managers/histories.py:495-499`, flagged `TODO: Handle this is a more performant way`. No unit test covers `dataset_access_mapping`, `can_access_datasets` or `can_access_collection` directly.

## Evidence / repro

`grep -rn "dataset_access_mapping\|dataset_permission_map_for_access\|item_permission_map_for_" --include=*.py --include=*.mako .` matches only the definitions.

## Suggested fix

- Keep one batched helper, preferably id-based like the proposed `accessible_dataset_ids` on the `compare_runs` branch, with parity tests against `can_access_dataset`.
- Delete the duplicate and the dead `test_code` blocks.
- Use the batch helper in the sharing loop.

## Related

- `vault/repositories/galaxy/branches/active/compare_runs/subagents/phase_2_review_fixes.md` (parity test across these helpers)
