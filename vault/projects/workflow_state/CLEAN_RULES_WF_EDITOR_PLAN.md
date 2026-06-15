# Plan: Stop the workflow editor leaking UI metadata into Apply Rules `tool_state`

Status: draft / not started
Repo: `galaxyproject/galaxy` (work in checkout `~/projects/worktrees/galaxy/branch/wf_tool_state`
or a fresh branch off `dev`)
Audience: Galaxy client (Vue/TypeScript) agent. Self-contained — no external context needed.
Sibling: `SYNC_CONVERT_DISCONNECTED_OPTIONAL_PLAN.md` (the tool_util conversion work that
surfaced this; that plan does NOT depend on this one).

## Problem

Native `.ga` workflows produced by the Galaxy workflow editor contain Apply Rules
(`__APPLY_RULES__`) steps whose `rules` parameter payload is polluted with **client-side form
metadata** that was never meant to be persisted. Each rule/mapping entry carries:

```json
{"collapsible_value": {"__class__": "RuntimeValue"}, "connectable": true,
 "is_workflow": false, "editing": false, "error": null, "warn": null, "type": "...", ...}
```

Only the DSL keys (`type`, `value`, `columns`, `expression`, `target_column`, …) are real.
`collapsible_value`, `connectable`, `is_workflow`, `editing`, `error`, `warn` are UI-only and
are **never read by the server** at rule validation or execution
(`lib/galaxy/util/rules_dsl.py`, `lib/galaxy/util/rules_dsl_spec.yml` read DSL keys only via
`_ensure_rule_contains_keys` / direct access; the UI keys do not appear anywhere in `lib/` or
`tools/`).

Observed in ~23 sites across 6 IWC workflows (e.g.
`epigenetics/average-bigwig-between-replicates`, `epigenetics/atacseq`, `amplicon/dada2_paired`,
`data-fetching/parallel-accession-download`, `virology/pox-virus-amplicon`). They are inert at
runtime but bloat tool_state and confuse anything that introspects workflow state.

This is a **bug / serialization leak**, not a feature. There is no PR that intentionally added
runtime/connectable values inside the rule payload.

### There are TWO independent leak paths (corpus-verified)

An audit of all 13 `__APPLY_RULES__` steps (8 workflows) shows the leaked keys split into two
groups with **different counts**, proving two separate mechanisms:

| key | count | source |
|---|---|---|
| `collapsible_value`, `connectable`, `is_workflow` | 23 each | **Path A** — `FormTool.vue` `deepEach` stamping |
| `error`, `warn` | 33 each | **Path B** — `RuleBuilder/rule-definitions.js` validation mutation |
| `editing` | 13 | **Path B** — transient edit-state on rule/mapping entries |

A fix that only addresses Path A (the FormTool `deepEach`) would leave `error`/`warn`/`editing`
leaking — and those are the *most* prevalent. **This plan must close both paths**, or it repeats
the partial-fix pattern of #18741.

Audit also confirmed (reassuring): every leaked `error`/`warn` is `null` and every `editing` is
`false` across the corpus — no workflow was saved mid-edit or with a live rule error. The keys
`group_count` and `numeric` that appear in payloads are **legitimate DSL** (`add_column_regex`
multi-group / `sort`), not leaks.

## Root cause — Path A (verified)

`client/src/components/Workflow/Editor/Forms/FormTool.vue`, the `inputs()` computed
(currently ~lines 142-176):

```js
inputs() {
    const inputs = this.configForm.inputs;
    Utils.deepEach(inputs, (input) => {
        if (input.type) {
            if (["data", "data_collection"].indexOf(input.type) != -1) {
                ...
                input.value = { __class__: "RuntimeValue" };
            } else {
                const isRules = input.type === "rules";
                input.connectable = !isRules;
                input.collapsible_value = isRules ? undefined : { __class__: "RuntimeValue" };
                input.is_workflow = (input.options && input.options.length === 0)
                                    || ["integer", "float"].indexOf(input.type) != -1;
            }
        }
    });
    Utils.deepEach(inputs, (input) => {
        if (input.type === "conditional") {
            input.connectable = false;
            input.test_param.collapsible_value = undefined;
        }
    });
    return inputs;
}
```

