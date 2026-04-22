# Taxonomy of Extra Keys in Workflow tool_state

Galaxy workflow `.ga` files contain `tool_state` per step — a JSON-encoded dict of parameter values. In a clean workflow, every key in `tool_state` should be either a declared tool input or a recognized bookkeeping key. In practice, several categories of extra keys appear.

## Category 1: Bookkeeping Keys

**Keys:** `__current_case__`, `__page__`, `__rerun_remap_job_id__`, `chromInfo`, `__input_ext`, `__job_resource`, `__index__`

**What they are:** Framework-managed values that Galaxy uses internally. `__current_case__` tracks which conditional branch is active. `__page__` and `__rerun_remap_job_id__` are wizard/rerun metadata. `chromInfo` and `__input_ext` are runtime injection artifacts.

**How they get there:** Galaxy's `DefaultToolState.encode()` adds `__page__` and `__rerun_remap_job_id__` after `params_to_strings()`. `chromInfo` and `__input_ext` are injected at job execution time (`tools/actions/__init__.py`). `__current_case__` is written by `Conditional.value_to_basic()`.

**Are they harmful?** No. Galaxy handles them correctly at runtime. `__current_case__` is recomputed from the test parameter value by `params_from_strings()` on every load. The others are either popped before deserialization or injected fresh at runtime.

**Can they be stripped?** Yes. All are redundant or re-injected. Stripping `__current_case__` has been empirically validated across the full IWC corpus and all 24 framework workflow tests (Phase 5.0 and 5.1 in NEXT_STEPS_PLAN.md).

**Detection:** Key name is in the known bookkeeping set.

---

## Category 2: Stale Root Keys (Conditional Leakage)

**Example:** A tool has `filter (conditional, test_param=filter_type, cases: gaussian→size, ...)`. The persisted `tool_state` contains both `filter: {filter_type: "gaussian", size: "3.0"}` AND `filter_type: "gaussian"` at root level — a duplicate of the conditional's test param.

**What they are:** Conditional test parameters and/or branch parameters that are duplicated or leaked to the parent (usually root) level of `tool_state`.

**How they get there:** Galaxy's `params_to_strings()` and `params_from_strings()` pass through ALL keys, including those not declared in the tool's inputs. When the workflow editor submits flattened form data, the root-level copies persist through serialization cycles. See EXTRA_ROOT_KEYS_ISSUE.md for full root cause analysis.

**Are they harmful?** Usually not at runtime — Galaxy ignores undeclared root keys. But they can have **diverged values** (root copy says `"5"`, nested copy says `"0"`) which creates debugging confusion. They also cause validation failures and prevent clean format2 conversion.

**Can they be stripped?** Yes. They're duplicates of or orphans from the conditional structure. Stripping them has no effect on execution since Galaxy reads from the nested conditional path.

**Detection:** Key exists at a given level but is not a declared input at that level, AND the key name matches a parameter inside a conditional that exists at that level in the current tool definition. If the conditional has since been removed by a tool upgrade, the key falls into Category 4 (upgrade residue) instead — Category 2 only applies when the conditional still exists.

**Value divergence:** When a stale root key is detected, comparison against the nested copy is informative. If the values match, it's a harmless duplicate. If they diverge, the root copy is stale and potentially misleading — this should be flagged in reporting detail.

**IWC prevalence:** 5 of 17 validation failures in the IWC corpus. Examples: `ip_filter_standard` (segmentation-and-counting.ga), `ivar_trim` (pe-artic-variation.ga), `snpeff_sars_cov_2` (pe-artic-variation.ga — 10 extra root keys).

---

## Category 3: Stale Branch Data (Inactive Conditional State)

**Example:** InterProScan tool has `licensed: {use: "false", __current_case__: 1, applications_licensed: ["Phobius", ...]}`. The test value says `"false"` (disabled branch) but `applications_licensed` belongs to the `"true"` branch.

**What they are:** Parameter values from a conditional branch that is NOT currently selected (the test parameter value doesn't match the branch these keys belong to).

**How they get there:** Two paths:
1. **Hand-editing:** Someone edits the `.ga` JSON directly, changing the test param value without removing data from the old branch (the interproscan case).
2. **Galaxy UI:** User toggles a conditional in the workflow editor. The old branch's data may persist in the state dict if the editor doesn't fully clean up on branch switch.

**Are they harmful?** No — Galaxy selects the correct branch based on the test parameter value and ignores keys from inactive branches. But they're misleading (the state appears to configure something it doesn't) and block clean validation/conversion.

**Can they be stripped?** Yes. Given the tool definition, we can determine which branch is active from the test parameter value and remove keys belonging to other branches. `galaxy-workflow-clean-stale-state` already does this.

**Detection:** Walk the conditional structure, determine active branch from test param value, check for keys that belong to inactive branches.

**IWC prevalence:** 1 confirmed case (interproscan). Prevalence in broader IWC corpus needs further investigation — many workflows have multiple validation failure categories that may mask this one.

