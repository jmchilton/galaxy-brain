# Thermo-nuclear review: workflow_editor_selector_escaping

**Top-line:** No real defects and no structural regressions in `9699ec45644..21508cf7686`, so there are no new commits and head stays `21508cf7686`.
- `css_attribute_value` stays in `navigates_galaxy.py`. The consumer search found one more real consumer, and it is in the same module.
- I flagged one boundary smell: `workflow_editor_node_and_terminal` returns a name that is already escaped. I did not act on it because the fix is bigger than the diff.
- I considered one "code judo" alternative, escaping inside `SelectorTemplate`, and rejected it.

STATUS: not blocked.

## Not acted on

- **Moving `css_attribute_value` to `galaxy.navigation` or `smart_components`.** Every real consumer already imports `galaxy.selenium.navigates_galaxy`.
  - `galaxy-navigation` is a separately published package. Adding public API to it with no outside consumer is premature.
  - `smart_components` wraps components and doesn't own selector syntax.
  - Move it when a consumer outside `galaxy.selenium` appears.
- **Wiring `workflow_run_specify_inputs`.** This is the concrete second consumer. Its labels come from test-data YAML keys, and they feed `input_data_div`, which is `[step-label='${label}']`, single-quoted. So the helper fits it as is, and it's a one-liner in the same module.
  - It isn't done here because it changes a different feature (the run form) and needs its own red test.
  - Follow-up: a small branch that applies `css_attribute_value(label)` there, with a run-form test on a quoted input label.
- **`upload_activity_helpers.py:607/625`, the hand-built `[data-label="{label}"]`.**
  - The label is free text, but the selector is double-quoted, so the current helper doesn't help: it escapes `'` and `\` but not `"`.
  - Adopting it there would mean also escaping `"`. That stays valid inside single quotes, because `\"` is just `"`.
  - Do it only when that site is wired.
- **Pre-escaped return from `workflow_editor_node_and_terminal`.** This leaks a selector-syntax detail out of a reference resolver.
  - The alternatives are escaping at about 7 call sites, or a `workflow_editor_terminal(ref, kind)` helper that returns the component.
  - Either is larger than this ~+90-line diff warrants.
  - Every caller uses the value only as a `name=` kwarg, and the docstring says it is escaped.
- **The `#` ambiguity in `"label#terminal"` refs, plus control characters.** Both are already recorded in the initial debrief, and nothing new came up here.

<details>
<summary>Full review</summary>

### Verdict
Approve. The diff is small and targeted, and it puts the escape at the choke point the helper chain already has. Measured against the approval bar:
- no structural regression;
- no file crossing 1k lines;
- no ad-hoc branching added;
- no casts or optional churn.

### Real defects
None. Checked:
- **Escape order:** backslash first, then quote.
- **Single substitution pass:** `string.Template.substitute` runs once, so a `$` in a value is not re-expanded.
- **Composition:** `${_}` carries the escaped node label into child targets.
- **Connector targets:** `[id='…']` matches the same element as `#id`. Dropping `\|` is right, because `|` needs no escape inside a quoted value.
- **Earlier runs:** the reds and greens on both backends are recorded in the prior debriefs.

### Structural / code-judo
- **Escaping in `SelectorTemplate` (rejected).** It is the tempting move, because the per-call escaping would disappear. But templates mix CSS `[a='${x}']`, `[a="${x}"]`, `#${x}` and XPath, and each needs different quoting.
  - A global escape would break XPath and `#id` targets.
  - A per-target opt-in flag in navigation.yml would be the "magic" handling the prompt warns against.
  - The NavigatesGalaxy helper layer is the right owner.
- **The boundary smell (flagged above).** `workflow_editor_node_and_terminal` now returns `(component, css-escaped name)`. The cleaner shape returns a terminal `SmartComponent`, so callers never handle the escaped string. That is a reasonable follow-up refactor of the parent stack's connection helpers, not of this escape branch.

### Placement of `css_attribute_value` (asked question)
Consumer search, per the Unused Infrastructure rule.

I grepped `lib/galaxy/selenium`, `lib/galaxy/navigation` and `lib/galaxy_test/selenium` for ad-hoc escaping and for free-text values going into attribute selectors:
- **Ad-hoc escaping:** none remains. The removed `.replace("|", r"\|")` was the only one. `framework.py:957` `key.replace("|", "-")` builds an id, not a selector escape.
- **Helped as written:** `workflow_run_specify_inputs` → `workflow_run.input_data_div(label=...)` (`[step-label='${label}']`). The labels are free text from test data, and it is in the same module.
- **Not helped as written:** `upload_activity_helpers.py` `[data-label="{label}"]` is double-quoted.
- **No benefit (literals or constants only):**
  - `workflow_output_toggle*` (`[data-output-name='${name}']`), which is only `out_file1`/`out_file2` in `test_workflow_editor.py`;
  - `input_div` (`"input_int"`);
  - `invocation_tab` (`Inputs`/`Steps`/`Debug`);
  - `selected_genome` (constants);
  - `unshare_with_user_button` (generated emails);
  - `test_personal_information.py:149` (fixed field labels).

**Decision: stay in `navigates_galaxy.py`.**
- All consumers, real and potential, are in or import from `galaxy.selenium`.
- Putting it in `galaxy.navigation` would add public API to a separate package that no consumer needs.
- Revisit if a consumer outside `galaxy.selenium` appears.

The initial review said "move when a second consumer shows up." A second consumer has now been found, but it lives in the same module, so that condition doesn't lead to a move.

### File size
- `navigates_galaxy.py` was already ~3450 lines and gains +5.
- `test_workflow_editor.py` was already ~2300 lines and gains +53.

No threshold is crossed by this PR. Decomposing those files is pre-existing debt, out of scope.

### Tests
- **New helper:** `_saved_step_connections_by_label` deduplicates three comprehensions and earns its keep.
- **E2E test:** it uses only `workflow_editor_*` helpers and API checks.

No changes.

### Nits
None worth a commit.

### Tests run
None, because no code changed. Earlier steps ran these green:
- at `21508cf7686` (test challenges): the new test and `test_refused_connection_and_removed_step`, on both backends;
- at `949ab6faf13` (initial review): `test_reconnecting_nodes`, on both backends. The only change after that commit is to the test file.

</details>