`Utils.deepEach` (`client/src/utils/utils.ts:24-34`) recurses into **every** nested object:

```ts
export function deepEach(object, callback) {
    Object.values(object).forEach((value) => {
        if (Boolean(value) && typeof value === "object") {
            callback(value);
            deepEach(value, callback);   // descends into EVERYTHING, incl. input .value payloads
        }
    });
}
```

So `deepEach` descends into the `rules` input's **value** (the rule-builder definition). Each
nested `mapping[]` / `rules[]` entry has a `.type` field (`list_identifiers`,
`add_column_metadata`, `add_column_regex`, …), so the `if (input.type)` callback fires on those
entries and stamps them with `connectable`, `collapsible_value: {__class__: RuntimeValue}`,
`is_workflow`. The stamped objects are the same objects later serialized into `tool_state`, so
the metadata leaks into the saved workflow.

### History
- **Origin:** PR #286 (commit `da63f0bef9`, 2015) — added the unconditional
  `collapsible_value = {__class__:"RuntimeValue"}` stamping for the new workflow editor form.
  Predates the `rules` param; leak began once rules were buildable in the editor.
- **Vue port:** PR #11898 carried the logic into `FormTool.vue`.
- **Partial fix:** PR #18741 (commit `66efcb08c7`, 2024, "fix rules runtime editable") set the
  **top-level** `rules` input to `collapsible_value = undefined` / `connectable = false`, but
  did NOT stop `deepEach` from descending into the rule payload, so nested entries still leak.
  **This plan completes #18741.**

## Root cause — Path B (verified)

`error`/`warn`/`editing` do NOT come from FormTool. They are transient validation/edit state the
rule builder writes directly onto the rule objects, which then persist when the rules value is
emitted into `tool_state`.

`client/src/components/RuleBuilder/rule-definitions.js`, `applyRules` (~line 858) runs on every
validation/preview pass and mutates each rule **in place**:

```js
const applyRules = function (data, sources, columns, rules, ...) {
    for (var ruleIndex in rules) {
        const rule = rules[ruleIndex];
        rule.error = null;      // <- written onto the shared rule object
        rule.warn = null;
        ...
        if (res.error) { rule.error = res.error; } else if (res.warn) { rule.warn = res.warn; }
    }
};
```

These rule objects are the same ones bound to the builder's model, so `error`/`warn` (and the
`editing` flag set elsewhere in the builder UI) ride along when the value is saved.

**Canonical serialization boundary** — `client/src/components/RuleCollectionBuilder.vue`,
`asJson` (~line 1382):

```js
const asJson = {
    rules: this.rules,       // live model arrays — entries carry error/warn/editing (+collapsible_value in editor)
    mapping: this.mapping,
};
...
this.ruleSourceJson = asJson;                       // -> saveRulesFn(...) -> tool_state (workflow)
this.ruleSource = JSON.stringify(asJson, replacer); // -> view-source string + localStorage saved sessions
```

`asJson` is the single canonical serialization of the rule model. Everything that persists the
rules definition flows from it:
- `ruleSourceJson` → `saveRulesFn(this.ruleSourceJson)` (line 1539) → `FormRulesEdit.onSaveRules`
  → `emit("input", …)` → **workflow `tool_state`** (the IWC leak).
- `ruleSource` → the editable "view source" panel and **`localStorage` saved rule sessions**
  (`SaveRules.vue:43 localStorage.setItem(key, rule)`) — a second, minor persisted surface.

Scrubbing at `asJson` (building it from stripped copies, leaving the live `this.rules`/
`this.mapping` intact so the UI still shows validation state) closes Path B for **both** surfaces
in one place — strictly better than scrubbing only in `FormRulesEdit`.

