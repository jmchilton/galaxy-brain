# Plan: Drop disconnected-optional `RuntimeValue` during native→format2 conversion (Python + TS)

Status: Phase 0 DONE; Phase 1 (Python) DONE + COMMITTED incl. roundtrip; Phase 2 (TS) not started — motivation revised after PR #114 (see below)

## Progress log (2026-06-06)

- **Phase 0 DONE** — committed `5cbd1f3c5d`. Reshaped from a procedural API test to
  declarative framework-workflow tests: `disconnected_optional_runtime_value` +
  `disconnected_optional_omitted` control (4 files in `lib/galaxy_test/workflow/`). Both
  green. `data_optional` output encodes the realized value, so the procedural `job_details`
  step was dropped as redundant.
- **Phase 1.1 + 1.3 DONE** — committed `a51f975d11`. `convert_leaf` rewritten
  connection-first with optionality-gated RuntimeValue handling (data + scalar branches);
  `is_connected_value`/`is_runtime_value` split predicates added; dead double-stamp `elif`
  removed. 5 decision-table unit tests in
  `test/unit/tool_util/workflow_state/test_convert_runtime_value.py` (rows 1 & 5 were
  red→green; rows 2/3/4 guard). **Zero regressions** (baseline-confirmed).
- **Phase 1.2 DONE + COMMITTED** (`d0d8a265a8`) — the roundtrip suite was *pre-existing red*
  on this branch for reasons unrelated to 1.1. Triaged + fixed:
  - `test_roundtrip.py` referenced a **removed** `extract_toolshed_tools` (gone in
    migration `43128e21a9`) → fixed `_iwc_cache_populated` to use
    `ensure_native(wf).unique_tools` (filtered to toolshed via `parse_toolshed_tool_id`).
  - **Swapped legacy fixtures for modern ones** (per user direction): removed 12 legacy
    `.ga` from `NATIVE_WORKFLOWS` (double-encoded values + `${...}` replacement params —
    both deliberately out of scope per `afab4c2af5`) and their per-workflow tests; kept the
    clean-encoded natives; added **asserting** roundtrip tests for the real-world IWC
    workflows `average-bigwig-between-replicates` + `RepeatMasking-Workflow` (both
    `ok, diffs:0`, skip-if-no-cache).
- **`__FILTER_FROM_FILE__` bug FIXED** (`112f663808`), not skipped. `empty_collection_sort`:
  post-conversion validation used `result.inputs` (connection bookkeeping rebuilt by walking
  tool_state), which drops connections targeting a leaf under a conditional whose
  discriminator is absent from state — the required leaf then reads as missing
  (`how.__absent__.filter_source`) and conversion declined. Fix recovers dropped connections
  from native `input_connections`, restricted to keys resolving to a tool parameter (so
  step-level inputs stay excluded). Strict per-step sweep now green. (Filed note:
  `PARAMETER_REQUIRED_WHEN_SHOULDNT_BY_MAYBE.md`.)

