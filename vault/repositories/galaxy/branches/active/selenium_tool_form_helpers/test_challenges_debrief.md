# Test challenges: selenium_tool_form_helpers (re-harden)

Challenged head `a455e58946f`. New head is `9c2d52bc891`. I fixed up three commits, reworded the 7f message and added one commit on top. The final tree matches what I tested.

The main change is that the browser-fixture unit tests now go through the public API. Both `_Page` shims borrowed private `NavigatesGalaxy` methods and passed everything else through `__getattr__`. A real subclass, `FixturePage` in `test/unit/selenium/conftest.py`, replaces them. It is a `HasDriverProxyImpl` plus `NavigatesGalaxy`, with a no-op `sleep_for`, and a `fixture_page` fixture opens a fixture page on each backend. The repeat and section tests now call `tool_form_fill(values=...)` and assert on the filled input, so they no longer exercise `_add_repeat_instances`, `_repeat_instance_count` or `_expand_collapsed_sections` directly. The fixture also starts only the browser its backend needs. The old fixture started Chrome and Playwright for every test.

## Commits

- `bcd995ce502` (fixup of 7f `739e327`):
  - Adds `FixturePage` and `fixture_page` to conftest and moves `test_select_set_value.py` onto them.
  - The `multiselect.html` comment now says what the fixture imitates; see the 7f section below.
  - The commit message now says the bug only happens on selectors that don't rank exact matches first.
- `9c1f8e9c455` (fixup of `62f1d2e`):
  - `test_add_repeat_instances.py` becomes `test_tool_form_fill.py`, with the nested-repeat and same-named-repeat tests driven through `tool_form_fill`.
  - `nested_repeat.html` keeps only repeats, and each form element has an `<input>`.
  - Drops `test_repeat_instance_counts_inside_conditionals_and_sections`.
- `3d13dac640d` (fixup of `a455e58`): the section test moves to its own `sections.html` fixture. Before, sections sat in the repeat fixture, so the nested-repeat tests went red at the section commit for the wrong reason: the old code clicked a header hidden inside a collapsed section.
- `9c2d52bc891` (new): drops the `test_tool_form_fill_counts_rendered_repeat_instances` E2E test.

## Verdicts

### Unit: `test_tool_form_parameters.py`

| Test | Verdict | Red point |
|---|---|---|
| `data_and_repeat_paths`, `conditional_lists_every_case_with_its_condition`, `section_and_repeat_instances_use_form_prefixes` | keep | Missing API only. They describe a new pure function (`c02d13c`), have no mocks, and assert labels, types, values and options, which the E2E test doesn't check. |
| `drill_down_options_flatten_nested_options`, `data_lists_pinned_selection_before_page_options`, `data_value_label_matches_source_not_just_id`, `data_value_from_pinned_collection_element_uses_its_name` | keep | Ran against the parent of `c96334`: 3 fail at their own assertion, and the drill-down test fails with `KeyError: 0`. |
| `repeat_instance_counts_take_the_highest_index_per_repeat` | keep | Characterizes counting code moved in `856231a`, with no red→green: it passes against `e98faf9`. Kept because it carries the `cond\|outer_0\|x` prefix case the dropped test duplicated. |
| `repeat_instance_counts_inside_conditionals_and_sections` | **drop** | Ran against the `e98faf9` counting code: it passes. The old regex already counted conditional and section prefixes; the bug was in the insert target. The `cond\|outer_0\|x` case in the test above also covers the prefix. |
| `repeat_instance_counts_every_level_of_nested_repeats_outer_first` | keep | Ran against `e98faf9`: fails at its own assertion (`{'outer': 2}`). |
| `repeat_insert_scope_is_the_innermost_enclosing_instance` | keep | Missing API only. It's a new pure helper, and the `outer_1\|sec\|inner_0\|cond\|deep` case has no other coverage. |

### Unit: `test_tool_form_fill.py` (formerly `test_add_repeat_instances.py`)

No test tool has a repeat inside a repeat or a repeat inside a section. A scan of `test/functional/tools` found none. The 8080 tool conf belongs to another session's worktree, so a new tool couldn't be run here. The fixture is still the only layer for these shapes.