**Confirmed NOT leaking** (verified, do not touch):
- Collection-creation request (`RuleCollectionBuilder.vue:1525`) sends resolved
  `elementIdentifiers`, not the rules definition — no rule-payload leak there.
- All-corpus scan (`/tmp/iwc_uikey_scan.py`): every UI-key hit sits under the `rules` param;
  `data_column`, `drill_down`, and all other param types are clean — `rules` is the only
  Path-A/Path-B surface.

## Constraint: the Path A fix must be LOCAL to the FormTool callback

`deepEach` has three callers (`grep -rn deepEach client/src`):
1. `FormTool.vue:147` — the leak site (mutating).
2. `FormTool.vue:169` — conditional handling (mutating, but only touches `type==="conditional"`).
3. `client/src/components/Workflow/Editor/modules/parameters.ts:83` — read-only; hunts
   `${...}` legacy parameter refs in string values and **must keep recursing into rule
   payloads** to find refs anywhere.

Therefore: do NOT globally make `deepEach` skip rule payloads. The skip must be opt-in per
callback.

## Fix — Path A (primary): stop the FormTool `deepEach` stamping

Give the `deepEach` callback the ability to halt recursion into a subtree by returning `false`,
then use it in the FormTool leak-site callback to avoid descending into a `rules` input's value.

### 1. `client/src/utils/utils.ts` — opt-in recursion control (backward compatible)

```ts
export function deepEach<...>(
    object: Readonly<O>,
    callback: (object: V | AnyObject) => void | boolean,   // <- allow boolean return
): void {
    Object.values(object).forEach((value) => {
        if (Boolean(value) && typeof value === "object") {
            const descend = callback(value);
            if (descend !== false) {                        // <- skip subtree on explicit false
                deepEach(value, callback);
            }
        }
    });
}
```

Existing callbacks return `undefined` → `descend !== false` → recurse as before. No behavior
change for callers 2 and 3.

### 2. `client/src/components/Workflow/Editor/Forms/FormTool.vue` — stop at `rules`

In the first `deepEach` callback, after the top-level rules handling, return `false` for a
`rules` input so its opaque payload is never walked:

```js
} else {
    const isRules = input.type === "rules";
    input.connectable = !isRules;
    input.collapsible_value = isRules ? undefined : { __class__: "RuntimeValue" };
    input.is_workflow = (input.options && input.options.length === 0)
                        || ["integer", "float"].indexOf(input.type) != -1;
    if (isRules) {
        return false;   // do not descend into the rule-builder payload
    }
}
```

(Optional consistency: have the second `deepEach` callback also `return false` for
`input.type === "rules"`; it does not currently leak, so this is cosmetic/perf only.)

This stops the leak at the source for all future saves of workflows containing Apply Rules (or
any rules-typed input).

### Alternative fix (if reviewers dislike changing `deepEach`)
Guard the stamping to genuine tool inputs. Nested rule entries have a `.type` but no `.name`;
tool inputs always have `.name`. Change `if (input.type)` → `if (input.type && input.name)`.
Less semantically precise (relies on the name invariant) and does not stop the wasted recursion,
but it is a one-line, util-free fix. Prefer the primary fix; keep this as fallback.

## Fix — Path B (required): scrub transient state at the canonical serialization

Path A alone does NOT remove `error`/`warn`/`editing` — those are written by the rule builder
(`rule-definitions.js applyRules`), not FormTool. Strip the UI-only keys at the single canonical
serialization point so every persisted surface (workflow `tool_state` + `localStorage` saved
sessions) is covered at once.

`client/src/components/RuleCollectionBuilder.vue`, where `asJson` is built (~line 1382):

