# issue_23980_static_restriction_default — implementation debrief

**STATUS: READY.** Branch `issue_23980_static_restriction_default` @ `9b44c7b0b30` (jmchilton fork), 5 commits on origin/dev `9fd083720a7`. Fixes galaxyproject/galaxy#23980. Recovered on 2026-10-08 through the current process; the branch predated it. See [initial_implementation_debrief.md](initial_implementation_debrief.md) for the original write-up.

## Final implementation (`lib/galaxy/workflow/modules.py`)

- `_is_default_option(value, default_value)`: a list default selects each entry it contains; a scalar default selects an option equal to it. The check is `default_value is not None`, so an empty-string default (`""`) now selects an allowed `""` option. A missing default arrives as `None`.
- `_parameter_def_list_to_options(..., default_value=None) -> list[OptionDict]`, moved out of `get_runtime_inputs` to module level, sets `selected` on each option for static `restrictions`. Suggestions call it without a default.
- Both `restrict_options` paths (`restrictOnConnections`) use the same matcher, so a list default now selects every entry instead of none.
- The unused top-level `selected` kwarg is gone.
- Only the run form display changes. Execution already used the stored default.

## Tests

- API `test_value_restriction_static_default_selected` covers four inputs: scalar, multiple with a list default, dict `{value, label}` restrictions, and an empty-string default. It is red on dev, and the `""` case was red on the pre-Codex code.
- API `test_value_restriction_selects_multiple_text_list_default` covers a list default with `restrictOnConnections`.
- Selenium `test_execution_with_text_default_value_and_static_restrictions` checks the run form shows `Ex2`, saves a screenshot, submits and checks the output `ex2`. **It passed locally** (first run).
- All 7 `test_value_restriction*` API tests pass, and `test/unit/workflows` passes. Pre-commit and mypy are clean.

## Process outcomes

- **Review** ([subagents/review.md](subagents/review.md)):
  - acted on the test gap: added the `restrictOnConnections` API test;
  - acted on the `OptionDict` hoist;
  - the empty-string default was declined at first, then fixed after Codex flagged it too.
- **Test challenge** ([test_challenges_debrief.md](test_challenges_debrief.md)): the unit test was dropped, with its cases moved to API plus an E2E test.
- **Codex** ([codex_review.md](codex_review.md)): one P2 finding, the empty-string default. Fixed in `2552f2bddd8`.
- **Scope** ([scope_evaluation.md](scope_evaluation.md)): keep the scope as implemented, as its own small PR. The `_parameter_option_def_to_tool_form_str` editor crash belongs in a separate issue. #23992 already adds save-time validation of list defaults.
- **Screenshots** ([screenshot_debrief.md](screenshot_debrief.md)): captured; the run form shows Ex2 preselected.

## Still not acted on

- A list default on a `multiple: false` input marks several options selected. This isn't a regression; #23992 adds save-time validation for it.
- The `_parameter_option_def_to_tool_form_str` crash on non-string or label-less dict restrictions is in dev already and out of scope.

## Overlap with #23992 (`issue_21015_multiple_text_param`)

21015 is now open PR #23992, which includes `4736fd1d066` (the same `restrictOnConnections` test) and a `default_values` block in `restrict_options` that still uses the truthiness check. This branch will probably land second.

When rebasing:
- resolve the conflict to `_is_default_option`; keeping #23992's block would undo the empty-string fix;
- drop this branch's copy of `test_value_restriction_selects_multiple_text_list_default`.
