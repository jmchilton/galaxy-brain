# Codex review, round 2 (2026-10-27)

Run at HEAD `886d8ffd327`, after the rescope that added metadata_source linting. Codex returned three findings and I acted on none:
- Two are the same open policy items as round 1.
- One proposes scope that already existed before this branch (the reference linters were XML-only on dev).

## Not acted on
- **#1 Shadowed qualified alias picks the wrong dataset (P1).** Codex reports a P1, but this is round 1's #2 in another form. When the qualified target is itself another input's legacy alias, `resolve()` keeps the reference as written. The runtime then behaves the same as dev: a job-created `input1` key (from a `multiple` input named `input`) can shadow it. Rewriting the reference would point it at the wrong input instead. Dev behaves the same way. **Left for John:** should profile 26.2+ fail to load on a shadowed reference?
- **#2 YAML tools skip the reference linters.** `OutputsFormatSourceReference` and `OutputsStructuredLikeReference` were XML-only on dev as well, and `OutputsMetadataSourceReference` follows them. Tool loading does validate YAML tools, so a bad YAML reference still fails at 26.2 load and is dropped with a warning below 26.2. Porting the output linters to YAML would expand scope.
- **#3 any() over mixed-type conditional cases.** This is the same as round 1's #3. I kept `any()`, as the scope evaluation recommended.

<details><summary>Full findings</summary>

1. **P1, certain** — `output_references.py:170`.
   - Setup: a multiple data input named `input`, a conditional whose flat `input1` is shadowed by a nested `cond|inner|input1`, and `format_source="input1"`.
   - Result: the reference stays `input1`. Job creation adds `input1` for the first item of `input`, so the output inherits that item's format.
   - Triage: NEEDS-DECISION. Same behavior as dev.
2. **P2, certain** — `linters/output.py:296`.
   - Setup: a YAML tool with an undeclared format_source.
   - Result: the linter emits no error.
   - Triage: REFUTED as a regression. The linters were XML-only before this branch, and load-time validation covers YAML.
3. **P2, likely** — `output_references.py:72`.
   - Setup: conditional cases declaring `source` as data in one case and as select in another.
   - Result: passes 26.2 validation.
   - Triage: NEEDS-DECISION. Kept `any()`.

Coverage notes: reviewed the diff and the surrounding code, and didn't run tests.
</details>