```js
const UI_ONLY_RULE_KEYS = ["collapsible_value", "connectable", "is_workflow", "editing", "error", "warn"];
const stripUiKeys = (entry) => {
    const clean = { ...entry };
    for (const k of UI_ONLY_RULE_KEYS) {
        delete clean[k];
    }
    return clean;
};

const asJson = {
    rules: this.rules.map(stripUiKeys),       // serialize DSL-only copies...
    mapping: this.mapping.map(stripUiKeys),   // ...leave this.rules/this.mapping live for the UI
};
// ... extension/genome unchanged ...
this.ruleSourceJson = asJson;
this.ruleSource = JSON.stringify(asJson, replacer, "  ");
```

Notes:
- Build from **copies** — do NOT mutate `this.rules`/`this.mapping`; the live model must keep
  `error`/`warn`/`editing` so the builder UI still renders validation state. Only the serialized
  output is cleaned.
- One change covers both persisted surfaces: `ruleSourceJson` (→ workflow tool_state) and
  `ruleSource` (→ view-source panel + `localStorage` saved sessions).
- Stripping all six keys here also covers Path A defensively for any rule set saved through the
  builder; the FormTool Path-A fix still matters for workflows whose rule modal is never reopened
  (their stamped tool_state never passes through `asJson` again).
- Safe: the server never reads these keys; `applyRules` re-derives `error`/`warn` and the UI
  re-establishes `editing` on next open. DSL keys (`type`, `value`, `columns`, `expression`,
  `group_count`, `numeric`, …) are preserved. `updateFromSource` round-trips fine (re-derives).
- `mapping` entries (e.g. `paired_identifier`) leak too (corpus-confirmed) — covered since both
  arrays are mapped.
- Alternative (narrower) location: `FormRulesEdit.onSaveRules` `emit("input", sanitizeRules(rules))`
  — covers only the workflow path, not saved sessions. Prefer the `asJson` fix.

## Existing-data cleanup (secondary — recommend DEFER, do not bundle)

The primary fix prevents NEW leaks but does not clean workflows already saved with the metadata:
when such a workflow is loaded and re-saved, the stale keys persist in the rules value (the first
`deepEach` no longer re-stamps, but it also does not remove them).

Options, in order of preference:
- **A (recommended): clean it in the tool_util / `gxwf clean` path, not the editor.** The
  sibling workflow_state work already canonicalizes tool_state; stripping the UI-only keys from
  rule payloads there avoids the editor silently rewriting historical workflows on open, and
  keeps the lossless conversion path honest. Track separately.
- **B: strip on load in the RuleBuilder value normalization.** Wherever the editor parses a
  rules value for editing, drop `collapsible_value`/`connectable`/`is_workflow`/`editing`/
  `error`/`warn` from each `mapping[]`/`rules[]` entry. Cleans on next save but mutates
  historical workflows implicitly — flag for product/UX sign-off.

Do NOT silently rewrite existing workflows as a side effect of this bug fix. Keep this plan
scoped to **stopping the leak**; surface cleanup as a deliberate, separately-reviewed change.

## Tests (red → green)

### Client unit — `client/src/components/Workflow/Editor/Forms/FormTool.test.js` (vitest)
Mirror the existing `mountTarget()` setup. Add a config_form with a `rules` input plus sibling
scalar inputs:

```js
inputs: [
  { name: "input", label: "input", type: "text", value: "value" },
  { name: "rules", label: "rules", type: "rules", value: {
      mapping: [{ type: "list_identifiers", columns: [1] }],
      rules:   [{ type: "add_column_metadata", value: "identifier0" }],
  }},
]
```

Assertions on the computed (`const inputs = mountTarget().vm.inputs;` — or inspect the `inputs`
prop passed to the stubbed `FormDisplay`):
1. **Leak fixed:** `inputs[1].value.mapping[0]` and `inputs[1].value.rules[0]` have NO
   `collapsible_value`, `connectable`, or `is_workflow` keys. ← red before fix.
2. **#18741 preserved:** top-level `inputs[1]` (the rules input) has
   `collapsible_value === undefined` and `connectable === false`.
