---
name: Connection-Algebra Rebase Plan
description: Plan for rebasing three map_match_logic upstream cleanup commits onto wf_tool_state, which has already moved CollectionTypeDescription to galaxy.tool_util.collections and built the connection validator.
type: project
---

# Connection-Algebra Rebase Plan

## Situation

We're working on TS↔Python connection-validation interop (see `INTEROP_CONNECTION_TESTING_PLAN.md`). The original Python connection validator landed on `wf_tool_state` per `old/CONNECTION_VALIDATION.md`. While building TS interop we noticed three upstream improvements that belong in Galaxy proper, not in the interop branch:

- `39597b3366` Split `can_match_type` into `accepts` (asymmetric) + `compatible` (symmetric)
- `120f527c5a` Unify map-over vocabulary: rename `has_subcollections_of_type` → `can_map_over` (Python), match TS naming
- `0683385f5d` Reframe algebra docstrings in Galaxy-native vocabulary; align `collection_semantics.yml` algebra descriptions

Those three commits were authored on `map_match_logic` (worktree at `/Users/jxc755/projects/worktrees/galaxy/branch/map_match_logic`, branched from `4cafd91e1d` on dev). Their merge base with `wf_tool_state` is `4cafd91e1d`.

The problem: `wf_tool_state` has already done the *extraction* (`00155e913c` → `lib/galaxy/tool_util/collections.py` is now the implementation; `lib/galaxy/model/dataset_collections/type_description.py` is a 32-line shim). All three rebase commits modify the OLD-location `type_description.py`, plus they touch `query.py`, `structure.py`, `matching.py`, `terminals.ts`, `collectionTypeDescription.ts`, `collection_semantics.yml`, and the matching test files. So a naive `git rebase` will produce one large conflict per commit on `type_description.py`, and the rename in commit 2 will silently break `wf_tool_state`-specific code that already calls `has_subcollections_of_type` (`connection_types.py`, `connection_validation.py`).

Working tree on `wf_tool_state` also has uncommitted WIP that anticipates the rename (uses `op: can_map_over` in `connection_semantics.yml` algebra entries, plus the new `connection_type_cases.yml` — WI-4 from the interop plan). Those need a parking decision before rebasing.

## Branches / Worktrees

- **Source**: `/Users/jxc755/projects/worktrees/galaxy/branch/map_match_logic`, branch `map_match_logic`. Three commits to land: `39597b3366`, `120f527c5a`, `0683385f5d` (in that order — they build on each other).
- **Target**: `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state`, branch `wf_tool_state`.
- Common ancestor: `4cafd91e1d` (dev merge from 2026-04-20).

## Predicted Conflicts (per commit)

### Commit 1: `39597b3366` — Split `can_match_type` into `accepts` + `compatible`

Files touched on `map_match_logic`:

| File | Conflict? | Resolution |
|---|---|---|
| `lib/galaxy/model/dataset_collections/type_description.py` | **YES (relocation)** | Apply the diff to `lib/galaxy/tool_util/collections.py` instead. Leave the shim file alone — it subclasses the base, so new methods come along for free. No re-export edits needed. |
| `lib/galaxy/model/dataset_collections/matching.py` | Maybe clean | Renames `can_match_type` callers to `compatible`. Check for unrelated changes on `wf_tool_state`. |
| `lib/galaxy/model/dataset_collections/query.py` | Maybe clean | Same — rename callers. |
| `lib/galaxy/model/dataset_collections/structure.py` | Maybe clean | Same — rename callers in `Tree.compatible_shape`. |
| `lib/galaxy/tools/execute.py` | Likely clean | One-call rename. |
| `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts` | Likely clean | New methods + rename. |
| `client/src/components/Workflow/Editor/modules/collectionTypeDescription.test.ts` | New file, clean | |
| `client/src/components/Workflow/Editor/modules/terminals.ts` | Likely clean | Caller rename. |
| `client/src/components/Workflow/Editor/modules/terminals.test.ts` | Likely clean | |
| `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` | **CHECK** — see "WIP collision" below | The commit adds an algebra section (~92 lines). The wf_tool_state working tree adds `algebra:` keys to many examples. Cherry-pick first if WIP is parked; merge by hand if not. |
| `test/unit/data/dataset_collections/test_matching.py` | Likely clean | |
| `test/unit/data/dataset_collections/test_structure.py` | Likely clean | |
| `test/unit/data/dataset_collections/test_type_descriptions.py` | Likely clean | Tests the renamed methods on the shim — the shim re-exports the base class, so tests still hit the real implementation in `tool_util/collections.py`. |

**Ripple effect on wf_tool_state code (no conflict, but will break at runtime/tests):**
- `lib/galaxy/tool_util/workflow_state/connection_types.py` calls `variant.can_match_type(output)` and `output.can_match_type(...)` in several places (lines 86, 91 etc.). After this commit, those need to become `accepts` calls (or `compatible`, depending on whether the call site is asymmetric/sibling-matching). Re-read `connection_types.py` against the new asymmetry rules — pick `accepts` for edge-validation usage.

