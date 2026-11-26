Run via Claude Opus 5.5 subagent.

# Test challenges debrief (revision: collection_fix)

This run only covers the `collection_fix` tests from `e0a94aa8566` and `f531c63edc2`. The earlier tests were challenged in `earlier_drafts/2/test_challenges_debrief.md` and were not redone here.

## Changes (committed as `8bb1573a319`, `test/unit/tool_util/test_tool_patches.py` only)

- **Removed the `if match is None` branch from `test_collection_fix_rules`.**
  - The three accept cases now sit in the existing `test_valid_patch_files_load` table as `collection_fix_without_upstream`, `collection_fix_stacked_on_upstream` and `collection_fix_mixed_without_upstream`.
  - The reject cases became `test_invalid_collection_fix_files_are_rejected`, a table with `match` that never branches.
  - I dropped the `.collection_fix is True` assert. Any doc that passes `Literal[True]` with `extra="forbid"` can only hold `True`, so the assert checked nothing.
- **Extracted `MIXED_COLLECTION_FIX`.** The mixed doc was built twice; the mixed accept case and the mixed advisory reject case now share it.
- The test count is unchanged: 191 passed.

## Kept

- **Reject table with `match`.** Each `match` string ties a case to its own rule. Without them, `advisory_only` or `compat_ops_only` could pass by failing a different rule.
- **`stacked_on_upstream`.** No mutation kills it. It is the positive control showing the base doc used by the reject cases is valid, and it pins the checker's rule that the flag doesn't forbid an upstream.
- **`test_collection_fix_without_upstream_applies`.** It covers the collection loader and the engine with an empty security upstream, which no model-only case reaches.
  - It keeps `"collection_fix" not in state.model_dump()`. That pins the commit's "not reported on patch state" decision. `PatchState` never had the field, so this line is not red evidence.
- **No downstream test for a mismatch or demotion with an empty upstream.** I checked: the only consumer of `upstream` outside the model is `_unit_fields`, which filters by kind. `_generated`, `_demotion` and `_file_advisory` never read it.
- **No integration or E2E test.** This is a file-model rule plus the unit-level apply path, which is the right layer.

## Red checks

**Head swap to `1e92a257548` `model.py`.** All 14 cases fail:
- Accept cases fail with `extra="forbid"`.
- Reject cases fail at `match`.
- The apply test fails at its command assertion, because the file is skipped.

The accept failures come close to "the field doesn't exist yet", so the mutations below are the real evidence.

**Mutations** (each applied to `model.py` alone, then restored):

| Mutation | Fails |
| --- | --- |
| field validator body removed | all five `flag_*` cases |
| `authoring: hand` check removed | `not_hand_authored` |
| security-ops check removed | `compat_ops_only`, `advisory_only` |
| exemption widened to cover security advisories | `security_advisory_without_upstream`, `mixed_security_advisory_without_upstream` |
| exemption removed | `collection_fix_without_upstream`, `collection_fix_mixed_without_upstream`, `test_collection_fix_without_upstream_applies` |

## Results

- `test_tool_patches.py`: 191 passed.
- black, isort and ruff are clean.
- `git diff --stat` shows only the test file.

STATUS: READY.