3. **Regression guard:** the sibling `text` input `inputs[0]` still gets
   `collapsible_value.__class__ === "RuntimeValue"`, `connectable === true`.
4. (If alternative fix chosen, assertions 1-3 still hold.)

### Util unit — `client/src/utils/utils.test.ts` (add if not present)
`deepEach` returning `false` from the callback halts recursion into that node’s children;
returning `undefined`/`true` recurses (covers callers 2 and 3 unchanged).

### Client unit (Path B) — `RuleCollectionBuilder` asJson scrub
Drive the builder so `asJson`/`ruleSourceJson` is recomputed with a model whose `rules[]`/
`mapping[]` entries carry `error: null`, `warn: "x"`, `editing: true`, plus leaked
`collapsible_value`/`connectable`/`is_workflow`. Assert:
1. `ruleSourceJson.rules[*]` / `.mapping[*]` contain ONLY DSL keys — all six UI keys stripped.
   ← red before fix.
2. DSL keys (`type`, `value`, `columns`, `group_count`, `numeric`, …) survive.
3. The live `this.rules`/`this.mapping` still carry `error`/`warn`/`editing` (UI unaffected).
(If the narrower `FormRulesEdit.onSaveRules` location is chosen instead, assert the same on the
emitted `input` payload.)

### Manual / e2e (optional)
In the workflow editor, add an Apply Rules step, build a rule set, save, then download the `.ga`
and confirm the `rules` payload entries contain only DSL keys (no `collapsible_value`, `error`,
`warn`, `editing`, etc.).

## Validation / regression checklist
- `yarn jest FormTool RuleCollectionBuilder` (or the repo’s client test runner) green.
- `client/src/components/Workflow/Editor/modules/parameters.ts` behavior unchanged — legacy
  `${...}` parameter detection still finds refs inside rule payloads (caller 3 still recurses).
- Conditional-input runtime toggling (second `deepEach`) unchanged.
- `asJson` scrub uses copies — live `this.rules`/`this.mapping` unmutated; builder still shows
  per-rule errors/warnings; "view source" panel shows DSL-only JSON; `updateFromSource`
  round-trips.
- Saved rule sessions written to `localStorage` (`SaveRules.vue`) no longer contain UI keys.
- Lint/typecheck: `deepEach` callback type widened to `void | boolean`.

## Scope
Small. Path A: `utils.ts` + `FormTool.vue`. Path B: `RuleCollectionBuilder.vue` (the `asJson`
scrub). ~2-3 test files. No server changes. No migration. Existing-data cleanup explicitly
deferred. **Both paths must ship together** — fixing only Path A leaves the most prevalent keys
(`error`/`warn`, 33 each) still leaking, repeating #18741's partial-fix mistake. The single
`asJson` scrub covers both persisted surfaces (workflow tool_state + localStorage saved sessions).

## Open questions
1. Primary (`deepEach` `false`-return) vs alternative (`input.name` guard) for Path A? Recommend
   primary.
2. Existing-data cleanup: confirm DEFER to `gxwf clean` (option A) vs editor load-normalization
   (option B). Recommend A. (Note: the Path B `asJson` scrub cleans on the next serialize — i.e.
   when a user reopens+saves the rule modal — but don't rely on it for bulk cleanup of historical
   workflows.)
3. Should the second `deepEach` also short-circuit on `rules` (cosmetic)? Recommend yes for
   clarity.
4. RESOLVED — all-corpus scan (`/tmp/iwc_uikey_scan.py`): UI-key leaks appear ONLY under the
   `rules` param. `data_column`/`drill_down`/all other param types are clean. `rules` is the only
   Path-A/Path-B surface; no further leak targets.
5. RESOLVED — the collection-creation request sends resolved `elementIdentifiers`, not the rules
   definition, so it does NOT leak rule payloads. The only extra persisted surface is
   `localStorage` saved rule sessions, which the central `asJson` scrub already covers. No
   separate ticket needed.
