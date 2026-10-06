# issue_23896_rename_input_segments — implementation debrief

Fixes [galaxyproject/galaxy#23896](https://github.com/galaxyproject/galaxy/issues/23896). Two reviewed commits, latest `3fc4c570bb9` on `jmchilton/issue_23896_rename_input_segments`, based on `origin/dev` at `bd282b3900b`. Pushed to the fork; no PR opened. Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_23896_rename_input_segments` (clean).

## Implementation

`RenameDatasetAction._gen_new_name` now falls back only when the recorded input path ends with `|` followed by the requested reference. An unqualified `#{input}` therefore matches the final path segment exactly instead of also matching `other_input`. This fixes cases such as velocyto's `#{s}` choosing `main|barcodes` before `main|s`.

The same helper serves ordinary job outputs and mapped collection outputs. Exact matches still take precedence; qualified dot references, repeat indices, segment-aligned partial qualified paths, and rename operations retain their behavior. Ambiguous references still choose the first matching association, and missing references still become empty strings. No warnings, hard failures, or profile gates were added; the issue explicitly separates those compatibility decisions from this correction.

## Validation

- Red before the fix: 5 of the 10 new helper cases failed on incorrect substring matches. The ordinary workflow API regression also failed with the input name duplicated in the output name.
- `test/unit/job_execution`: **24 passed**, including 10 new parameterized rename-reference cases covering suffix collisions, one-character names, absence, ambiguity, exact-match precedence, dot qualification, partial qualification, repeats, and operations.
- Existing workflow rename API tests: **10 passed** against the fix. These include collection outputs, mapped collections, multiple outputs, resuming jobs, recursive references, repeats, and legacy/qualified conditional inputs.
- Final new workflow API tests: **2 passed**. They reuse `mapper2`; the mapped test checks both the output collection name and the individual job output name.
- Pre-commit checks passed (Black, Ruff, Flake8, Prettier and applicable repository hygiene checks); isort check and `git diff --check` passed.
- `make validate` in galaxy-brain: **122 files, 0 errors, 15 existing advisory warnings**. Agent handoff documents are excluded from frontmatter validation.

API command (existing tests: `-k test_run_rename`; final new tests: `-k test_run_rename_rejects_partial_input_segments`):

```sh
PATH=/Users/jxc755/projects/repositories/galaxy/.venv/bin:$PATH \
VIRTUAL_ENV=/Users/jxc755/projects/repositories/galaxy/.venv \
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
./run_tests.sh --skip-common-startup -api \
  lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi -- \
  -k test_run_rename_rejects_partial_input_segments --tb=short
```

Logs: `/tmp/galaxy_23896_unit_green.log`, `/tmp/galaxy_23896_api_green.log` (10 existing passes; first draft of new templates failed for the separate parser issue below), `/tmp/galaxy_23896_api_final.log` (2 final passes). Final API HTML report: `run_api_tests.html` in the worktree.

## Review and deferred work

Independent subagent review used `_shared/REVIEW_FOCUS.md` and checked ordinary/mapped parity, backward compatibility, and regression coverage. No actionable findings remained. The reviewer also rechecked the final API template order and confirmed both assertions still fail under the original suffix-matching behavior.

The reviewer recommended deferring a separate existing placeholder cursor bug and recording it here. Accepted: repairing the parser would expand this issue's explicitly narrow matching change. Reproducer: with template `#{missing}#{input} suffix` and inputs `{"input": "reads.fastq"}`, the first empty replacement moves the second token before `start_pos`, so the helper returns the unresolved `#{input} suffix`. The final regression template places the valid reference first (`#{fastq_input1 | basename}#{input1} suffix`), avoiding that independent bug while still failing on the original partial-segment match. No separate issue was filed.

## Branch-agent handoff

Latest head is `3fc4c570bb9`; fork CI needs checking on that head. Ready for branch-agent CI monitoring and polish. Registered under `branches_implemented_needs_ci`. No implementation decisions outstanding; broader ambiguity/missing-reference reporting and the cursor bug remain separate follow-ups.

## Follow-up: explicit workflow connections

At the user's request, `3fc4c570bb9` replaces the two `$link` leaves in the new regression fixture with `in:` connections: `fastq_input|fastq_input1: fastq_input` and `reference: fasta_input`. The conditional selector stays in `state`. Both workflow regression tests passed again (43.40 seconds), pre-commit checks passed, and independent review found no actionable issues. Log: `/tmp/galaxy_23896_api_in_syntax.log`.
