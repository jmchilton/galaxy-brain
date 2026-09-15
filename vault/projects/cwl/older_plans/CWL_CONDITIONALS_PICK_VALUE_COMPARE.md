# pickValue Implementation: Approach Comparison

## Executive Summaries

**Approach A — Synthetic Tool Steps:** During CWL import, inject Galaxy's bundled `pick_value` expression tool as a synthetic workflow step for each workflow output that uses `pickValue`. The tool already handles `first_non_null` (via `first_or_error`) and `the_only_non_null` (via `only`). Parser-only change — no model migrations, no runtime changes. Does NOT cover `all_non_null` (tool can't return arrays/collections). Estimated 1-2 files touched in `parser.py`.

**Approach B — Native Framework Support:** Add a `pick_value` column to the `WorkflowOutput` model, create duplicate-label `WorkflowOutput` objects across source steps, then post-process pickValue semantics in `run.py` after all steps complete. Covers all three modes including `all_non_null`. Requires DB migration, model changes, parser changes, import changes, runtime changes, and export changes. Estimated 5-7 files touched.

## Pros/Cons

### Approach A: Synthetic Tool Steps

| Pros | Cons |
|------|------|
| Parser-only change, no model/runtime/migration | `all_non_null` not supported (tool returns scalar) |
| Reuses battle-tested `pick_value` tool | Synthetic steps visible in workflow editor |
| `should_fail` tests handled by tool's error modes | No round-trip CWL re-export fidelity |
| Low risk — no changes to execution engine | `File[]` output via `all_non_null` impossible |
| Small diff, fast to implement | Scatter+conditional pattern not addressed |
| Tool already tested in Galaxy workflow suite | `cond-with-defaults` (linkMerge+pickValue) unclear |

### Approach B: Native Framework Support

| Pros | Cons |
|------|------|
| All 3 pickValue modes supported | DB migration required |
| Clean semantic model — pickValue is first-class | Null detection (skipped vs empty) is hard |
| Benefits Galaxy-native workflows long-term | Duplicate-label WorkflowOutputs may confuse editor |
| Scatter+conditional pattern addressable | 5-7 files, medium-large change |
| Correct CWL export round-trip possible | `all_non_null` returning list vs HDCA is unresolved |
| No synthetic steps polluting workflow graph | Higher regression risk across workflow subsystem |

## Coverage Analysis (29 RED Tests)

### By pickValue mode

| Mode                                                       | Tests | Pattern                    | Tool (A) | Framework (B) |
| ---------------------------------------------------------- | ----- | -------------------------- | -------- | ------------- |
| **first_non_null**                                         | 8     | multi-source               | YES      | YES           |
| `pass_through_required_{false,true}_when` x2 (+nojs)       |       | multi-source               | YES      | YES           |
| `first_non_null_{first,second}_non_null` x2 (+nojs)        |       | multi-source               | YES      | YES           |
| **the_only_non_null**                                      | 4     | multi-source               | YES      | YES           |
| `pass_through_required_the_only_non_null` (+nojs)          |       | multi-source               | YES      | YES           |
| `the_only_non_null_single_true` (+nojs)                    |       | multi-source               | YES      | YES           |
| **all_non_null**                                           | 6     | multi-source               | NO       | YES           |
| `all_non_null_{all_null,one,multi}_non_null` x3 (+nojs)    |       | multi-source               | NO       | YES           |
| **scatter+conditional**                                    | 7     | scatter                    | NO       | PARTIAL       |
| `condifional_scatter_on_nonscattered_{false,true_nojs}` x3 |       | scatter+pickValue          | NO       | YES (Phase 6) |
| `scatter_on_scattered_conditional` (+nojs)                 |       | scatter+pickValue          | NO       | YES (Phase 6) |
| `conditionals_nested_cross_scatter` (+nojs)                |       | nested scatter             | NO       | MAYBE         |
| `conditionals_multi_scatter` (+nojs)                       |       | hybrid multi+scatter       | NO       | MAYBE         |
| **Complex**                                                | 2     | multi+linkMerge            | NO       | PARTIAL       |
| `cond-with-defaults-{1,2}`                                 |       | linkMerge+pickValue+File[] | NO       | PARTIAL       |

### Summary

| | Tool (A) | Framework (B) |
|---|----------|----------------|
| **Covered** | 12/29 (41%) | 18-24/29 (62-83%) |
| **first_non_null + the_only_non_null** | 12/12 | 12/12 |
| **all_non_null (multi-source)** | 0/6 | 6/6 |
| **scatter+conditional** | 0/9 | 4-9/9 (phases) |
| **cond-with-defaults** | 0/2 | 0-2/2 (depends on linkMerge) |

## Implementation Effort

| Dimension | Tool (A) | Framework (B) |
|-----------|----------|----------------|
| **Files touched** | 1 (`parser.py`) | 5-7 (model, migration, parser, import, run, export) |
| **Lines of code** | ~100-150 | ~300-500 |
| **DB migration** | No | Yes |
| **Runtime changes** | No | Yes (run.py post-processing) |
| **Regression risk** | Low (parser only) | Medium-High (execution path) |
| **Time estimate** | 1-2 days | 5-8 days |
| **Reviewability** | Easy — self-contained | Harder — cross-cutting |
| **Hardest sub-problem** | Type mapping CWL->param_type | Null detection (skipped vs empty) |

## Recommendation

**Pursue hybrid: Tool (A) first, Framework (B) later.**

Rationale:
1. **Goal is CWL conformance, not Galaxy UX.** Synthetic tool steps are invisible to CWL users — they never see the Galaxy workflow graph. 12 tests going green immediately is significant.
2. **Tool approach is low-risk and fast.** Parser-only change, no migration, testable in 1-2 days.
3. **Framework approach has unsolved hard problems.** Null detection, duplicate-label editor behavior, and `all_non_null` return type are each individually tricky. Stacking them makes the PR risky.
4. **The 12 easiest tests are the same 12 for both approaches.** No wasted work — the parser's `get_outputs_for_label()` skip logic for pickValue outputs (needed by A) is compatible with later adding framework support (B) for the remaining tests.
5. **`all_non_null` and scatter patterns can wait.** They're harder regardless of approach and may need the pick_value tool extended anyway (for expression/scalar types).

**Phase 1 (this PR):** Implement Approach A for `first_non_null` + `the_only_non_null`. Target: 12 tests RED->GREEN.

**Phase 2 (future PR):** Either extend pick_value tool with `all_non_null` mode (for `string[]` types) OR implement Framework support. Decision deferred until Phase 1 ships and scatter+conditional patterns are better understood.

## Unresolved Questions

- Is pick_value tool always available during CWL workflow import, or can it be missing from tool panel?
- Does workflow import API accept `tool_id: "pick_value"` for synthetic steps, or must we use `tool_uuid`?
- For `should_fail` tests currently GREEN because import crashes: after fixing import, will the pick_value tool's runtime error correctly satisfy `should_fail`?
- For `all_non_null` returning `string[]`: can expression tools produce JSON arrays in `expression.json`, or is a collection required?
- `cond-with-defaults.cwl` uses `linkMerge: merge_flattened` + `pickValue: all_non_null` + `File[]` output. This may be unreachable for both approaches without collection-producing expression tools.
- `cond-wf-009` pattern (single outputSource + scatter + `pickValue: all_non_null`) is a collection-filter, not a multi-source merge. Neither approach naturally handles this — it needs its own solution.
- Should synthetic step labels use `__cwl_pick_value_` prefix to hide from editor, and does Galaxy handle this convention?
