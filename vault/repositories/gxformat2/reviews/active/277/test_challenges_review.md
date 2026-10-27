# Test challenges review — gxformat2#277

- Profile: [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md)
- Model: Opus 5.5
- Effort: medium
- Reviewed commit: 177a083
- Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

Verdict: tests are appropriate and minimal. One declarative fixture, wired into existing lax/strict expectations and the `SchemaStrictExtraField` rule catalog. No unit tests to challenge, no mocks. Red-to-green confirmed: on `origin/main` the fixture passes strict validation, strict normalization and strict `to_native`; at 177a083 all three reject it on `output_source`. Focused suites pass (129).

## P3 1: Lax tightening is untested and contradicts "Lax validation is unchanged"

`Process.outputs`' `pydantic:type` is shared by lax and strict models, so dropping `dict[str, Any]` also narrows lax. On main, `validate_format2` accepted `outputs: {out: null}` and `outputs: {out: [1]}`; at 177a083 both fail, and lax `normalized_format2` now raises on `{out: null}`. Rejecting these is fine — nothing meaningful could rely on them — but the PR body says lax is unchanged and no test pins the new behavior.

Fix: add a lax expectation (e.g. `synthetic-null-output.gxwf.yml` with `validate_format2` + `expect_error: true`), or at least correct the PR description / HISTORY entry.
