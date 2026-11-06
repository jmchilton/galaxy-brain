(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) was run via Opus 5.5 at medium effort.
- Review profile [generic_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_risk_assessment.md) was run via Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: generic_risk_assessment · Model: Opus 5.5 · Effort: low · Reviewed commit: 177a083

Risks are low and mostly two-way: the PR tightens the generated `outputs` type, but it also changes lax validation, so workflows that used to pass may now fail.

<details><summary>Risk Details</summary>

- Dropping `| dict[str, Any]` from `outputs` also affects the lax models (`gxformat2.py`, `gxformat2_draft.py`), not just the strict ones. An output mapped to `null` (e.g. `outputs: {out: }`) used to pass lax validation and is now rejected in both lax and strict modes. Verified locally. Any other non-dict, non-string value is rejected the same way.
- Unknown keys on outputs still pass lax validation, because lax `WorkflowOutputParameter` keeps `extra="allow"`. Only strict validation rejects them, as intended.
- Downstream consumers that validate against these models (gxwf-web, Galaxy import paths, and TS tooling if it syncs the schema) may now reject workflows that were previously accepted. The change only removes accepted inputs and has no data migration, so reverting it is easy.
- The generated models and `schema/v19_09/Process.yml` change together. Later regenerations must keep the `pydantic:type` override, or the change will be silently undone.

</details>

<details><summary>Risk Review Advice</summary>

Decide whether the lax behavior change is wanted. If lax mode should stay permissive, only the strict models should drop `dict[str, Any]`. If not, add a lax test showing that `null` and other bare values are now rejected on purpose. Also check whether real workflows (IWC, the Galaxy test corpus) ever use null or empty outputs entries.

Check whether galaxy-tool-util-ts ships a matching effect schema for `outputs`, so Python and TS validation stay in line.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/gxformat2/tree/pr_277_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_277_review_0`](https://github.com/jmchilton/gxformat2/tree/pr_277_review_0) (from reviewed commit `177a083`) fixes both verified P3 findings: it trims the stale `dict[str, Any]` arm from the `_normalize_outputs` annotation, and pins the new lax behavior with a null-output fixture that both lax and strict validation must reject. Red-to-green confirmed for the lax expectation against `main`'s lax model; full suite passes (945 passed, 8 skipped), mypy and pyrefly clean.

- [`f5a27da`](https://github.com/jmchilton/gxformat2/commit/f5a27da) Drop stale dict[str, Any] from _normalize_outputs annotation — matches the parameter type to `GalaxyWorkflow.outputs` after the `Process.yml` change.
- [`c08990c`](https://github.com/jmchilton/gxformat2/commit/c08990c) Pin lax rejection of null workflow outputs — adds `format2/synthetic-null-output.gxwf.yml`, its catalog entry, and lax/strict `expect_error` expectations in `validate_format2.yml`.

</details>

</details>

### P3 1: `_normalize_outputs` annotation still carries the dropped fallback (implementation verified)

`gxformat2/normalized/_format2.py` still declares `outputs: ... | dict[str, Any]` on `_normalize_outputs`, which no longer matches `GalaxyWorkflow.outputs` now that `Process.yml` drops the fallback.

Trim the annotation to the schema's type:

```diff
 def _normalize_outputs(
-    outputs: list[WorkflowOutputParameter] | dict[str, WorkflowOutputParameter | str] | dict[str, Any],
+    outputs: list[WorkflowOutputParameter] | dict[str, WorkflowOutputParameter | str],
 ) -> list[WorkflowOutputParameter]:
```

Fixed on the review branch in [`f5a27da`](https://github.com/jmchilton/gxformat2/commit/f5a27da).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Lax validation now rejects null outputs, untested and contrary to the PR description (implementation verified)

`Process.outputs`' `pydantic:type` is shared by the lax and strict models, so dropping `dict[str, Any]` also narrows lax validation: `outputs: {out: null}` (and other non-dict, non-string values) passed `validate_format2` on `main` and now fails. Rejecting it is right, since a null output has no source and never produced a working output, but the PR body says "Lax validation is unchanged" and no test pins the new behavior.

Add a `synthetic-null-output.gxwf.yml` fixture with lax and strict `validate_format2` `expect_error: true` expectations, and adjust the PR description (or HISTORY) to note the lax tightening.

Fixed on the review branch in [`c08990c`](https://github.com/jmchilton/gxformat2/commit/c08990c).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md), [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) and [generic_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_risk_assessment.md) via Opus 5.5 at medium, medium and low effort. Verified via Opus 5.5 at medium effort: the new lax expectation fails against `main`'s lax model and passes at the PR head.

</details>
