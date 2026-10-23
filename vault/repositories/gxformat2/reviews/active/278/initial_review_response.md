

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) was run via Opus 5.5 at medium effort.
- Review profile [generic_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_risk_assessment.md) was run via Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile generic_risk_assessment, Claude Opus 5.5 at low effort, reviewed commit a0adddbc0a025d31d1ec49dafb0975f94f5a4ade.

The one-way risk is that every Format2 dict lacking `class: GalaxyWorkflow`, top-level or an embedded `run:` subworkflow, now fails the core `normalized_format2()` load path rather than only lint/validation, so downstream releases (Galaxy import, planemo, IWC) that pin a new gxformat2 can reject workflows they accept today; the code is easy to revert but a released, consumer-visible rejection is not.

<details><summary>Risk Details</summary>

- `normalized/_format2.py` calls `GalaxyWorkflow.model_validate(workflow)` on plain dicts, so the now-required field breaks loading, conversion (`to_native`, `ensure_native`) and everything built on them, not just `gxwf validate`/lint. Confirmed locally: a minimal top-level dict without `class` raises `ValidationError` ("class Field required").
- Embedded subworkflows (`steps.<x>.run: {inputs, steps, ...}` without `class`) also fail now; confirmed locally on the reviewed commit. Hand-written or older-generated nested workflows commonly omit it.
- Galaxy's Format2 import path (`gxformat2` used via `python_to_workflow`/`ImportOptions`) and planemo `workflow_lint`/test runs would surface this as hard errors for users after a dependency bump; no deprecation warning period.
- `galaxy-tool-util-ts` mirrors the schema and fixtures; if its models still default `class`, Python and TS diverge on the same document until synced. The new `synthetic-missing-class.gxwf.yml` fixture and `Format2MissingClass` rule should propagate there.
- `NormalizedFormat2.class_` still defaults to `"GalaxyWorkflow"` (`normalized/_format2.py:204`), leaving a split: the raw schema requires it, the normalized model doesn't.
- The fix lives in a post-codegen string replace in `scripts/patch_generated_pydantic.py`; if the generator changes its emitted line, the patch silently no-ops and the requirement disappears on regeneration (the new negative fixture should catch it, if run).

</details>

<details><summary>Risk Review Advice</summary>

Decide whether requiring `class` belongs in the load path or only in validation/lint. If the intent is just "lint should flag it" (#186), consider keeping the load path lenient (or warning) and enforcing in strict/lint mode, and explicitly decide whether embedded `run:` subworkflows must carry `class`. Before release, check IWC and Galaxy's test workflows for Format2 files missing `class` and note the break in the changelog.

Reviewers should also confirm the codegen patch is asserted (fail if the target string isn't found) rather than silently skipped, and that `galaxy-tool-util-ts` gets the matching schema/fixture update.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/gxformat2/tree/pr_278_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_278_review_0`](https://github.com/jmchilton/gxformat2/tree/pr_278_review_0), cut from the reviewed commit `a0adddb`. It keeps the PR's root-level `class: GalaxyWorkflow` requirement and fixes three things around it. Inline `run:` subworkflows that omit `class` normalize and convert again, as they did on `main`, so `validate_format2` and `normalized_format2`/`to_native` agree; a new fixture pins this across all four operations. The `Format2MissingClass` rule and the new `validate_format2*` expectations now use the existing `synthetic-lint-no-class.gxwf.yml` instead of a near-duplicate fixture. `require_workflow_class` raises when the generator's `class_` line changes shape, instead of silently doing nothing. Full suite: 916 passed, 8 skipped.

- [`8381127`](https://github.com/jmchilton/gxformat2/commit/8381127) Normalize classless inline run: subworkflows as GalaxyWorkflow — `_normalize_step` injects `class: GalaxyWorkflow` into inline run dicts (an explicit class still wins) and adds `synthetic-inline-subworkflow-no-class.gxwf.yml` with `validate_format2`, `validate_format2_strict`, `normalized_format2` and `to_native` expectations.
- [`ac7feac`](https://github.com/jmchilton/gxformat2/commit/ac7feac) Reuse synthetic-lint-no-class fixture for Format2MissingClass — repoints the schema rule and both new expectations, deletes `synthetic-missing-class.gxwf.yml`, and adds `test_schema_rules_catalog.py` to the lint fixture's catalog entry.
- [`342bd03`](https://github.com/jmchilton/gxformat2/commit/342bd03) Fail loudly when require_workflow_class finds no target — raises `ValueError` when neither the defaulted nor the required `class_` line is present, and stays a no-op on modules that are already patched.

</details>

</details>

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

Inject the class for inline runs in `_normalize_step` (`{"class": "GalaxyWorkflow", **step.run}`), so only the root document has to declare it. That restores `main`'s behavior for nested runs and matches galaxy-tool-util-ts, which already injects the class into nested runs. A classless root document is still rejected. The other option is to reject classless nested runs at validation too, but the loose `run` union makes that a larger change. Pin whichever behavior is chosen with a fixture. Fixed in [`8381127`](https://github.com/jmchilton/gxformat2/commit/8381127).

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

Point `schema_rules.yml` and both new expectations at `synthetic-lint-no-class.gxwf.yml`, delete the new fixture and its catalog entry, and add `tests/test_schema_rules_catalog.py` to the existing fixture's catalog `tests`. `pr_278_review_0` (`ac7feac`) does this. Fixed in [`ac7feac`](https://github.com/jmchilton/gxformat2/commit/ac7feac).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: `require_workflow_class` silently does nothing if the generator output changes (implementation verified)

The patch is an exact-string `str.replace`. If schema-salad-plus-pydantic changes how it emits the `class_` line (kwarg order, quoting, an added description), `build_schema.sh` regenerates the modules with the default back in, and nothing fails until the `Format2MissingClass` negative runs.

Raise in `require_workflow_class` when neither the defaulted nor the already-required line is present, so already-patched modules stay a no-op. `pr_278_review_0` (`342bd03`) does this. A longer-term option is to stop defaulting the record's required `class` Literal in schema-salad-plus-pydantic's `codegen.py`, as #186 proposed. That would also cover the next field like this one without adding more replace patterns. Fixed in [`342bd03`](https://github.com/jmchilton/gxformat2/commit/342bd03).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>