### Commit 2: `120f527c5a` — Rename `has_subcollections_of_type` → `can_map_over`; drop `is_subcollection_of_type`

| File | Conflict? | Resolution |
|---|---|---|
| `lib/galaxy/model/dataset_collections/type_description.py` | **YES (relocation)** | Apply rename to `lib/galaxy/tool_util/collections.py`. |
| `lib/galaxy/model/dataset_collections/query.py` | Likely overlaps with commit 1 changes | Check — rename + inline `is_subcollection_of_type`. |
| `lib/galaxy/model/dataset_collections/structure.py` | Likely overlaps with commit 1 | |
| `client/src/components/Workflow/Editor/modules/terminals.ts` | Maybe clean | |
| `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` | **CHECK** — WIP collision | |
| `test/unit/data/dataset_collections/test_type_descriptions.py` | Renames | |

**Ripple on wf_tool_state code:**
- `lib/galaxy/tool_util/workflow_state/connection_types.py`: lines 7, 91, 111, 145 reference `has_subcollections_of_type`. Rename to `can_map_over`. Module-level function `can_map_over(output, input_type)` already exists — that's fine, name collision only if you call as method.
- `lib/galaxy/tool_util/workflow_state/connection_validation.py`: line 271 (`source_type.has_subcollections_of_type(inner_list)`). Rename.
- Drop any `is_subcollection_of_type` calls from `wf_tool_state` files (none expected — grep before commit).

### Commit 3: `0683385f5d` — Reframe algebra docstrings

| File | Conflict? | Resolution |
|---|---|---|
| `lib/galaxy/model/dataset_collections/type_description.py` | **YES (relocation)** | Port docstring rewrites to `lib/galaxy/tool_util/collections.py`. |
| `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` | **CHECK** — WIP collision (45 lines changed) | This is the biggest semantics.yml change of the three. |
| `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts` | Maybe clean | Docstring/comment changes. |
| `client/src/components/Workflow/Editor/modules/terminals.ts` | Maybe clean | |

## WIP Collision: `collection_semantics.yml`

Working tree on `wf_tool_state` adds `algebra:` blocks to ~12 examples, e.g.:

```yaml
algebra:
  - {op: can_map_over, output: paired, input: NULL}
  - {op: effective_map_over, output: paired, input: NULL}
```

The WIP already uses `op: can_map_over` — the post-rename name from commit 2. So the WIP was authored *anticipating* the rebase. It's compatible with commits 2 and 3 in spirit but will textually conflict with commit 3's algebra-section additions. Park (stash or commit) before starting; replay on top after the three commits land.

## Sanity-Check List (post-rebase)

Run from the wf_tool_state worktree, with `.venv` sourced.

