# Normal review: test removal + PR description

Reviewed head `e36468c480a` and `pr_description.md`. The code is fine: after dropping `test_subworkflow_expression_json_parameter_replacement`, the rest of `test_workflow_progress.py` still uses all its imports, YAML and helpers. I fixed every PR-description finding except two, listed below.

Acted on (PR description):
- **Forward-merge claim was wrong.** It conflicts in 4 files against both `release_26.2` and `dev`, which I confirmed with `git merge-tree`. 26.2 moved the test-format models to `_models.py`, there are `X | None` typing clashes, and the schema needs regenerating. Rewritten, and index.md fixed too.
- **The "Why… 26.1" section now argues for 26.1 specifically.** A key added only on dev can't be used by a 26.1 fix's tests. It also cites `writing_tests.md` and describes the API test setup the alt has. I didn't use the reviewer's line counts: the real count is 108 framework lines vs 127 API lines, which isn't a persuasive gap.
- **The "red on base" wording now says `run.py` reverted to 26.1.** Plain 26.1 ignores collection `metadata`, so the tests there would pass without checking anything.
- **The "strict" claim is narrowed to test-format validation.** At run time, unknown keys are ignored.
- **Planemo caveat added:** planemo only checks collection outputs that declare `element_tests`.
- **The readiness sentence now names the real path** (`execute` → `compute_collection_info` → `replacement_for_input`) and notes that the pre-read is the only new gate.
- Also fixed:
  - the table intro, which mixed the issue's workflow with the variants;
  - the alt description: its collection cases are API tests;
  - the checklist, which now says "rename actions", since tag PJAs don't substitute `${}`.
- `test_challenges_debrief.md` contradicted itself about the removed test; fixed.

Not acted on:
- **Optional inlining** of `_setup_subworkflow_parameter`/`_recovered_workflow_progress`, which now have one caller each. Not done: it's a preference, and the helpers read fine.
- **Heading wording "Why adding a test feature to 26.1".** John asked for this wording. The reviewer suggests "Why add a test-format feature to 26.1?". This is a question for John.

<details>

Checked and fine:
- The pass-through in `set_outputs_for_input` and the pre-read guard.
- The 60s grace period.
- The "could not be read" and `verify_collection` error wording.
- `#{}` is expanded before `${}`.
- `DeleteIntermediatesAction` skips active invocations.
- Planemo and Galaxy runners overwrite a top-level output `name`.
- The 25.1/26.0 base claims.
- The issue facts.
- The alt and head are pushed.
- The schema diff is minimal.
- The listed tests exist and assert what the description says.
- `test_workflows.py` is a net-zero diff.
- No IWC tests use collection `metadata`.
- The check summaries match their debriefs, and no agent is cited as evidence.

</details>
