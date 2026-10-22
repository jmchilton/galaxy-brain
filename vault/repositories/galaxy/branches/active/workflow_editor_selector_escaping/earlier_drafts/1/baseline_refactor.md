# Baseline refactor: workflow_editor_selector_escaping

Two refactor commits now apply to the parent `9699ec45644` ahead of the fix: the `css_attribute_value` helper with quoted `[id='…']` connector selectors, and the `_saved_step_connections_by_label` test helper. The fix and its test follow as one commit. The final tree is identical to the pre-rewrite head `21508cf7686`.

## New history (oldest first)

1. `9269c3e687d` Select editor connectors by quoted [id=] via css_attribute_value
2. `11f41f72e31` Extract _saved_step_connections_by_label editor test helper
3. `248fba718cc` CSS-escape workflow editor node labels and terminal names

The old history is backed up as `workflow_editor_selector_escaping_pre_rewrite_20261022` at `21508cf7686`.

## Refactors

### 1. `css_attribute_value` and quoted connector ids
- Adds the module-level `css_attribute_value` to `navigates_galaxy.py`.
- `connector_for` and `connector_invalid_for` in `navigation.yml` change from `#connection-…` to `[id='connection-…']`.
- `workflow_editor_source_sink_terminal_ids` drops the ad-hoc `.replace("|", r"\|")` and escapes through the helper instead.
- **No behavior change for any id the base can reach.**
  - `|` was the only character escaped before, and inside a quoted value it needs no escape.
  - Existing tests use no `'` or `\` in their terminals.
- This step takes over what Red 2 in the initial debrief recorded: the connector `#id` parse failure.

### 2. `_saved_step_connections_by_label`
- Extracts the by-label comprehension from the parent's `test_refused_connection_and_removed_step`.
- The helper sits in its final position, above `_saved_tool_step_connections`.
- It depends only on `_saved_steps_with_connections`, which the parent already has.

## Fix commit

- Folds `cdab7a9eb2c`, `ea7bfc87e47`, `949ab6faf13` and the rest of `21508cf7686` into one commit.
- It contains only:
  - the node-label and terminal-name escapes, plus the docstring change;
  - `test_connections_with_labels_needing_css_escapes` in its final form, with the rename, the step label and the full-dict post-destroy check.

## Decisions

- **No red test-only commit ahead of the fix.**
  - A failing commit breaks per-commit CI and bisect.
  - The gx_workhorse "Baseline tests" rule only puts *passing* tests first.
  - The red evidence (Red 1, 2, 3) is already in `initial_implementation_debrief.md`.
- **Test-then-fix pairs merged.** The test is new on this branch, so its intermediate shapes (the subworkflow-only version, the old name, the two-key check) carry no history worth keeping.

## Checks

At each new commit:
- `uvx ruff@0.17.0 check` and `uvx black@26.1.0 --check` on `navigates_galaxy.py` and `test_workflow_editor.py`;
- a `yaml.safe_load` of `navigation.yml`;
- importing `galaxy.selenium.navigates_galaxy` and `galaxy_test.selenium.test_workflow_editor` (`PYTHONPATH=lib`, venv);
- the commit pre-commit hooks.

All passed.

At the end:
- `git diff 21508cf7686 HEAD` is empty.
- `test/unit/selenium/test_smart_components.py`: 54 passed.
- No E2E run, because the tree is identical. Commit 1's connector selectors were already exercised in the final tree's recorded Playwright and Selenium greens.