- [ ] `git status` — only WIP files are dirty; no leftover conflict markers (`grep -rn '<<<<<<< HEAD' lib/ test/` returns nothing).
- [ ] `grep -rn 'has_subcollections_of_type\|is_subcollection_of_type' lib/ test/` — empty (or only in commit messages / comments). The renames are total.
- [ ] `grep -rn 'can_match_type' lib/ test/` — every remaining caller is intentional (the base method may still exist as a deprecated alias; if it doesn't, every call site must use `accepts` or `compatible`).
- [ ] `grep -n 'accepts\|compatible\|can_map_over' lib/galaxy/tool_util/workflow_state/connection_types.py lib/galaxy/tool_util/workflow_state/connection_validation.py` — call sites read sensibly: edge validation uses `accepts`, sibling-matching uses `compatible`, map-over inference uses `can_map_over`.
- [ ] `lib/galaxy/model/dataset_collections/type_description.py` is still the 32-line shim re-exporting from `tool_util/collections`. No method bodies leaked back in.
- [ ] `python -c "from galaxy.tool_util.collections import CollectionTypeDescription; CollectionTypeDescription"` — imports cleanly.
- [ ] `python -c "from galaxy.tool_util.workflow_state.connection_types import can_match, can_map_over, effective_map_over"` — imports cleanly.
- [ ] `pytest test/unit/data/dataset_collections/test_type_descriptions.py test/unit/data/dataset_collections/test_matching.py test/unit/data/dataset_collections/test_structure.py -q` — green (these were updated in commits 1 & 2 to use the new names).
- [ ] `pytest test/unit/tool_util/workflow_state/test_connection_types.py test/unit/tool_util/workflow_state/test_connection_graph.py test/unit/tool_util/workflow_state/test_connection_validation.py test/unit/tool_util/workflow_state/test_connection_workflows.py -q` — green. These exist on `wf_tool_state` only and exercise the ripple-effect rename targets.
- [ ] `pytest test/unit/data/dataset_collections/ -q` — full subdirectory still green.
- [ ] `git log --oneline dev..HEAD | head -5` — top three commits are the rebased originals (new SHAs, original commit messages preserved).
- [ ] WIP `op:` strings in `collection_semantics.yml` reference only operations that exist post-rebase (`accepts`, `compatible`, `can_map_over`, `effective_map_over`, `can_match` if defined). No dangling `has_subcollections_of_type`/`can_match_type` references.
- [ ] `connection_type_cases.yml` (untracked WIP) ops match.
- [ ] If `lib/galaxy/tool_util/workflow_state/connection_types.py` exposes module-level functions named `can_match` / `can_map_over` / `effective_map_over`, they delegate to the base methods with their new names — and the call-site shim (sentinel handling) still does the right thing.
- [ ] TS: `client/.../terminals.ts` and `collectionTypeDescription.ts` compile (`yarn type-check` from `client/`). The TS-side renames came in via the rebase; nothing on `wf_tool_state` should fight them, but worth confirming.

## Open Design Questions (discuss before rebasing)

- **`can_match` (module function) vs `accepts` / `compatible` (methods).** `connection_types.py` exposes `can_match(output, input_type)` as a public free function. After commit 1, the underlying base method `can_match_type` is split. Should the free function:
  - (a) become `accepts(input_type, output)` with the asymmetric semantics — reads naturally for edge validation;
  - (b) keep the `can_match` name for backward-compat but internally call `accepts`;
  - (c) be split into `accepts` + `compatible` mirroring the base?
  Affects WI-4 truth-table ops and TS interop naming.
- **Module-name collision: `can_map_over`.** `connection_types.py` has both a free function `can_map_over(output, input_type)` and (after commit 2) a method `output.can_map_over(input_type)`. Clear in context but worth a once-over to ensure the free function isn't a redundant alias of the method now that names match.
- **Where do the ripple edits land — squashed into the rebased commits, or as a separate follow-on?** Squashing keeps each rebased commit self-contained (the original message stays accurate: "rename in Python and TS"). A separate commit makes it explicit that wf_tool_state-specific call sites moved too. Mild preference for squash given the commit messages already imply totality.
- **Should the bug-fix commit `738ed8cd08` (compound `:paired_or_unpaired` in `tool_util/collections.py`) get back-folded into the extraction commit `00155e913c`?** Out of scope for this rebase, but worth noting — both branches already have the fix at their merge-base so it doesn't affect the rebase mechanics.
- **WI-4 (`connection_type_cases.yml`) ordering.** The truth-table is WIP and currently lives in the working tree. Should it be a committed precursor to the rebase (so its `can_map_over` ops survive cleanly), or a follow-on after? Recommend committing as a precursor — it's cohesive and the WIP collision becomes a real merge instead of a stash dance.

## Follow-on Refactor (post-rebase, separate commit)

Commit 1 (`39597b3366`) doesn't just rename — it introduces `compatible` specifically to fix order-dependent sibling map-over matching. The TS side gets the fix in the same commit (`mappingConstraints` in `terminals.ts` switches from `.canMatch()` to `.compatible()`). The Python validator has the equivalent site, and after the rebase it should mirror.

**Site**: `_resolve_step_map_over` in `lib/galaxy/tool_util/workflow_state/connection_validation.py:299-318`.

```python
best = non_none[0]
for ctd in non_none[1:]:
    if ctd.collection_type != best.collection_type:
        step_result.errors.append(f"Incompatible map-over types: ...")
        return best
return best
```

Raw string equality. Stricter than even the pre-rebase `can_match_type` — rejects sibling map-overs that should compose, e.g. one input contributing `list:paired` and another contributing `list:paired_or_unpaired`. TS post-rebase accepts that pair via `compatible`; Python emits a spurious error.

**Refactor**:
1. Add a sentinel-aware free function `compatible(a, b)` to `connection_types.py`, alongside the existing `can_match` / `can_map_over` / `effective_map_over` wrappers.
2. Rewrite `_resolve_step_map_over` to use `compatible()` for the pairwise check, and pick the higher-rank type as the resolved map-over (matches TS "most specific compatible" choice — see `INTEROP_CONNECTION_TESTING_PLAN.md`).
3. Add a sibling-mismatch fixture under `connection_workflows/` that today fails spuriously and will pass post-refactor (red-to-green).
4. Add `op: compatible` cases to `connection_type_cases.yml` so the TS truth-table gets coverage for free.

**Out of scope for the refactor (leave alone):**
- Line 278 `can_match(source_type, target_type)` is a real edge check — asymmetric, correct, stays.
- The `is_list_like` / multi-data branch at line 271 mirrors a TS asymmetry that may be expressible in `accepts` terms post-rebase, but the current shape works. Low priority; revisit only if it becomes a porting friction with TS.

## Reference

- Original interop plan: `INTEROP_CONNECTION_TESTING_PLAN.md` (this directory).
- Original validator design: `old/CONNECTION_VALIDATION.md`.
- Source worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/map_match_logic`.
- Target worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state`.
