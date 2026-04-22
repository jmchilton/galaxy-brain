# Port `fill_static_defaults` to `@galaxy-tool-util/schema`

**Date:** 2026-04-21
**Parent plan:** `VS_CODE_TOOL_SEARCH_LSP_PLAN.md` (Stage 4 calls for `expandToolStateDefaults`; this doc is the ahead-of-time port plan to land it first so Stage 4 shrinks to "wire up + step skeleton").
**Python reference:** `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/parameters/convert.py` — `fill_static_defaults` (324-336), `_fill_defaults` (339-341), `_fill_default_for` (344-415), `_initialize_*_state` (418-445), `_select_which_when` (448-459).
**Worktree:** `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/vs_code_integration`.

## Reuse map (what's already there)

- `packages/schema/src/workflow/walker.ts` — `walkNativeState` walks a parameter tree against a state dict, recurses conditionals (via `selectWhichWhen`), repeats, sections, initializes missing container states as `{}`. Closely mirrors Python's `_fill_defaults`.
- `packages/schema/src/workflow/walk-helpers.ts` — `selectWhichWhen` matches Python's `_select_which_when` (returns `null` on no match vs. Python's raise).
- `packages/schema/src/workflow/state-merge.ts` — `injectConnectionsIntoState` demonstrates the walker+leaf-callback pattern to follow.
- `packages/schema/src/schema/bundle-types.ts` — `ToolParameterModel` discriminated union over all 16 parameter types (data-only interfaces, no methods).
- `packages/schema/test/walker.test.ts` — factory helpers (`textParam`, `intParam`, etc.) reusable for tests.

## Gaps

1. No per-type "emit default" logic — interfaces are data-only. Need a pure discriminated-union switch.
2. No `select.default_value` / `select.default_values` / `drill_down.default_option` / `drill_down.default_options` helpers (Pydantic `@property` in Python).
3. Walker's repeat instance count uses `max(stateArray.length, connectionInstances.length)`. Python's `_initialize_repeat_state` pads to `parameter.min`. Connection-driven padding is the wrong semantics for default expansion.
4. Walker always emits leaf-callback results; leaf must return `SKIP_VALUE` when no default applies to keep the key absent.

## Files touched

- **New** `packages/schema/src/schema/parameter-defaults.ts` (~120 LOC):
  - `NO_DEFAULT` sentinel.
  - `scalarParameterDefault(param) → unknown | NO_DEFAULT` — direct port of scalar branches of `_fill_default_for`.
  - `selectDefaultSingle/Multiple`, `drillDownDefaultSingle/Multiple`, `selectedDrillDownOptions` — helpers mirroring the Python `@property`s.
- **New** `packages/schema/src/workflow/fill-defaults.ts` (~100 LOC):
  - `expandToolStateDefaults(toolInputs: ToolParameterModel[], currentState): Record<string, unknown>`.
  - Delegates to `walkNativeState` with `preserveUnknownKeys: true`; leaf callback calls `scalarParameterDefault` when the value is undefined; handles the one non-idempotent text-null coercion.
- **Edit** `packages/schema/src/workflow/walker.ts` — add `repeatMinPad?: boolean` option (~5 LOC).
- **Edit** `packages/schema/src/index.ts` — export `expandToolStateDefaults`.
- **New** `packages/schema/test/fill-defaults.test.ts` — see test plan below.

## Signature: take `ToolParameterModel[]`, not `ParsedTool`

`ParsedTool.inputs` is `S.Array(S.Unknown)` in `core`. Keeping the schema function typed tightly avoids a cross-package dependency on `core` and matches walker shape. If a `ParsedTool`-level convenience wrapper is needed later, add it in `core`.

## Semantic rules the port must preserve

- Boolean always defaults to `false` even when optional (`convert.py:348`).
- Dynamic-options selects (`options === null`) → skip (runtime-resolved).
- Text non-optional, present `null` → coerced to `""`. The one place a present key is mutated; idempotent because `"" → ""`.
- Data / data_collection (non-optional) / data_column / baseurl / color / directory_uri / group_tag / rules → never filled.
- Data_collection *optional* → `null`.
- Repeat instances padded to `parameter.min`; existing instances are recursed into, not wiped.
- Conditional: select active `when` via user's `test_value` (falls back to `is_default_when`); fill test-param default + active branch defaults into the conditional state dict. Test param default is filled *after* branch selection (`convert.py:390`).
- Section: ensure `{}` exists at `tool_state[name]`, recurse into it.

## Test plan (`packages/schema/test/fill-defaults.test.ts`)

Factory helpers: reuse from `walker.test.ts` (extract to `test/param-factories.ts` if cleaner, else copy).

1. **Scalar defaults emitted when absent.** Cover int, float, hidden, boolean (incl. optional-still-false), text (optional → default_value or null; non-optional no-value → ""), genome_build optional, select single/multiple (selected / none / optional), drill_down single/multiple, dynamic-options select skipped, data absent, data_collection optional null / non-optional absent, baseurl/color/directory_uri/group_tag/rules absent.
2. **Present keys not overwritten.** Core idempotence invariant.
3. **Conditional active branch respected.** `{test_value: "branchA"}` → branch A filled. Empty state with `is_default_when` on branch B → branch B filled + test param default filled.
4. **Repeat in-place expansion.** `[{a:1}, {}]` → both instances filled, `a:1` preserved. `min: 2`, `[]` → two empty filled instances.
5. **Section recursion.** Present section recursed; absent section created as `{}` and filled.
6. **Idempotence.** `expand(t, expand(t, s))` deep-equals `expand(t, s)` for every case above.
7. **Unknown-key preservation.** Bookkeeping keys (e.g. `__current_case__`) survive.
8. **Data inputs never seeded** with `RuntimeValue` or `null` (non-optional).
9. **Text-null coercion.** `{x: null}` non-optional → `{x: ""}`.

Optional cross-check: if Galaxy repo has JSON fixtures for `fill_static_defaults` in `test/unit/tool_util/`, a small replay harness gives high confidence. Not required for first landing.

## Execution order

1. `parameter-defaults.ts` + unit tests for per-type defaults.
2. Walker `repeatMinPad` option + test.
3. `fill-defaults.ts` + full test suite.
4. Export, `make check && make test`, changeset (minor bump on `@galaxy-tool-util/schema`).

## Unresolved questions

- Walker `repeatMinPad` option vs pre-pad state inside `fill-defaults.ts` — leaning walker option (cleaner, additive, real model feature).
- `selectWhichWhen` no-match: Python raises; walker returns `null`. In expand path: throw (Python parity) or stay lenient? Leaning lenient (skip branch) to avoid user-hostile errors on partially-authored tools.
- Expose per-type helpers from `parameter-defaults.ts` publicly or keep internal? Leaning internal first.
- Factory helpers — extract to shared `test/param-factories.ts` or copy?
- Add cross-check harness against Galaxy's Python test fixtures?
