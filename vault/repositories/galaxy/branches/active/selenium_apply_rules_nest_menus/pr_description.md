Add missing E2E tests for Apply rules driven through the rule builder menus and for the rules GTN examples 3 and 4 build. Follow-up to 🔀 #24341.

| Behavior | Before | After |
|---|---|---|
| Building rules for the Apply rules tool from the menus | Not covered: its tests hand the builder source JSON | `test_run_apply_rules_nest_from_menus` |
| Column > Basename in the rule builder | No E2E use | Same test, checks the rule it builds |
| Apply rules nesting from the menus, checked through to map-over | No test does this end to end; identifiers never asserted | Same test, checks the `list:list` identifiers and the Sort collection map-over hint |
| Rules and mapping built by `test_uploads.py` rules examples 3 and 4 | Screenshots only, no assertions | Full `rules` list and mapping asserted |

Examples 3 and 4 could pick the wrong column and still pass, because a partial `remove_columns` leaves later columns to map. Their `sort` and regex replacement steps use column A, the editor default, so the new test also runs basename and sort on column B; a selector that sets nothing fails there. Regex replacement stays default-column only.

***This is test-only: no Galaxy behavior, UI or tutorial screenshot changes; `client/` gets one test navigation target. It also moves four existing `rule_builder_*` helpers onto that target so single-column helpers share one lookup. The new test's basename helper uses the target, and the first commit pins the helpers' output before they change.***

<details><summary>Commits</summary>

1. Baseline tests: rules examples 3 and 4 assert the rule source they build, using a new `assert_rule_builder_source`.
2. Adds a `rule_builder.rule_editor_column_selector` navigation target and moves `rule_builder_sort`, `rule_builder_add_regex_groups`, `rule_builder_add_regex_replacement` and `rule_builder_remove_columns` onto it. The two-selector helpers (concatenate, split, swap) keep their indexed lookups.
3. Adds `test_run_apply_rules_nest_from_menus` and `rule_builder_add_column_basename`. Additions only.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Builds on 🔀 #24341, whose `history_wait_for_new_collection` the new test uses. Part of 🌿[galaxy_ui_driver](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), used to exercise the rule builder through the UI driver. Alternative kept on 🌿[selenium_apply_rules_nest_menus_alt_original_scope](https://github.com/jmchilton/galaxy/tree/selenium_apply_rules_nest_menus_alt_original_scope) - the new test alone, touching no existing helpers. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented.</summary>

Moving the single-column helpers onto one target, guarded by the baseline commit, closes the gap the new helper would otherwise create. A typed editor handle for all ten helpers is the fuller fix and belongs on dev.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/selenium_apply_rules_nest_menus/scope_evaluation/).

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>One change: clearer naming and types on <code>assert_rule_builder_source</code>.</summary>

Left as a dev follow-up: helpers still use three idioms (target, indexed lookup, and both within the regex helpers).

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/selenium_apply_rules_nest_menus/thermo_nuclear_review/).

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Examples 3 and 4 checked nothing, so they now assert their rules and mapping.</summary>

Expected values were worked out by hand from the rule definitions before the first run. The nest test's assertions held up.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/selenium_apply_rules_nest_menus/test_challenges_debrief/).

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings.</summary>

Covered the full diff and each commit's patch, read-only.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/selenium_apply_rules_nest_menus/codex_review/).

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Commits ordered baseline, refactor, new test, so the refactor is checked against its guard.</summary>

The refactor commit alone passed examples 3 and 4 under Playwright and Selenium before the rebase onto current `release_26.2`. After it, the tip passes those plus the new test on both.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/selenium_apply_rules_nest_menus/baseline_refactor/).

</details>

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All items pass.</summary>

- [x] What does the user see when it fails? Developer sees a Selenium test failure: `assert_rule_builder_source` failures print the full source dict (`, source`), and the nested-collection and map-over hint asserts show actual vs expected values; no end-user impact.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Tests assert rule-builder JSON and resulting `list:list` identifiers via API, not helper internals.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `07d55d69f66` (rules examples 3 and 4 source asserts) leads, then the selector refactor `57d840de21c`, then the new test `084390a898f`.
- [x] Are the comments free of excess archeology? Yes. Only a one-line docstring on `assert_rule_builder_source`.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/selenium_apply_rules_nest_menus/pr_checklist/). Run via Claude Sonnet 5.5 at medium effort.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
