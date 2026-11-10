# Implementation debrief — `issue_292_frame_labels`

Base `galaxyproject/main` `4e245c2`; head `c0e5f73` on the `jmchilton` fork.

## Root cause

Confirmed the issue's: `_build_native_comments` sent each string `contains_steps` entry through `_ConversionContext.step_id`, which falls back to `int(label)` for anything not in the label map. Lint never looked at comments.

## Change

- `NormalizedFormat2.unresolved_frame_references` (cached) resolves frame entries against the labels conversion registers: step `label or id`, input `id`; comment labels for `contains_comments`. Ints and ASCII all-digit `contains_steps` strings pass through as indices, as before.
- Lint: `FrameReferenceNotFound` (error, structural), one per entry, pointer `/comments/<i>/<field>/<j>`. `FrameIsEmpty` (warning, best-practices) for a frame with neither steps nor comments.
- Conversion raises `ValueError` with the same message before building comments; the old in-loop `contains_comments` raise is subsumed (message still contains "unknown comment label").
- Declarative fixtures/expectations for the TS port; imperative tests pin the conversion message, including inside a subworkflow.

## Checks

- Red first: 4 lint cases failed on base; conversion cases "passed" only because base crashed.
- `pytest tests/` 970 passed; with `GXFORMAT2_TEST_IWC_DIRECTORY` 2009 passed. ruff, flake8, black, mypy, pyrefly clean.
- IWC sweep of the new rules: 135 frames, 0 `FrameReferenceNotFound`, 4 `FrameIsEmpty` (frames with `child_steps: null` in real Galaxy exports).

## Out of scope

- `validate_format2` unchanged: cross-references (e.g. dangling `outputSource`) are lint's job.
- Out-of-range integer entries, native `child_steps` lint, mermaid's handling of unknown refs.
