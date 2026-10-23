# Test challenges review — gxformat2#278

- Profile: [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md)
- Model: Opus 5.5
- Effort: medium
- Reviewed commit: a0adddbc0a025d31d1ec49dafb0975f94f5a4ade
- Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

Verdict: tests fit the change. They're declarative (fixture + schema rule + `validate_format2` expectations), follow the `Format2MissingSteps` precedent, nothing to drop or rewrite. Full suite passes (912 passed, 8 skipped). One real gap: nested inline subworkflows. The rest are cheap pins.

### P2 1: Classless inline `run:` subworkflow: validate passes, normalize/convert now fail

On `origin/main` an inline subworkflow `run:` dict without `class` was accepted everywhere. On this PR, `validate_format2` and `validate_format2_strict` still accept it (the `WorkflowStep.run` union `GalaxyWorkflow | str | dict[str, Any] | None` falls through to `dict[str, Any]`), but `normalized_format2` and `to_native` now raise `ValidationError for GalaxyWorkflow`. Validation and conversion disagree, and no fixture covers this. No in-repo fixture uses a classless inline `run:`, so impact is probably small, but Galaxy's import goes through this conversion path.

Suggested fix: add `format2/synthetic-missing-class-inline-subworkflow.gxwf.yml` (outer has `class`, inner `run:` lacks it) with expectations across `validate_format2`, `validate_format2_strict`, `normalized_format2`, `to_native` that pin one consistent behavior. Rejecting at validation fits the PR's intent best.

### P3 1: Pin lint parity on the new fixture

`lint_format2` already reports `expected to find key [class] but absent` for `synthetic-missing-class.gxwf.yml`, but no expectation checks it. One `lint_format2` case with `path: [errors]`, `value_any_contains: "class"` documents lint/validate parity, and galaxy-tool-util-ts picks it up through `sync-workflow-expectations`.

### P3 2: Make `require_workflow_class()` fail loudly when its target is missing

`text.replace(...)` does nothing if the generator's output changes. The schema-rule negative fixture would catch the regression later, but raising in `scripts/patch_generated_pydantic.py` when a Format2 module lacks the expected line puts the failure at build time. Prefer this over a unit test of the string replace.

### P3 3: Pin draft-validator behavior for a classless doc

`validate_format2_draft[_strict]` accept `synthetic-missing-class.gxwf.yml` (the `GalaxyWorkflowDraft.class_` default is untouched), so a doc that `validate_format2` rejects still validates as a draft. That may be intended. Add a `validate_format2_draft` expectation either way so the behavior is a decision, not an accident.

Cross-language note: galaxy-tool-util-ts Effect schemas already require `class: "GalaxyWorkflow"` (`packages/schema/src/workflow/raw/gxformat2.effect.ts`), so syncing these fixtures/expectations/schema rules downstream should need no TS changes (not run).
