# Baseline refactor: selenium_tool_form_helpers

I split the first commit, `ad305a6c430` (the move from `RunsToolTests`), into three commits:
- A move with no behavior change from `origin/dev`.
- A commit that sends collections down the same path as datasets.
- The int-hid selection, with its E2E test.

The other 12 commits replayed with no conflicts. The final tree is byte-identical to `d4a4ea5d0db` (`git diff d4a4ea5d0db HEAD` is empty). The new head is `9e4a42c6388`. The old head is kept as the local branch `selenium_tool_form_helpers_pre_baseline`.

## How the work was refactored

`ad305a6c430` described itself as a move, but it changed two behaviors:
1. **Int hids.** `tool_form_fill(data=...)` accepted an int hid, which `origin/dev` never had. The new E2E test `test_tool_form_fill_by_parameter_path` relies on it.
2. **Collections.** On dev, `_fill_tool_form` selected each staged collection with a bare `tool_set_value(..., expected_type="data")`. The move merged collections into `data` as `{**data, **collections}`. Collections then went through `_is_multi_data_param` and `_clear_multiselect_tags`, and got `multiple=True`.
   - This only makes a difference for a collection given to a `data_multiple` parameter. Its default "Multiple datasets" variant renders `.form-selection`.
   - `data_collection` variants are never `multiple`, so collection parameters are unaffected.

The new commits:
- `4e0ff77dcb3` **Move the tool-form filler from RunsToolTests into NavigatesGalaxy.**
  - Moves the code as is, with dev behavior.
  - `tool_form_fill(values, data, collections)` takes `data: dict[str, str]` labels only. The optional `collections` argument is selected the way dev selected it: counted for repeat instances, then set after data with no multi handling.
  - The `-` lookup bug and the Selenium-only `except` stay in place. The next commits already fix them.
  - `collections` is a temporary argument, and the next commit removes it. That was the only way to keep dev's collection path without leaving repeat or section setup out for collection-only inputs.
- `1e65e508a3c` **Select collections like datasets in tool_form_fill.** Drops the `collections` argument. `RunsToolTests` passes `{**data, **collections}`. This is the one harness behavior change, isolated so it can be reviewed.
- `49ab335afd1` **Select tool form data by hid in tool_form_fill.** Adds `int | str` data values and `test_tool_form_fill_by_parameter_path`. The tree at this commit is identical to `ad305a6c430`.

## Considered, not done

- **Folding `d4a4ea5d0db`'s `galaxy.selenium.tool_form` extraction earlier.**
  - Most of that module is build-model code that is new on this branch (6b and 6c), so it can't go to the base.
  - Moving `repeat_instance_counts` into the move commit would stop the move from being a verbatim move of dev's `_parse_repeat_key`. It would also rewrite the lines that 7e (`a4abeb0d511`) and the polish commit (`48ea9865308`) touch.
- **Moving `5d193098daa`** (the Playwright deferral fix, a dev bug) up next to `0e53077612f`. Its test change reorders a fill inside 6b's `test_tool_form_parameters_match_form`, so it has to come after 6b. It's a fix, not a refactor.
- **`48ea9865308`'s `_clear_multiselect_tags` wait.** It changes timing on dev code, so it's polish rather than a refactor. Its other changes are in code that is new on this branch.

## Old → new SHAs

The branch debriefs (`index.md`, `test_challenges_debrief.md`, `polish_e2e_tests_debrief.md`, `codex_review.md`, `thermo_nuclear_review.md`) cite old SHAs. Map:

| Old | New | Commit |
|---|---|---|
| `ad305a6c430` | `4e0ff77dcb3` + `1e65e508a3c` + `49ab335afd1` | move, then collections, then hid selection |
| `4e88510f77b` | `0e53077612f` | Retry tool form parameters a conditional reveals late |
| `3cf055e344f` | `c02d13c3d1b` | Describe a tool's form fields (6b) |
| `d51daa303c9` | `c39182618ea` | Describe a job's rerun form (6c) |
| `f529c0c20fc` | `af8b828a033` | Fill a workflow editor step's form (7a) |
| `84602921ed3` | `a4abeb0d511` | Add only the missing repeat instances (7e) |
| `9f7f51b6c46` | `739e327a7f9` | Pick the exact option in select_set_value (7f) |
| `148ec120d51` | `949d1d4f18c` | Test the editor step and the rerun form |
| `538a045a51b` | `5d193098daa` | Retry under Playwright |
| `5ffd1630708` | `4aec94b9d0b` | Repeat counting E2E; drop stubbed unit tests |
| `78210ddb6d0` | `48ea9865308` | Wait instead of sleeping |
| `7ba26e123c7` | `3e74adc7e08` | Drill-down and pinned data in tool form parameters |
| `d4a4ea5d0db` | `9e4a42c6388` | Move build-model parsing into galaxy.selenium.tool_form |

Downstream: `galaxy_ui_driver` merged the old SHAs, so its restack will see these as different commits with the same final content.

## Tests

- **Final tree.** It matches `d4a4ea5d0db` exactly, so the earlier E2E results (all 5 listed tests passing under Playwright) still hold. Unit tests `test_tool_form_parameters.py` and `test_select_set_value.py`: 10 passed.
- **`4e0ff77dcb3`.** mypy from `lib/` on `navigates_galaxy.py` and `framework.py`: clean. Pre-commit (black, ruff, flake8, and the rest): passed.
- **`1e65e508a3c` and `49ab335afd1`.** Pre-commit passed. At `49ab335afd1`, `test_tool_form.py::TestToolForm::test_tool_form_fill_by_parameter_path` passed under headless Playwright against Vite 5173.
- **Not run.** No harness (`GALAXY_TEST_E2E_TOOL_TESTS`) tests at the intermediate commits. They need CI's tool requests and Celery to pass in full.
