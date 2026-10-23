### P2 1: Classless inline `run:` subworkflows pass validation but now fail normalization and conversion (implementation verified)

Now that `GalaxyWorkflow.class_` is required, an inline `run:` dict without `class` no longer matches the `GalaxyWorkflow` arm of `WorkflowStep.run` (`GalaxyWorkflow | str | dict[str, Any] | None`). It falls through to `dict[str, Any]`, so `validate_format2` and `validate_format2_strict` still accept it. `_normalize_step` then hands that dict to `normalized_format2`, which raises `Field required` for `class`. On `main` all four operations accepted the document, so this is a new break that the PR's root-level scope doesn't mention, and validation and conversion now disagree on it. gxformat2's own export paths (`from_galaxy_native`, `to_format2`) emit `class` on nested runs, so only hand-written nested workflows are affected. Those still reach Galaxy's import through `python_to_workflow`.

<details><summary>Evidence</summary>

Outer document has `class: GalaxyWorkflow`; step `s` has an inline `run: {inputs, outputs, steps}` with no `class`.

| operation | `main` (`9f8fb36`) | PR (`a0adddb`) |
|---|---|---|
| `GalaxyWorkflow` lax, `type(run)` | `GalaxyWorkflow` | `dict` |
| `GalaxyWorkflow` strict, `type(run)` | `GalaxyWorkflow` | `dict` |
| `normalized_format2` | ok | `ValidationError: class Field required` |
| `python_to_workflow` (converter entry) | ok | `ValidationError: class Field required` |
| `to_native` | ok | `ValidationError: class Field required` |

</details>

Inject the class for inline runs in `_normalize_step` (`{"class": "GalaxyWorkflow", **step.run}`), so only the root document has to declare it. That restores `main`'s behavior for nested runs and matches galaxy-tool-util-ts, which already injects the class into nested runs. A classless root document is still rejected. The other option is to reject classless nested runs at validation too, but the loose `run` union makes that a larger change. Pin whichever behavior is chosen with a fixture.

<details><summary>Details</summary>

`pr_278_review_0` (`8381127`) makes the one-line change and adds `synthetic-inline-subworkflow-no-class.gxwf.yml`, with `validate_format2`, `validate_format2_strict`, `normalized_format2` (nested step `tool_id` and connection) and `to_native` (nested step `tool_id`) expectations. These failed on the PR head and pass on the branch, and `python_to_workflow` converts the document again. Every Format2 operation in `OPERATIONS` succeeds on the new fixture, apart from the ones that also fail on classed controls (`to_format2` on Format2 input, the draft validators). Every one except the draft/lint/TRS helpers still rejects the root-classless fixture. The same expectations also pass in galaxy-tool-util-ts when synced.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Opus 5.5 at medium effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 2: galaxy-tool-util-ts injects the missing `class`, so syncing this PR's rule and expectations fails its tests (implementation verified)

The TS Effect schema already declares `class: Schema.Literal("GalaxyWorkflow")` as required. However, `validateFormat2` and `validateFormat2Strict` in `packages/schema/src/workflow/validators.ts` wrap the input in `withClass(wf, "GalaxyWorkflow")`. That helper injects `class` at the root and in nested runs, and its comment says it exists to mirror Python's old pydantic default. Once `schema_rules.yml` and the `validate_format2` expectations sync, `schema-rules-catalog.test.ts` (the `Format2MissingClass` negative must throw) and the two `test_missing_class_rejected_format2*` cases in `declarative-normalized.test.ts` will fail. Until TS changes, TS `gxwf validate` (`packages/cli/src/commands/validate-workflow.ts`, which also calls `withClass`) keeps accepting documents that Python now rejects. This PR needs no change for this; it needs a matching galaxy-tool-util-ts PR before or alongside the next sync.

<details><summary>Evidence</summary>

Scratch worktree of galaxy-tool-util-ts `origin/main` (`a3abfa2`), with this PR's `schema_rules.yml` and `pr_278_review_0`'s expectations/fixture copied in:

- `vitest run test/schema-rules-catalog.test.ts`: `Format2MissingClass > negative synthetic-lint-no-class.gxwf.yml matches scope=both` fails with "expected [Function] to throw".
- `vitest run test/declarative-normalized.test.ts`: `test_missing_class_rejected_format2` and `test_missing_class_rejected_format2_strict` fail; the nested `test_inline_subworkflow_no_class` cases pass.

</details>

In galaxy-tool-util-ts, stop injecting `class` at the root for Format2 validators while still injecting it into nested `run:` dicts, and do the same in the CLI validate commands. Native injection can stay.

<details><summary>Details</summary>

A scratch version of `validateFormat2`/`validateFormat2Strict` that removes the injected root `class` when the input had none made both test files pass. The full `packages/schema` suite also passed (5124 passed). Not committed anywhere.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_risk_assessment.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: New fixture duplicates `synthetic-lint-no-class.gxwf.yml` (implementation verified)

`synthetic-missing-class.gxwf.yml` is the same classless cat1 workflow as the existing `synthetic-lint-no-class.gxwf.yml`. The only differences are a `label` and the input/output names. The existing fixture already backs `test_lint_format2_missing_class` and is already synced to galaxy-tool-util-ts. Reusing it for the `Format2MissingClass` negative and the new `validate_format2*` expectations pins lint and validation parity on one document, and leaves one fewer file to sync.

Point `schema_rules.yml` and both new expectations at `synthetic-lint-no-class.gxwf.yml`, delete the new fixture and its catalog entry, and add `tests/test_schema_rules_catalog.py` to the existing fixture's catalog `tests`. `pr_278_review_0` (`ac7feac`) does this.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: `require_workflow_class` silently does nothing if the generator output changes (implementation verified)

The patch is an exact-string `str.replace`. If schema-salad-plus-pydantic changes how it emits the `class_` line (kwarg order, quoting, an added description), `build_schema.sh` regenerates the modules with the default back in, and nothing fails until the `Format2MissingClass` negative runs.

Raise in `require_workflow_class` when neither the defaulted nor the already-required line is present, so already-patched modules stay a no-op. `pr_278_review_0` (`342bd03`) does this. A longer-term option is to stop defaulting the record's required `class` Literal in schema-salad-plus-pydantic's `codegen.py`, as #186 proposed. That would also cover the next field like this one without adding more replace patterns.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>