| Test | Red point (ran each) |
|---|---|
| `inside_a_repeat_instance` | At `0ca0652` it times out waiting for the `outer_1\|inner_2\|x` input. It's green at `62f1d2e`. |
| `refuses_same_named_repeats_in_one_scope` | At `0ca0652` it times out on the old `a\|dup` insert target, because there was no guard. It's green at `62f1d2e`. |
| `in_a_collapsed_section_keeps_open_sections_open` | At `62f1d2e` it times out on the `queries` insert hidden in the collapsed section. It's green after `a455e58`. |

### Unit: `test_select_set_value.py`: kept, with a finding

I tried to move this test to E2E and couldn't, because current dev already avoids the bug on the client side:
- Since `b10ff38b833` / `817612475e2` (2026-10-02), `SingleItemSelector` and `FormSelect` rank exact matches first.
- vue-multiselect 3.5's internal search sorts results by label length.

I checked this by disabling the exact-option click:
- A new rule-builder E2E (`rule_builder_set_extension("txt")`) still passed under Playwright.
- So did the existing `test_upload_activity.py::test_paste_content`, which sets `txt` and asserts it.

I dropped that E2E. The ranking is on `release_26.1` but in no tag yet, so released 26.1.x servers and older ones still have unranked selectors. `galaxy-selenium` drives such servers, which is where the `metacyto_clr.txt` failure in `GALAXY_UI_SKILL_RUNS.md` came from. So the fixture test is the only layer that shows 7f, and it is red without 7f at its own assertion (`'metacyto_clr.txt' == 'txt'`, on both backends). The fixture comment claimed real vue-multiselect behaves this way, which is wrong, so I reworded it to describe an unranked selector.

Side note: because client ranking is case-insensitive, a harness value like `do` now lands on "Do" over "Dont" on dev. On unranked servers the harness still types option values, not labels. That predates this branch and is out of scope.

### E2E

| Test | Verdict | Red point (reasoned unless noted) |
|---|---|---|
| `test_tool_form_fill_by_parameter_path` | keep | Red without int-hid support (`49ab335`). |
| `test_tool_form_fill_maps_over_collection` | keep | Red without `e98faf9`: the collection isn't listed in dataset mode, so the select fails during the fill. |
| `test_tool_form_parameters_match_form` | keep | Missing API for `tool_form_parameters`. Without the deferral fixes (`0e53077`, `3beaf14`), the checkbox assertion fails. |
| `test_tool_form_fill_counts_rendered_repeat_instances` | **drop** | Covered by the conditional test below: same top-level insert target, same min="1" counting and the same "no extra instance" assertion. |
| `test_tool_form_fill_adds_repeat_instances_in_conditional` | keep | Red without 7e (`rep_level_2` shows up) and before `9c1f8e9`. Seen red during the rescope. |
| `test_tool_form_fill_expands_only_collapsed_sections` | keep | Seen red at `62f1d2e` during the rescope review. |
| `test_tool_form_parameters_for_rerun` | keep | Rejects `job_id` without `c391826`, and checks 42 against the tool default of 1. |
| `test_tool_form_fill_on_editor_step` | keep | Without `af8b828` it times out waiting on `button#execute`. |

The harness path (`RunsToolTests._fill_tool_form`) remains covered by the `GALAXY_TEST_E2E_TOOL_TESTS` runs, which need CI.

## Test runs

All E2E runs were headless against Vite on 5173, which belongs to another session. I didn't start or stop any server.

- New rule-builder E2E, Playwright: passed with 7f and also passed without it, so I dropped it.
- `test_upload_activity.py::test_paste_content`, Playwright, without 7f: pass.
- `test_tool_form_fill_adds_repeat_instances_in_conditional`, Playwright, final head: pass.
- Unit:
  - Final head `9c2d52bc891`: `test_tool_form_parameters.py`, `test_tool_form_fill.py` and `test_select_set_value.py` give 18 passed, and the full `test/unit/selenium` gives 544 passed and 1 skipped.
  - Each rewritten commit's unit files pass, at 11, 17 and 19 tests. I ran them before the last two fixups (the conftest `cast` and the dropped counts test), so the tested commits were the predecessors of `bcd995c`, `9c1f8e9` and `3d13dac`.
- Red checks: as listed per test above, run by temporarily checking out older `navigates_galaxy.py`, `tool_form.py` and `navigation.yml`, then restoring them.
- Pre-commit with the sample config is clean. mypy on the changed test files (from `lib/`) reports errors only in `galaxy/util`, which this branch doesn't touch.
