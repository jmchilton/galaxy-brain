Run via Claude Opus 5.5 at low effort.

# frame_index_range implementation debrief

Head `baaac08` (fix on top of `2971bc1`) on `origin/main` `d00e1f7`.

- `NormalizedFormat2.unresolved_frame_references` now range-checks int entries (both fields) and all-digit `contains_steps` strings. Step index range `0 <= i < len(inputs)+len(steps)` (native ids: inputs then steps, `_build_native_workflow`); comment range `0 <= i < len(comments)`. Bools skipped. Digit strings in `contains_comments` remain labels (unchanged). Same NamedTuple, `FrameReferenceNotFound` rule, conversion `ValueError`; unused `_is_step_reference` removed.
- Messages: `Frame 'X' references out-of-range step index '999' in contains_steps`, `... out-of-range comment index '1' in contains_comments`.
- Fixture `synthetic-frame-index-out-of-range.gxwf.yml` (contains_steps `[1, "2", 999, -1]`, contains_comments `[1]`); expectations `test_lint_frame_index_out_of_range` (4 errors, json pointers), `test_to_native_frame_index_out_of_range`; test `test_format2_to_native_frame_index_out_of_range`. All 3 red on base.
- Gates: `pytest tests/` 980 passed; with IWC 2020 passed; ruff, flake8, black, mypy, pyrefly clean.
- IWC sweep: 160 frames, 0 `FrameReferenceNotFound`.
- Review fix (`baaac08`): in the str branch, `ref in known_labels` now resolves before the digit-index range check, matching conversion's labels-first `_ConversionContext.step_id`. Fixture `synthetic-frame-digit-label.gxwf.yml` (step label `"7"`, contains_steps `["7", 0]`); expectations `test_lint_frame_digit_label` (0 errors), `test_to_native_frame_digit_label` (child_steps `[1, 0]`); test `test_format2_to_native_frame_digit_label`. All 3 red before fix. Positional checks tuple replaced by `_FrameRefCheck` NamedTuple with its own `index_noun`. Gates: `pytest tests/` 983 passed; ruff, flake8, black, mypy, pyrefly clean.