---

## Category 4: Unknown / Undeclared Keys

**Example:** A tool carries `"saveLog": "false"` in its `tool_state`, but the current tool definition has no `saveLog` parameter.

**What they are:** The catch-all category — any undeclared key that doesn't match categories 1, 2, 3, or 5. In practice, the most common cause is **tool upgrade residue** (a parameter existed in a previous tool version and was removed or renamed), but without access to historical tool definitions this can't be systematically verified. Other causes include typos in hand-edited workflows or keys from completely unrelated sources.

**How they get there (common case):** Galaxy's auto-upgrade mechanism (`planemo autoupdate`, workflow "Upgrade" button) updates the tool version but only migrates parameters that still exist by the same name in the same location. Removed or renamed parameters become orphans.

**Are they harmful?** No — Galaxy ignores undeclared parameters at runtime. But they bloat the state, cause validation failures, and can confuse users inspecting the workflow.

**Can they be stripped?** Yes, given the current tool definition. Any key not in the tool's declared inputs (at the appropriate nesting level) is safe to remove. `galaxy-workflow-clean-stale-state` handles this.

**Detection:** Undeclared key at any nesting level that doesn't match categories 1, 2, 3, or 5. This is the catch-all — if a key isn't bookkeeping, isn't a runtime leak pattern, isn't a root-level conditional duplicate, and isn't in an inactive branch, it lands here.

**IWC prevalence:** Dominant category. Of 124 stale keys across 25 IWC workflows, the majority are unknown/undeclared (e.g., `saveLog`, `trim_front2`, `trim_tail2`, `images` — likely tool upgrade residue).

---

## Category 5: Runtime Value Leakage

**Keys:** `__workflow_invocation_uuid__`, `{input_name}|__identifier__`

**What they are:** Values injected at workflow execution time that should never be persisted in step definitions.

**How they get there:**
- `__workflow_invocation_uuid__`: Injected into the params dict at `tools/execute.py:223`. Leaks when `DefaultToolState.encode()` fails and the fallback in `modules.py:374` returns raw `self.state.inputs` unfiltered.
- `__identifier__`: Injected at `tools/actions/__init__.py:501` for collection element inputs. Leaks via workflow extraction from history — `__cleanup_param_values()` in `extract.py` doesn't handle pipe-delimited keys.

See STALE_STATE_BOOKKEEPING.md for full analysis.

**Are they harmful?** No runtime impact — Galaxy ignores them. But they're noise in the workflow file and indicate the workflow was extracted from a history run or exported via a buggy fallback path.

**Can they be stripped?** Yes. They're identifiable by their key patterns (`__workflow_invocation_uuid__` exact match, `|__identifier__` suffix).

**Detection:** Key name matches known runtime injection patterns.

**IWC prevalence:** 20+ steps in `clinicalmp-verification.ga` carry `__workflow_invocation_uuid__`. Several collection-heavy workflows carry `__identifier__` keys.

---

## Summary Table

| Category | Example Keys | Source | Harmful? | Strippable? | Detection Method |
|----------|-------------|--------|----------|-------------|-----------------|
| Bookkeeping | `__current_case__`, `__page__`, `chromInfo` | Galaxy framework | No | Yes | Known key set |
| Stale root keys | `filter_type` at root (duplicate of `filter.filter_type`) | `params_to_strings` bug | Rarely (value divergence) | Yes | Undeclared key matching a conditional param at same level |
| Stale branch data | `applications_licensed` in inactive branch | Hand-edit or UI | No | Yes | Walk conditional, check active branch |
| Unknown | `saveLog` (not in current tool def) | Tool upgrade, hand-edit, other | No | Yes | Catch-all: undeclared key not matching other categories |
| Runtime leakage | `__workflow_invocation_uuid__`, `*\|__identifier__` | Execution/extraction bugs | No | Yes | Known runtime key patterns |

## Relationship Between Categories

Categories 2, 3, and 4 are all "undeclared keys" — keys not in the tool's current input definition at the appropriate nesting level. The distinction is *where* the key sits and *why* it's there:

- **Category 2** (stale root): key is at the wrong nesting level (root instead of inside conditional) — only classifiable when the conditional still exists in the current tool definition
- **Category 3** (stale branch): key is at the right nesting level but in the wrong conditional branch
- **Category 4** (unknown): catch-all for undeclared keys that don't match the structural patterns of categories 2 or 3

The classification waterfall is: runtime leak (pattern match) → bookkeeping (known set) → stale root (undeclared + matches conditional param) → stale branch (inside conditional, wrong branch) → unknown (everything else). The most common cause of unknown keys is tool upgrade residue, but without historical tool definitions this can't be verified programmatically — so we call them "unknown" rather than making assumptions.

Category 1 (bookkeeping) is orthogonal — these are expected framework keys, not tool parameters. Category 5 (runtime leakage) is identifiable by key name pattern before even looking at the tool definition.
