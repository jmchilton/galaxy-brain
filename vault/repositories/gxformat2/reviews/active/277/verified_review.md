### P3 1: `_normalize_outputs` annotation still carries the dropped fallback (implementation verified)

`gxformat2/normalized/_format2.py` still declares `outputs: ... | dict[str, Any]` on `_normalize_outputs`, which no longer matches `GalaxyWorkflow.outputs` now that `Process.yml` drops the fallback.

Trim the annotation to the schema's type:

```diff
 def _normalize_outputs(
-    outputs: list[WorkflowOutputParameter] | dict[str, WorkflowOutputParameter | str] | dict[str, Any],
+    outputs: list[WorkflowOutputParameter] | dict[str, WorkflowOutputParameter | str],
 ) -> list[WorkflowOutputParameter]:
```

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Lax validation now rejects null outputs, untested and contrary to the PR description (implementation verified)

`Process.outputs`' `pydantic:type` is shared by the lax and strict models, so dropping `dict[str, Any]` also narrows lax validation: `outputs: {out: null}` (and other non-dict, non-string values) passed `validate_format2` on `main` and now fails. Rejecting it is right, since a null output has no source and never produced a working output, but the PR body says "Lax validation is unchanged" and no test pins the new behavior.

Add a `synthetic-null-output.gxwf.yml` fixture with lax and strict `validate_format2` `expect_error: true` expectations, and adjust the PR description (or HISTORY) to note the lax tightening.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md), [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) and [generic_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_risk_assessment.md) via Opus 5.5 at medium, medium and low effort. Verified via Opus 5.5 at medium effort: the new lax expectation fails against `main`'s lax model and passes at the PR head.

</details>