### Resolved decision
The known-gap-skip vs. fix choice was settled by **fixing** the `__FILTER_FROM_FILE__`
converter bug (`112f663808`) rather than wiring a `KNOWN_CONVERSION_GAPS` skip. Roundtrip
fixture swap committed (`d0d8a265a8`). All Phase 1 work committed; unit (5) + roundtrip (16)
green.
Branches: Galaxy `wf_tool_state`; galaxy-tool-util-ts `parsed_tool_fixes` (PR #114 merged)
Owner: jmchilton

## Status update (post PR #114 / gxformat2 #222)

The **validate symptom that motivated this plan is already fixed**, by a path this plan
did not consider. galaxy-tool-util-ts PR #114 (`fix(schema,cli): validate format2
tool_state via native path`) made `gxwf validate` pick the validator by **state shape,
not workflow format**: a verbatim native `tool_state` block now validates against the
**native `workflow_step_native`** model, which already admits inline
`ConnectedValue`/`RuntimeValue`. So the false-positive `fail` on `{__class__: RuntimeValue}`
is gone *without* any converter change. #114 also (a) routes successful stateful conversion
to the format2 **`state`** field (raw `tool_state` only on fallback) and (b) enforces
`state`-xor-`tool_state` mutual exclusion (gxformat2 #222 is the upstream mirror of just
this rule).

**What this plan still fixes** lives on the *schema-aware conversion* path, which #114 left
untouched (`convertStateToFormat2`/`leafCallback` unchanged):
1. **Phantom `in:` connection.** A disconnected-optional `RuntimeValue` still becomes
   `in: {id: path, source: "runtime_value"}` — a format2 connection claiming a source named
   `"runtime_value"`. It happens to pass validate (#114 masks it), but it is semantically
   false on import/round-trip. (291 IWC sites.)
2. **Legacy double-stamp.** A *connected* param carrying a `RuntimeValue` marker still gets
   a phantom runtime placeholder instead of being treated as a pure connection — the
   connection-first early-return is still unimplemented. (79 IWC sites.)

So the plan stays, but its **driver is conversion fidelity, not "make validate pass."**
Phase 0 (behavior-preservation) still gates the *lossy* drop; the rest is unchanged.

## Problem

Stateful native→format2 conversion emits semantically-false `tool_state` shapes for IWC
corpus content — notably a phantom `in:` connection (`source: "runtime_value"`) for
`{__class__: RuntimeValue}` on optional `gx_data` params, plus a double-stamp on legacy
connected params carrying a `RuntimeValue` marker. Originally framed (issues #111/#112) via
the *validate* symptom and "widen the `workflow_step` schemas to admit these shapes." Both
framings are wrong: schema-widening was rejected on parity grounds, and the validate symptom
itself is now fixed by PR #114's native-path routing (see Status update). The remaining,
real defect is in the converter.

### Investigation findings (why we are NOT widening schemas)

- `RuntimeValue` on an optional disconnected param is **native, authored content**, not a
  conversion artifact and not a missed connection. Verified against authoritative IWC
  source (`~/projects/repositories/iwc`, native `.ga`):
  `deeptools_bigwig_average` step in `average-bigwig-between-replicates` has, in the SAME
  step, `binSize`/`bigwigs` = `ConnectedValue` (each with a matching `input_connections`
  entry) and `blackListFileName` = `RuntimeValue` with **no** `input_connections` entry.
- `blackListFileName` is a real tool input: `gx_data`, `optional=True`, inside the `yes`
  branch of the `advancedOpt` conditional (confirmed via cached ParsedTool
  `~/.galaxy/tool_info_cache/30f895227d…json`).
- The marker type is NOT authoritative — the **connection graph** is. A param with a
  connection must become `ConnectedValue` even if the source says `RuntimeValue`
  (legacy workflows do this). Only a *disconnected* leaf is a true runtime/omit candidate.
- Python's `workflow_step` (format2) pydantic models are **equally strict** as the TS port:
  `DataParameterModel` → `type(None)` (rejects `RuntimeValue`, regardless of optional);
  `FloatParameterModel`/`IntegerParameterModel` → `StrictFloat`/`StrictInt`. `RuntimeValue`
  + native numerics are admitted ONLY on `workflow_step_native`. So widening TS would make
  it *more lenient than Python* — inventing a contract Python has not committed to.
- Python only "passes" IWC today because `validate_format2_state` guards `if state:` and
  conversion produces clean state — not because it admits these shapes.
- Optionality does NOT gate `RuntimeValue` admission in Python: `workflow_step_native` data
  is `ConnectedValue | RuntimeValue` unconditionally; `optional` only adds `None` and flips
  `requires_value`. (So "allow only on optional" is a NEW policy, applied at the
  **conversion** layer, not the schema layer.)

### Decision

Fix the **converter**, not the schema. During native→format2 conversion, walk the
parameter tree and **omit** `RuntimeValue` markers on **optional, disconnected** leaf
params. Keep the strict `workflow_step` schema (honest parity with Python). Do it in
**both** ports so they mirror each other byte-for-byte.

## Leaf decision table (both ports)

Evaluate per leaf, **connection first** (early return):

| condition | action |
|---|---|
| `state_path ∈ connected` OR value is `ConnectedValue` | **connection** → record in `in:` block (placeholder), `SKIP`. Covers legacy `RuntimeValue`-on-connected — connection wins regardless of marker. |
| value is `RuntimeValue` AND `optional` | **disconnected optional runtime** → `SKIP`, emit nothing (no state key, no `in:` entry). ← the change |
| value is `RuntimeValue` AND NOT `optional` | **required disconnected runtime** → keep current behavior: record placeholder in `in:`. |
| literal | coerce scalar (unchanged) |

The connection branch MUST `return` before the runtime branch — that single restructure
fixes the existing legacy-clobber bug (today both ports also stamp a runtime placeholder
on connected paths because the predicate conflates connected+runtime).

Rule applies uniformly across `gx_data`/`gx_data_collection`, scalars, (and `gx_rules` is
unaffected — only literal-bearing leaves).

---

## Phase 0 — framework-workflow behavior-preservation test (DONE; the keystone)

Prove in real Galaxy execution that removing `RuntimeValue` from an optional input is
inert. Until this is green, the **lossy conversion** (dropping the marker) is not justified.
(Note post-#114: this no longer gates *validate* — native-path routing already accepts the
marker. It gates the converter's right to drop it.)

**Shape: declarative framework-workflow tests, NOT a procedural `test_workflows.py` test.**
Per `Component - Workflow Testing` (and `lib/galaxy_test/workflow/__init__.py`), framework
workflow tests are the documented home for "normal operation where semantics can be verified
with simple inputs and outputs"; the procedural API file is for "exceptional conditions,
errors". This is the former. Framework tests run real Galaxy execution AND get rerun
verification for free (`GALAXY_TEST_WORKFLOW_AFTER_RERUN=1`).

**Tool:** `data_optional` (`test/functional/tools/data_optional.xml`, already in
`sample_tool_conf.xml:52` → available under `framework_tool_and_types`). Single optional
`names` data param; when empty, emits deterministic output:
```
INPUT None
INPUT ext data
ISOFTYPE mothur.names False
ISOFTYPE mothur.count_table False
```
This output **encodes the realized optional value** — so asserting output content IS the
realized-tool_state proof. No `job_details`/`params` introspection needed (the original
procedural step #4 was redundant given this tool; dropped — resolves open Q1).

**Files (4), in `lib/galaxy_test/workflow/`:**
- `disconnected_optional_runtime_value.gxwf.yml` — `data_optional` step with
  `tool_state: {names: {__class__: RuntimeValue}}`, no `in:`; output exposed as `out`.
- `disconnected_optional_runtime_value.gxwf-tests.yml` — `job: {}`, asserts the four
  canonical lines via `has_line`.
- `disconnected_optional_omitted.gxwf.yml` — **control**: identical step, marker omitted.
- `disconnected_optional_omitted.gxwf-tests.yml` — same four `has_line` asserts.

Equivalence is established by transitivity: both workflows assert the same fixed output ⇒
marker-present == marker-absent ⇒ dropping the marker is behavior-preserving.

**Acceptance:** both green. ✅ `2 passed` (33.7s) — `disconnected_optional_runtime_value_0`,
`disconnected_optional_omitted_0`.

---

## Phase 1 — Python converter + round-trip (mirror behavior, Galaxy branch)

### 1.1 Converter — `lib/galaxy/tool_util/workflow_state/convert.py` — DONE (`a51f975d11`)

`_convert_valid_state_to_format2` → `convert_leaf` (currently ~line 130-165). Today:
- data: `if state_path in connected or is_connected_or_runtime(value): in[path]=placeholder`
  then dead `elif RuntimeValue: in[path]=placeholder` → **any** runtime → placeholder.
- scalar: `if is_connected_or_runtime(value): in[path]=placeholder` → same.

`is_connected_or_runtime` (`_util.py:150`) is the only predicate and conflates the two.

**Change:**
1. Add split predicates to `lib/galaxy/tool_util/workflow_state/_util.py` (next to
   `is_connected_or_runtime`): `is_connected_value(value)` and `is_runtime_value(value)`
   (check `__class__ == "ConnectedValue"` / `"RuntimeValue"`).
2. Rewrite `convert_leaf` per the decision table, connection-first early return:
   ```python
   # data params
   if state_path in connected or is_connected_value(value):
       format2_in[state_path] = "placeholder"
       return SKIP_VALUE
   if is_runtime_value(value):
       if not tool_input.optional:
           format2_in[state_path] = "placeholder"   # required disconnected → keep
       return SKIP_VALUE                              # optional disconnected → omit
   return SKIP_VALUE
   ```
   Mirror the same connection-first / optional-gated structure in the scalar branch
   (before the `_convert_scalar_value` literal path). Remove the dead `elif`.
3. `tool_input.optional` is available on `ToolParameterT`.

### 1.2 Round-trip — `lib/galaxy/tool_util/workflow_state/roundtrip.py` — DONE + COMMITTED (`d0d8a265a8`)

**Outcome:** the no-op-classifier prediction held for the RuntimeValue drop, but the
roundtrip *test suite* was pre-existing red (removed `extract_toolshed_tools`, legacy
fixtures). Fixed the import, swapped 12 legacy `.ga` fixtures for clean + real-world IWC
workflows, added asserting IWC roundtrip tests. The one unrelated converter bug
(`__FILTER_FROM_FILE__`) was subsequently fixed in `112f663808`. See Progress log above.
Original analysis:

**Research result (was open Q4): the disconnected-optional case is ALREADY classified
benign — no new classifier needed.**
- `compare_tool_state` (`roundtrip.py` ~317): the `elif key not in after:` branch opens with
  `if orig_val in (None, "null", []) or _is_connection_marker(orig_val): continue`.
  `_is_connection_marker` (line 432) returns True for `{__class__: ConnectedValue|RuntimeValue}`.
  So a **leaf** `RuntimeValue` present in original native but dropped in round-tripped native
  is silently `continue`d — already a non-diff.
- `_is_connection_only_dict` (line 237) + `CONNECTION_ONLY_SECTION_OMITTED` already covers a
  whole **section** of only markers being dropped.
- Net-new classification code: **none**. Action is to **verify** existing round-trip tests
  stay green after 1.1 (the converter now emits *nothing* for optional disconnected runtime
  instead of an `in:` placeholder; round-trip compares `tool_state`, where the original
  marker → missing → benign `continue`). Add/confirm a round-trip case exercising an optional
  disconnected `RuntimeValue` so the benign path is asserted, not just incidentally hit.

### 1.3 Python unit tests for the converter — DONE (`a51f975d11`)

Implemented in `test/unit/tool_util/workflow_state/test_convert_runtime_value.py` against
`_convert_valid_state_to_format2` directly (isolates the leaf decision table). Self-contained
fixtures — `connection_test_fixtures.py` has a pre-existing broken import
(`ToolOutputCollectionStructure` from the wrong module) that also breaks
`test_connection_graph`/`_validation` collection; flagged, not fixed here. Rows covered:
- optional disconnected `gx_data` RuntimeValue → absent from `state` AND `in`
- required disconnected `gx_data` RuntimeValue → `in[path]=="placeholder"`
- connected `gx_data` ConnectedValue → `in` placeholder (structural), not in `state`
- legacy: connected path carrying `RuntimeValue` marker → treated as connection (placeholder),
  NOT runtime-omitted, NOT double-stamped
- optional disconnected scalar RuntimeValue → omitted

---

## Phase 2 — TS converter + round-trip goldens (mirror Phase 1)

### 2.1 Converter — `packages/schema/src/workflow/stateful-convert.ts`

`convertStateToFormat2` → `leafCallback` (currently writes `inBlock[statePath]="runtime_value"`
for any RuntimeValue; data branch has the same empty-`if` legacy bug). Helpers exist:
`isConnectedValue`/`isRuntimeValue` (`runtime-markers.ts`), `connectedPaths`
(`NormalizedNativeStep.connected_paths = new Set(Object.keys(inputConnections))`).

Rewrite per the decision table — compute `const connected = connectedPaths.has(statePath) ||
isConnectedValue(value)` once, branch connection-first with early return; gate RuntimeValue
omission on `toolInput.optional`. Keep `"runtime_value"` placeholder only for required
disconnected.

Post-#114 invariants to respect here:
- The override path already routes `override.state` → format2 `state` and `override.in` →
  `in:` (via `_mergeInOverrides`, `toFormat2.ts`). Conversion sets `state` *xor* `tool_state`;
  the new `validateStep` rule rejects a step with both, so never populate both.
- The phantom-`in:` removal is the point: a dropped optional-disconnected `RuntimeValue` must
  leave **no** `in:` entry (today's `{id: path, source: "runtime_value"}` is the regression to
  delete). Add an explicit test asserting the flagship fixture produces no `in:` entry whose
  `source === "runtime_value"`.
- Reuse the existing empty-state helpers rather than re-rolling: `isEmptyState`
  (`cli/validate-workflow.ts`), `_stateIsSpecified` (`schema/semantic-validators.ts`),
  gxformat2 `_state_is_specified`.

### 2.2 Round-trip — `packages/schema/src/workflow/roundtrip.ts`

Mirror Python `roundtrip.py` classification: a dropped leaf-level optional `RuntimeValue` is a
benign / non-diff. Verify TS has the equivalent of the `_is_connection_marker(orig_val)`
`continue` and the `_is_connection_only_dict` section case; align severity/artifact naming
with Python (`CONNECTION_ONLY_SECTION_OMITTED` etc.). Add net-new only if TS lacks the
leaf-level skip.

### 2.3 TS tests

- Unit `packages/schema/test/stateful-convert.test.ts`: the five decision-table rows.
- Round-trip `packages/schema/test/roundtrip.test.ts`: dropped optional `RuntimeValue`
  classified benign; re-derived native semantically valid (`validateNativeStepState` passes —
  optional param absent is valid `workflow_step_native`).
- Integration: convert the real `~/projects/repositories/iwc/.../average-bigwig-between-replicates.ga`
  via `toFormat2Stateful`; assert no `advancedOpt|blackListFileName` in `state` or `in`, and
  both `validateFormat2StepState` (workflow_step) and an injected-connection
  `workflow_step_linked` validation pass (mirror Python `validate_format2_state`).
- Regenerate goldens (`make sync`); diff must be ONLY `RuntimeValue` removals. Changeset for
  `schema` + `cli`.

---

## Pre-work sweep — DONE (IWC @ deafc4876, 120 workflows, 394 RuntimeValue markers)

Script: `/tmp/iwc_runtime_sweep.py` (stdlib; walks each `.ga` tool_state, classifies each
RuntimeValue by connection status and ParsedTool optionality from `~/.galaxy/tool_info_cache`).

Results:
| class | count | meaning |
|---|---|---|
| disconnected **optional** | **291** | the main case — omit. Pervasive. |
| **connected** (legacy RuntimeValue-on-connection) | **79** | connection-first branch is LOAD-BEARING |
| disconnected **required** | **0** | "required → keep placeholder" branch is NOT load-bearing in IWC |
| unresolved optionality | 24 | all benign (below) |

The 24 unresolved, investigated:
- **23 are `__APPLY_RULES__` → `rules|…|collapsible_value`** — RuntimeValue *inside the
  rule-builder JSON payload* of a `gx_rules` param, NOT parameter leaves. The real converter
  walks the param tree and treats `rules` as one opaque `gx_rules` leaf (passes its JSON
  through), so it never touches these. **Confirms the tree-scoping caveat is load-bearing** —
  a blind dict scrub would corrupt these.
- **1 is `quast` `in|inputs`** (Genome-assembly-with-Flye step 2): a **stale key**. tool_state
  has `in|inputs` but `input_connections` is `mode|in|inputs` (tool restructured to nest `in`
  under a `mode` conditional). The param IS connected at the new path; the stale `in|inputs`
  RuntimeValue is removed by stale-key stripping before conversion. Not a disconnected-required
  case.

### Conclusions baked into the plan
1. **Connection-first early return is essential** (79 real legacy sites across many IWC
   workflows: VGP, bacterial_genomics sections/repeats, epigenetics, microbiome, etc.). The
   current empty-`if` double-stamp bug actively mis-converts these today.
2. **Required-disconnected branch is defensive only** (0 IWC sites). Keep it (cheap, correct
   for `workflow_step_linked`) but it won't trigger on the corpus → see open Q2.
3. **gx_rules payloads must stay intact** — tree-walk handles this; do not pattern-match markers
   in raw dicts.
4. **Stale-key stripping must run before the marker logic** (quast case) — it already does in
   `convert.py` (`strip_stale_keys` before `_convert_valid_state_to_format2`); ensure TS parity.

Fixtures for tests, drawn from real corpus:
- disconnected optional: `epigenetics/average-bigwig-between-replicates` `advancedOpt|blackListFileName`
- legacy connected (repeat): `microbiome/metagenomic-raw-reads-amr-analysis` step 14 `queries_0|input2`
- legacy connected (section/repeat/conditional): `VGP-assembly-v2/Assembly-Hifi-HiC-phasing-VGP4`
  step 60 `mode|assembly_options|assembly_01`
- gx_rules payload (must preserve): `data-fetching/parallel-accession-download` `__APPLY_RULES__`

---

## Compatibility proof (already established)

Omitting an optional disconnected `RuntimeValue` makes the param indistinguishable from an
optional data input the author never touched:
- `workflow_step`: `DataParameterModel` → `type(None)`, `requires_value=False` (hardcoded for
  all data params) → absent passes.
- `workflow_step_linked`: → `ConnectedValue`, `requires_value = not optional`; for optional,
  field default `None`, the attached `not_null` validator only fires on *provided* values
  (pydantic doesn't validate defaults) → absent passes.
- Required disconnected omitted would (correctly) fail `workflow_step_linked` as a genuinely
  missing required input — hence we keep the placeholder for required.

---

## Key files

Galaxy (`wf_tool_state`):
- `lib/galaxy/tool_util/workflow_state/convert.py` (`_convert_valid_state_to_format2`, ~130-165)
- `lib/galaxy/tool_util/workflow_state/_util.py:150` (`is_connected_or_runtime`; add split predicates)
- `lib/galaxy/tool_util/workflow_state/roundtrip.py` (verify: `compare_tool_state` ~317,
  `_is_connection_marker` 432, `_is_connection_only_dict` 237)
- `lib/galaxy/tool_util/workflow_state/export_format2.py` (calls converter; no change expected)
- `lib/galaxy_test/api/test_workflows.py` (Phase 0 test)
- `test/functional/tools/data_optional.xml` (test tool)
- `lib/galaxy/tool_util_models/parameters.py` (reference: `DataParameterModel` 1179-1310 etc.)

TS (galaxy-tool-util-ts):
- `packages/schema/src/workflow/stateful-convert.ts` (`convertStateToFormat2`)
- `packages/schema/src/workflow/runtime-markers.ts` (`isConnectedValue`/`isRuntimeValue`)
- `packages/schema/src/workflow/normalized/native.ts:134` (`connected_paths`)
- `packages/schema/src/workflow/roundtrip.ts`
- `packages/schema/test/{stateful-convert,roundtrip}.test.ts`

## Test commands

- Galaxy framework-workflows (Phase 0):
  `pytest lib/galaxy_test/workflow/test_framework_workflows.py -k "disconnected_optional" -m workflow -v`
  (with the three beta env vars). NOTE: `run_tests.sh framework-workflows` does NOT accept
  repeated `-id` flags — they fall through to pytest as unknown args (and `tee` masks the
  nonzero exit). Use the direct-pytest `-k` form, or a single `-id` per run.
- Galaxy unit (Phase 1.3): the convert unit test module via pytest.
- TS (Phase 2): `make test` (or scoped vitest); `make check`; `make sync` then verify golden diff.

## Open questions

1. RESOLVED: Phase 0 reshaped to declarative framework-workflow tests (DONE, green). The
   `data_optional` output encodes the realized value, so `job_details`-field recovery is moot
   — the procedural introspection step was dropped as redundant.
2. RESOLVED by sweep: 0 required-disconnected `RuntimeValue` in IWC. Recommend KEEP the
   "required → placeholder" branch defensively (it's the correct `workflow_step_linked`
   behavior and ~2 lines), but it's untested by the corpus — add a synthetic unit fixture
   rather than an IWC one. Confirm: keep vs drop?
3. Scope: apply omission to all leaf types (assumed) or data params only?
4. Does TS `roundtrip.ts` already have the leaf-level marker skip + section classifier, or is
   2.2 net-new there (it is a no-op in Python)? (#114 did NOT touch `roundtrip.ts`, so this is
   unaffected by the merge.)
5. RESOLVED for TS by #114: `override.state` → format2 `state`, `override.in` → `in:` via
   `_mergeInOverrides` (`toFormat2.ts:232/422`). Still confirm Python `export_format2.py`
   parity under gxformat2's converter routing.
6. RESOLVED: Phase 0 kept as the blocking gate (justifies the lossy drop with execution
   proof), now framework-test-shaped and green. Validate passing via native routing is
   independent.
7. Open (Q3 follow-on): Phase 0 covers `gx_data` only. If the converter change applies to
   scalar leaves, add a scalar optional-RuntimeValue framework case for symmetry.
