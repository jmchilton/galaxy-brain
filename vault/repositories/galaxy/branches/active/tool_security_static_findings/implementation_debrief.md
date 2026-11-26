# Implementation debrief

```
created .../tool_security_static_findings/differential-review/snapshots/20261126T041329Z-hardening-d4ae281e442c.json
  hardening @ d4ae281e442c vs origin/dev (merge-base ce63095e7a8a)
  since 20261126T034325Z-revision-79f7da403127:
    commits: 99 same, 0 rebased, 0 changed, 2 new, 0 dropped
```

**STATUS: BLOCKED on a PR-shape decision.** The code is ready. The history needs John's call before a PR.

- Head: `d4ae281e442` on `jmchilton/tool_security_static_findings`.
- 101 commits on `origin/dev`: 63 by mvdbeek, 38 by John.
- Source: `jmchilton/tool_security_review_spec` at `d5f7cb05e91`, which stacks on `mvdbeek/tool-security-review-on-load`.

## What it is

- **The port.**
  - mvdbeek's static analyser `galaxy.tool_util.security` and the `ToolParameterSanitizer` move to `galaxy.tool_util.parser.sanitize`.
  - John's declarative spec (synthetic tools plus `cases.yml`, with a static runner) and docs.
  - 82 commits cherry-picked with `-x`, authorship kept; 22 runtime-only commits skipped.
  - Runtime removed entirely: no job-prep review, no `ToolEvaluator` enforcement, no refusals, no runtime config, no app wiring.
  - Analyser `to_dict()` output is byte-identical to the source branch on 387 tools.
- **John-side additions, from the re-scope.**
  - A `Rule` catalog with descriptions. Spec rules are typed, and the docs get a generated section.
  - A pure `classify(report)`, ported from the source's `_no_plain_value` with `Co-authored-by` mvdbeek. It returns `Uncheckable` codes and the classified unchecked locations, and spec cases can carry a `codes` expectation.
  - The CLI (`galaxy-tool-security-review`, or `python -m galaxy.tool_util.security`):
    - walks directories and reviews XML tools only;
    - gives per-tool error entries;
    - reports tool id and version, plus the `codes` and `uncheckable_locations` JSON keys;
    - adds `--fail-on <severity|uncheckable|unchecked>`.
  - Packaging: `MANIFEST.in` lists the spec files, guarded by a test. Docs are reframed for offline use.
- **Hardening.**
  - Normal reviews: `subagents/review_port.md` and `review_rescope.md`.
  - Test challenges, run twice.
  - Thermo-nuclear review, run twice. The John-side code is restructured; analyser findings are NEEDS-DECISION.
  - Refactor baseline: report-only.
  - Scope evaluations: round 1 expand (re-scoped, alt `tool_security_static_findings_alt_original_scope` at `92320a751cb`); round 2 keep.
  - Codex was blocked by the permission classifier.

## Decisions for John

1. **History.** About 40 cherry-picked messages describe runtime behaviour that is gone. Some commits add code a later commit removes (`codes.py`, a timeout pair, Python 3.8 support). Two carry a misleading "Baseline tests" prefix.
   - Option 1: keep the picks and reword.
   - Option 2: squash to about six commits that keep authorship with `Co-authored-by`. The plan is in `subagents/review_port.md` and `baseline_refactor.md`.
   - Check with mvdbeek first.
2. **mvdbeek's sanitizer move `7ea120eef20`.** It could be its own small dev PR, from John's fork or by mvdbeek, leading with layering. Or it stays the first commit of the feature PR.
3. **PR split.** `scope_evaluation.md` lists options A–F; one of them is the port, then the John-side re-scope.
4. **Behaviour.**
   - Non-XML tools make the run exit 1.
   - The `unchecked`/`uncheckable` naming.
   - `--judge` doesn't affect `--fail-on`.
   - `classify` gates codes on unchecked locations, at the code level only.
5. **Spec.**
   - Should spec cases pin the classified `uncheckable_locations`?
   - Should `path_like_name` fold into `element_identifier_shell_injection`?
   - Should `level` become an expectation?
6. **Analyser restructuring (for mvdbeek).** Split the 1,972-line `interp.py`, turn the `if name ==` call models into a registry, use `Rule` at the emit sites, and remove the thread-local recording. About 20 "job check" comments remain in the analyser.

## Tests

- `test/unit/tool_util/security`: 590 passed.
- ruff, black, isort and `make format` are clean.
- mypy (from `lib/`) is clean for `galaxy/tool_util/security`. The 22 errors in 11 unrelated modules match the base.
- The generated docs sections are fresh.
- CLI text and JSON output are byte-identical before and after the final restructuring.

## Other notes

- **rerere.** The first cherry-picks recorded about 14 `rr-cache` resolutions in the shared Galaxy clone. They were deleted, because they could have silently resolved the other session's rebases of `tool_security_review_spec`. The rest of the port ran with `rerere.enabled=false`.
- **Sibling session.** One commit hit an `index.lock` in the shared clone, which points to activity from another session. The retry succeeded.
