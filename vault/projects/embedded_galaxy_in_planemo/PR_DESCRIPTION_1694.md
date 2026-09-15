Fixes #1694.

## Summary

`workflow_lint --iwc` already checks that `CHANGELOG.md` contains a version heading and that the version agrees with the workflow's `release` field. It does not currently validate the date required by the IWC reviewer checklist.

This change requires the newest changelog version heading to use the canonical form:

```text
## [version] - YYYY-MM-DD
```

The check validates both the heading structure and the calendar date, so a value such as `2026-02-30` does not pass based on its shape alone. A missing separator, missing date, or non-date value is reported as an error.

The check remains scoped to the IWC lint profile. Running `workflow_lint` without `--iwc` retains its existing behavior.

## Compatibility validation

The rule was checked against an up-to-date `galaxyproject/iwc` checkout at `b80bc9278`.

- The 12 latest first-parent workflow-update merges all pass when their changelog headings are evaluated at the merge commit. These cover PRs #1360, #1361, #1362, #1323, #1340, #1338, #1341, #1352, #1353, #1354, #1355, and #1351.
- Those updates cover nine unique workflow repositories; all nine current changelogs pass the exact validator introduced here.
- Across all 108 current IWC changelogs, 106 pass. The only failures are the two previously identified headings that already contain valid ISO dates but omit the canonical ` - ` separator:
  - `workflows/bacterial_genomics/amr_gene_detection/CHANGELOG.md`: `## [1.1.8] 2026-03-15`
  - `workflows/bacterial_genomics/bacterial_genome_annotation/CHANGELOG.md`: `## [1.2.0] 2025-12-04`

IWC pull-request CI lints only changed workflow repositories, so this check will not break unrelated updates. The weekly global lint will report those two existing formatting errors once it consumes a Planemo release containing this change; they should be corrected before or alongside adoption.

## Tests

The command tests cover missing dates, missing separators, non-date values, impossible calendar dates, the canonical valid form, and the unchanged non-IWC behavior. The existing release-mismatch fixture now uses the canonical heading so it continues to isolate version/release disagreement.

```text
pytest -q tests/test_cmd_workflow_lint.py tests/test_workflow_lint.py
24 passed
```
