# Initial review: gxformat2#278 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5
- Effort: medium
- Reviewed commit: `a0adddbc0a025d31d1ec49dafb0975f94f5a4ade`

## Verdict

Approve, nits optional. Fix is correct and small: `class_` loses its default in all four Format2 modules, the regen patch keeps it that way, and `Format2MissingClass` comes back into the schema-rule catalog with a negative fixture. Full suite passes locally (912 passed, 8 skipped). No real bugs found. Native and creator `class` fields are untouched, as the description says.

Cross-repo: galaxy-tool-util-ts already requires the field (`class: Schema.Literal("GalaxyWorkflow")` in `packages/schema/src/workflow/raw/gxformat2.effect.ts` and `gxformat2-draft.effect.ts`). Its Effect codegen never added the Literal default. So no TS code change is needed. After merge, the next `sync-manifest` run brings over `schema_rules.yml` and the new fixture, and TS `schema-rules-catalog.test.ts` should pass on them as they are.

## Findings

### P3 1: New fixture duplicates existing `synthetic-lint-no-class.gxwf.yml`

`gxformat2/examples/format2/synthetic-lint-no-class.gxwf.yml` is already a classless copy of the same cat1 workflow, used by `test_lint_format2_missing_class` in `expectations/lint_format2.yml`. The new `synthetic-missing-class.gxwf.yml` differs from it only in its label and input/output names. Using the existing fixture as the `Format2MissingClass` negative and in the two new `validate_format2*` expectations means one fixture fewer for the TS repo to sync. Add the `test_schema_rules_catalog.py` / `test_interop_tests.py` entries to its catalog record. Optionally rename it to drop the `lint-` prefix, since it would now serve both lint and schema.

### P3 2: Fix the patched behavior upstream instead of with a string-replace patch

`require_workflow_class` uses an exact-string `str.replace`. If schema-salad-plus-pydantic changes its output format (kwarg order, quoting, a description added), the patch silently does nothing. The new `validate_format2*` expectations would catch that on regeneration, so this is a nit, not a hole.

The default comes from `codegen.py` in schema-salad-plus-pydantic ("Literal fields (discriminators) get a default of the first value"). That generator is jmchilton's, and #186 itself proposed fixing it there. A reusable fix would be either of these:

- A `pydantic:` field annotation in `schema/v19_09/workflow.yml` that suppresses the default.
- Not defaulting a single-symbol Literal when the salad field is non-optional and is the record's `class`.

Either one also covers the next case like this one (e.g. the `SubworkflowMissingSteps` audit in #186) without adding more replace patterns. Fine as a follow-up; the patch script is the existing mechanism for this kind of fix.

### P3 3: Classless inline subworkflows now become untyped dicts instead of being rejected

`WorkflowStep.run` is `GalaxyWorkflow | str | dict[str, Any] | None`. With `class_` required, a valid inline `run:` with no `class` no longer validates as `GalaxyWorkflow`. Pydantic's smart union drops it to the `dict[str, Any]` arm, so it validates as an unchecked dict under both lax and strict. Before this PR it validated as `GalaxyWorkflow`. A root document without `class` is now rejected, but a nested one is still accepted. Normalization is unaffected: `_normalize_step` sends non-import, non-UserTool dicts to `normalized_format2` anyway.

This is mostly pre-existing. Even before the PR, an inline subworkflow with an invalid field already fell through to the dict arm, so nested validation was never strict. Optional follow-up: limit the dict arm to `@import` references, or add a classless nested negative so the gap is documented.

<details><summary>Evidence</summary>

Strict model, root has `class: GalaxyWorkflow`, step `s` has inline `run: {inputs, outputs, steps}` with no `class`:

- base (`origin/main` `gxformat2_strict.py`): `type(steps["s"].run)` is `GalaxyWorkflow`
- PR: `type(steps["s"].run)` is `dict`
- both: an inline subworkflow with a bogus step field validates, as `dict`

</details>
