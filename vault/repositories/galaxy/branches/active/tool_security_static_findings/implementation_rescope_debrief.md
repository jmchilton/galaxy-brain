# Re-scope debrief

```
created .../tool_security_static_findings/differential-review/snapshots/20261126T034325Z-revision-79f7da403127.json
  revision @ 79f7da403127 vs origin/dev (merge-base ce63095e7a8a)
  since 20261126T021109Z-implementation-e9e1d8eb1a59:
    commits: 85 same, 0 rebased, 0 changed, 14 new, 0 dropped
```

The first scope evaluation (now `earlier_drafts/1/scope_evaluation.md`) recommended a modest expansion, limited to John-authored code around the analyser. mvdbeek's analyser stays as ported, and its output stays byte-identical. The original scope is kept as `tool_security_static_findings_alt_original_scope` at `92320a751cb`.

## What changed

- **`6b5beb2924b`: pins of the CLI's text and JSON output.** Written against the old CLI.
- **`7badc4ede48`: `Rule` catalog** (`rules.py`, 34 ids with descriptions).
  - Spec rules are typed, so a typo fails to load.
  - A generated "Rules" docs section.
  - New synthetic spec case `server_python_command`, for the only vulnerability rule that had none.
  - A test that every emitted rule is catalogued.
- **`9922001d901`: pure `classify(report)`.** Ported from the source branch's `_no_plain_value`, with `Co-authored-by` mvdbeek.
  - It returns the `Uncheckable` codes that need no job values, plus the classified unchecked locations.
  - Spec cases can carry an exact `codes` expectation; 19 do.
  - A generated docs section.
- **CLI** (`4daf7ef43ca`, `b885cc7e115`, `b98e32ca591`, `79f7da40312`):
  - It takes directories, but reviews only XML tools. Other files get a "not reviewed" entry.
  - A tool that fails to load or review gets an error entry and the run continues.
  - Output shows tool id and version, plus the additive JSON keys `tool_version`, `codes` and `uncheckable_locations`.
  - New `--fail-on <severity|uncheckable|unchecked>`.
  - A failed or empty run exits 1.
- **Catalog and spec checks tightened** (`091620b9c1a`, `0e21279e7f6`).

## Review

`subagents/review_rescope.md` found two bugs, both fixed: the YAML/CWL directory walk, and the classified unchecked locations not being surfaced. Its two decisions were settled:
- added `--fail-on unchecked`;
- documented that `--fail-on <severity>` counts capability findings and ignores `--judge`.

Nits 2–9 are fixed. Nit 1 (the "Baseline tests" prefix) waits for the history decision.

## Decisions for John

- **Non-XML tools exit 1.** A run over a mixed directory fails, the same as a load error.
- **`unchecked` vs `uncheckable`.** The names are close; each is defined in the docs.
- **`classify` gating.**
  - Codes appear only where a location is unchecked, following the source's `check_job` flow.
  - The check is fixed at the code level.
- **History:** squash or reword. This is unchanged from the first round.

## Tests

- `test/unit/tool_util/security`: 604 passed. The count fell from 629 because 39 per-member description tests became 2 set checks.
- Analyser output is byte-identical over 387 tools.
