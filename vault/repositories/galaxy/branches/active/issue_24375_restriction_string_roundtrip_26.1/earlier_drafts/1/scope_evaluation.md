Run via Claude Opus at high effort.

**Recommendation: modest expansion. Keep the escape-based fix as implemented on `release_26.1`, and also fix `step_state_to_tool_state` so that a state with both `restrictions` and `suggestions` loads as static restrictions, not suggestions.** That bug sits in the function this branch already edits, a few lines from the changed calls, and it's the same class of failure as the issue: opening the workflow in the editor and saving it silently rewrites its options, in this case dropping the restrictions. The fix is a one-line precedence change plus a unit test and a round-trip API case. Leave the rest for other PRs. The structured editor is dev work because repeats don't work in this form. A dict with no `value` and non-text entries are import-validation questions that belong with the strict-typing follow-up (gxformat2#272). The sample-sheet column editor is a separate client-side format with a different data model. The branch fixes all the symptoms the issue lists except the dict-with-no-`value` case.

## Possible Decompositions

The branch is about 310 changed lines: roughly 150 in `lib/` and 160 in tests. Three commits; it has no generated code.

- **A. Baseline tests (`af039d3bfee`).** Unit tests that pin the cases that already round-trip: plain values, `value:label`, and tool-form parsing for restrictions and suggestions. They pass on `release_26.1`, so they could land first as a standalone test-only PR.
- **B. Escape encoding (`0f105c6e016` + `c3bf15ffc76`).** The `parameter_options_to_form_str`/`form_str_to_parameter_options` helpers, replacement of the method and the closure in `modules.py`, help text, the lossy-case unit tests, and the API download/re-import test. It depends on A only for test-file context.
- **C. (If the recommended expansion is taken) Both-keys precedence.** A one-line change in `step_state_to_tool_state` plus tests. It's independent of B and could land before or after it, or go in the same PR.

## 1. As implemented

The editor keeps its single `value:label,...` field, but the encoding becomes lossless: `\,`, `\:`, `\\` and `\<whitespace>` escapes, `:` for the empty value, and stray commas dropped. Label-less dicts, non-text entries and `None` now load as text instead of raising. The helpers live next to `validators_to_form`/`validators_from_form`.

| Pros | Cons |
|---|---|
| <ul><li>Fixes every lossy case in the issue: `:`, `,`, edge whitespace, stray commas, label-less dicts and non-text entries</li><li>It's the issue's own stated alternative ("escape `,` and `:`")</li><li>Persisted state stays structured, so only newly typed strings see the syntax change</li><li>Existing strings like `C\data` don't change</li><li>Net simplification in `modules.py`; no conflict with #24140</li><li>Covered by 200k-case property checks and a red/green API test</li></ul> | <ul><li>Newly typed `a,,b` no longer yields `""`, and `\,` is now an escape; this needs a note in the PR description</li><li>Help text grows</li><li>Leaves the editor still misreading a state that has both restrictions and suggestions (scope 3)</li><li>Escape syntax in a free-text field is less friendly than rows</li></ul> |

## 2. Structured value/label editor (the issue's preferred fix)

Replace the delimited string with a repeat of value/label rows, or a dedicated client component, so the editor never needs an encoding.

| Pros | Cons |
|---|---|
| <ul><li>The issue names it as the preferred fix</li><li>No escape syntax for users to learn</li><li>Could later be shared with the sample-sheet column editor</li></ul> | <ul><li>Repeats reportedly don't work in this conditional config form, so it needs form-framework or client component work</li><li>A UI feature, not a release-branch fix: it would target dev</li><li>Much larger change and needs Selenium/Playwright coverage</li><li>The data loss happens on load, so it should be fixed now rather than wait for a UI redesign</li></ul> |

<details>
<summary>Details</summary>

The escape fix doesn't preclude this. A later structured editor would replace `parameter_options_to_form_str`/`form_str_to_parameter_options` at the same two call sites, and persisted state wouldn't change. The PR description can point at it as the dev follow-up.
</details>

## 3. Expand: a state with both restrictions and suggestions loads as suggestions (recommended)

In `step_state_to_tool_state`, `if restrictions is not None` sets `staticRestrictions`, and then `if suggestions is not None` overrides it, so a state with both keys opens as suggestions and the next save drops the restrictions. Reorder it so restrictions win.

| Pros | Cons |
|---|---|
| <ul><li>Same function this branch edits, a few lines from the changed calls</li><li>Same failure mode as the issue: load and save silently rewrites the allowed values, here by removing them</li><li>Restrictions winning matches `get_config_form`, which already prefills with `restrictions or suggestions`, and matches the run form, which renders such an input as a select</li><li>About one line plus a unit test, and an extra case in the existing API round-trip test</li></ul> | <ul><li>The editor never produces this state; only gxformat2 and API-created workflows can, so it's rare</li><li>Either precedence loses one list on save, because the form holds only one; the fix chooses which loss, it doesn't preserve both</li><li>Not named in the issue</li></ul> |

<details>
<summary>Details</summary>

At run time (`get_runtime_inputs`), restrictions make the input a select, and then the `suggestions` block overwrites `options` with the suggestion values. So today such an input runs as a select restricted to the suggestions. After an editor save it becomes a free-text input with suggestions, and the constraint is gone. With restrictions taking precedence, the input stays restricted after a save, but to the restrictions list. That is the safer outcome, because restrictions are a constraint and suggestions are only advice.

An optional extra line would make the run form skip the suggestions block when `restricted_inputs` is already set, so the run form also honors restrictions. That changes run-form behavior for these workflows, and it overlaps `get_runtime_inputs`, which #24140 also edits (on `release_26.2`). Take it only if a reviewer asks for it.
</details>

## 4. Expand: handle a dict with no `value`

`{"label": "x"}` still raises `KeyError` in the editor conversion, and also in the run form's `_parameter_def_list_to_options`.

| Pros | Cons |
|---|---|
| <ul><li>Closes the last crash-on-load shape near this code</li><li>Small</li></ul> | <ul><li>There's no right value to load: using the label or `""` invents data</li><li>Such a workflow is already broken on the run form, so the workflow is invalid rather than just losing data</li><li>The right fix is rejecting it at import, which is scope 5</li><li>Pre-existing and not caused by this branch</li></ul> |

## 5. Expand: reject non-text restriction entries at save or import

Validate restrictions and suggestions as strings, or `{value: str, label: str}`, when a workflow is saved or imported, in line with the 26.2 strict typing and gxformat2#272.

| Pros | Cons |
|---|---|
| <ul><li>Stops invalid shapes at the source</li><li>Would cover scope 4's dict too</li><li>Consistent with John's strict-typing decision for multiple text parameters</li></ul> | <ul><li>On `release_26.1`, it would reject numeric restrictions that run fine today; only the editor crashed on them</li><li>The 26.2 strict typing applies to multiple text parameters, which are new in 26.2; restrictions have shipped for years</li><li>Belongs in the validation layer and gxformat2 schema, not the editor encoding</li><li>The coerce-on-load in this branch stays correct either way</li></ul> |

## 6. Expand: same escapes in the sample-sheet column editor

`FormColumnDefinition.vue` edits sample-sheet column restrictions and suggestions as a plain comma string (`parseCommaSeparatedValues`/`asString`), so a value containing `,` is split when the field is edited. Port the escape rules to TypeScript.

| Pros | Cons |
|---|---|
| <ul><li>The same kind of loss in a sibling editor; a reviewer may notice that the two help texts differ</li><li>Small parser</li></ul> | <ul><li>A different layer (client TypeScript, Vitest) and a different data model: plain values with no labels, typed columns, and parsing on each edit</li><li>It's lossy only when the user edits that field, not on every load and save as the issue describes</li><li>Escapes don't fix its other problem: integer column restrictions come back as strings</li><li>Two copies of the escape grammar, in Python and TypeScript, would have to stay in sync; a structured editor (scope 2) is the better shared fix</li></ul> |

## 7. Retarget

The conversion functions are identical from `release_25.1` (still supported; 25.1.0 shipped 2025-12-12) through dev.

| Pros | Cons |
|---|---|
| <ul><li>**`release_25.1` or `release_26.0`:** the oldest supported branches that have the bug, which follows Galaxy policy, and the data loss is silent</li><li>**`release_26.2`:** lands with #24140, which first exposes the empty option on the run form; it's also the strict-typing release</li><li>**dev:** only if scope 2 is taken</li></ul> | <ul><li>**Older:** it changes the editor field's syntax, which is more than a minimal backport; mild preference for a recent branch</li><li>**`release_26.2`:** the `:`, `,` and whitespace losses happen on 26.1 too, so going later leaves 26.1 users exposed</li><li>**dev:** too late for a data-loss bug</li></ul> |

<details>
<summary>Details</summary>

`release_26.1` is a reasonable middle choice and the recommendation keeps it. The fix is self-contained (two helpers, two call sites), so if a reviewer asks for an older target, a rebase onto `release_25.1` should apply cleanly. Merging forward into 26.2 doesn't conflict with #24140, which touches `restrict_options`, `_is_default_option` and run-form option building. Scope 3's optional run-form line would be the only point of contact.
</details>
