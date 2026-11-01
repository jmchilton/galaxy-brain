Run via Claude Opus at high effort.

**Recommendation: keep the scope as implemented on `release_26.1`; no further scope change.** The branch now contains the escape-based lossless encoding and the expansion the first evaluation recommended: a state with both `restrictions` and `suggestions` opens as restricted. The re-scope review raised no new scope question; its findings concerned the precedence details, and those were fixed in place. The one new candidate is the other key combinations the single-choice form still collapses (restrict-on-connections with suggestions or with static restrictions). It isn't worth another re-scope. Those combinations are rarer still, and either precedence loses one list, so a fix would only choose which list to drop. They also don't come from the escape-string bug the issue describes. Everything else from the first evaluation stays out of scope for the same reasons as before: the structured editor is dev work, a dict with no `value` and non-text entries belong to import validation (gxformat2#272), and the sample-sheet editor is a separate client format. Note in the PR description that the editor string's syntax has changed and that restrictions plus suggestions now open as restricted.

## Possible Decompositions

The branch has 4 commits and about 355 changed lines (+325/-30), with no generated code: about 160 lines in `lib/galaxy/workflow/` and the rest in tests.

- **A. Baseline tests (`948ff7e7f24`, +64).** Unit tests that pin the cases that already round-trip. They pass on `release_26.1`, so they could land alone as a test-only PR.
- **B. Escape encoding (`93f3625a14f` + `13c2282e38c`).** The `parameter_options_to_form_str`/`form_str_to_parameter_options` helpers, the `modules.py` call-site swap, help text, lossy-case unit tests and the download/re-import API test. B depends on A only for test-file context.
- **C. Both-keys precedence (`6340eaa04f2`, +42/-4).** The `step_state_to_tool_state` precedence change, two unit tests and `test_text_input_restrictions_and_suggestions_open_restricted`. It touches the same function as B but only its precedence block, so it could land before B, after it, or in the same PR.

The natural shapes are one PR (A+B+C); A then B+C; or A+B and then C as a small follow-up.

## 1. As implemented (recommended)

The editor's `value:label,...` string is lossless: `\,`, `\:`, `\\` and `\<whitespace>` are escapes, `:` stands for the empty value, stray commas are dropped, and label-less dicts, non-text entries and `None` load as text. With both `restrictions` and `suggestions` present, the restrictions win. Restrict-on-connections still beats static restrictions, as it does at runtime.

| Pros | Cons |
|---|---|
| <ul><li>Fixes every lossy case the issue lists except the dict with no `value`</li><li>Also fixes the closest sibling loss in the same function: a save no longer silently drops restrictions</li><li>The issue's own stated alternative ("escape `,` and `:`")</li><li>Persisted state stays structured, and existing strings like `C\data` are unchanged</li><li>Two independent normal reviews with nothing left open; red/green API tests for both changes</li><li>No conflict with #24140 (`git merge-tree` against `release_26.2` is clean)</li></ul> | <ul><li>The syntax changes for newly typed strings (`\,` escapes, `a,,b` no longer yields `""`). This needs a PR note</li><li>A restrictions-plus-suggestions workflow loses its suggestions on save, but before the fix it lost its restrictions</li><li>Restrict-on-connections combinations still collapse (scope 3)</li><li>Escape syntax is less friendly than rows</li></ul> |

## 2. Contract: back to the original scope (`_alt_original_scope`)

Drop `6340eaa04f2` and ship only the escape encoding (B), leaving the both-keys precedence for a separate PR.

| Pros | Cons |
|---|---|
| <ul><li>Strictly what the issue names</li><li>The alt branch already exists at `13c2282e38c`</li></ul> | <ul><li>Leaves a known silent loss in the function the PR already edits, which reviewers usually want fixed together</li><li>The precedence commit is small (+42/-4), reviewed and tested, so removing it saves almost nothing</li><li>It's still available as a split (decomposition C) without contracting the scope</li></ul> |

## 3. Expand: settle the remaining key combinations involving restrict-on-connections (new)

Two other combinations still collapse when a workflow opens in the editor. With `restrictOnConnections` and `suggestions`, the step opens as suggestions and drops the connection restriction. With `restrictOnConnections` and `restrictions`, it opens as on-connections and drops the static fallback list. Either could change: onConnections always first, or a form that holds the fallback list.

| Pros | Cons |
|---|---|
| <ul><li>Same function and same failure class</li><li>"Constraints beat advice", the rationale in the new code comment, would also argue for on-connections over suggestions</li></ul> | <ul><li>The editor never produces these states; only hand-written gxformat2 or API workflows do, which is rarer than the restrictions-plus-suggestions case</li><li>The form holds one choice, so any precedence just picks which list to lose; real preservation needs form changes (e.g. a static fallback under on-connections), which is UI work</li><li>Runtime itself is incoherent for on-connections plus suggestions: the suggestions overwrite the connection options, so there's no clear "right" behavior to preserve</li><li>The re-scope review explicitly said to keep on-connections winning on release_26.1 and left the suggestions case alone</li><li>A second scope change would park the branch for a decision over a corner case</li></ul> |

<details>
<summary>Details</summary>

The current precedence is `restrictOnConnections and suggestions is None` → onConnections; else restrictions → staticRestrictions; else suggestions → staticSuggestions. On-connections plus suggestions keeps its pre-branch behavior (opens as suggestions). If a reviewer asks for the code to match its comment, simplifying the first branch to `if restrictOnConnections:` is a one-line change plus a unit test. Take it only on request.
</details>

## 4. Expand: run form honors restrictions over suggestions (`get_runtime_inputs`)

Skip the `suggestions` block in `get_runtime_inputs` when `restricted_inputs` is already set, so suggestions can't overwrite restricted or connection-derived options at run time.

| Pros | Cons |
|---|---|
| <ul><li>Makes the run form agree with the new load precedence</li><li>One condition</li></ul> | <ul><li>The re-scope review verified that the collapse happens at import (`from_dict` → `step_state_to_tool_state` → `save_to_step`), so with this branch stored steps never reach the run form with both keys; the change would be close to dead code</li><li>Changes run-form behavior, in the function #24140 edits on `release_26.2`; it's the only real point of contact between the two branches</li></ul> |

## 5. Structured value/label editor (the issue's preferred fix)

Replace the delimited string with value/label rows or a dedicated client component.

| Pros | Cons |
|---|---|
| <ul><li>The issue's preferred fix; no escape syntax</li><li>Would also give scope 3 a place to keep both lists</li><li>Could be shared with the sample-sheet editor</li></ul> | <ul><li>Repeats don't work in this conditional config form, so it needs form-framework or client work</li><li>A UI feature for dev, with browser test coverage</li><li>The loss happens on load and should be fixed now; the helpers are a clean seam for a later replacement</li></ul> |

## 6. Expand: handle a dict with no `value`

`{"label": "x"}` still raises `KeyError` in the editor conversion and on the run form.

| Pros | Cons |
|---|---|
| <ul><li>The last crash-on-load shape the issue lists</li><li>Small</li></ul> | <ul><li>There's no correct value to load; using the label or `""` invents data</li><li>The workflow is already broken on the run form, so it's invalid, not merely lossy</li><li>The right fix is rejecting it at import (scope 7)</li></ul> |

## 7. Expand: reject non-text entries at save or import

Validate restrictions and suggestions as strings or `{value, label}` when a workflow is saved or imported, in line with the 26.2 strict typing and gxformat2#272.

| Pros | Cons |
|---|---|
| <ul><li>Stops invalid shapes at the source and would cover scope 6</li></ul> | <ul><li>On `release_26.1` it would reject numeric restrictions that run today</li><li>The 26.2 strict typing applies to multiple text parameters, which are new; restrictions have shipped for years</li><li>Belongs in the validation layer and the gxformat2 schema</li></ul> |

## 8. Expand: same escapes in the sample-sheet column editor

Port the escape grammar to `FormColumnDefinition.vue`'s comma-string parsing.

| Pros | Cons |
|---|---|
| <ul><li>A sibling editor with the same kind of loss</li></ul> | <ul><li>A different layer and data model (typed columns, no labels, parsed on each edit)</li><li>Lossy only when that field is edited</li><li>Two copies of the grammar to keep in sync; the structured editor (scope 5) is the better shared fix</li></ul> |

## 9. Retarget

The conversion functions are identical from `release_25.1` through dev.

| Pros | Cons |
|---|---|
| <ul><li>**`release_25.1`/`26.0`:** the oldest supported branches with the bug; the loss is silent</li><li>**`release_26.2`:** lands next to #24140, which exposes the empty option on the run form</li></ul> | <ul><li>**Older:** the syntax change and the precedence change make it more than a minimal backport</li><li>**`26.2`:** leaves 26.1 users with the `:`, `,` and whitespace losses</li><li>**dev:** too late for a data-loss bug</li></ul> |

<details>
<summary>Details</summary>

Keep `release_26.1`. The precedence commit doesn't change the retarget picture, because `step_state_to_tool_state` is equally self-contained. A rebase onto `release_25.1` should still apply cleanly if a reviewer asks for an older target.
</details>
