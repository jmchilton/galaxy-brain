---
related_records: planemo/reviews/1752
---

# planemo#1777 — Compare tool sources to decide whether a version bump is needed

- [View on GitHub](https://github.com/galaxyproject/planemo/pull/1777) · [comparison with #1752](comparison_with_1752.md) · [draft PR comment](pr_comment_draft.md)

## Status

No formal review run; findings carried over from the [#1752 review](../1752/index.md) and a side-by-side comparison, fixed and pushed into the PR head at `ca913f57` (on author head `8c509cb7`) at John's request.

PR open by bernt-matthias; base `master`; fixes #1613 and supersedes #1775 and, functionally, #1752.

Draft comment explaining the pushed commits is unposted.

## Pushed commits

- `2489034c` Bound and narrow the published tool source fetch: 30s timeout on `tool_source` (bioblend default is none) and `except requests.RequestException` instead of `Exception` (#1752 P3 2).
- `c82f6fb6` Say ShedVersion compares only the tool XML: info message, docstring, `docs/publishing.rst`, HISTORY (#1752 P2 1, scope only).
- `ca913f57` Test ShedVersion tool source comparison through shed_lint: ported from `pr_1752_review_0` `d71c9daa`; red on master's `shed_lint.py` (#1752 P2 3 wiring gap).

Gate: `make lint` and `tests/test_planemo_linters.py` plus `tests/test_shed_lint.py` (39 passed).

## Decisions

- Not done: #1752 plan Phase 1 behavior-file guard. bedtools has `tool-data/*.loc.sample`, `tool_data_table_conf.xml.sample` and `static/images`, so every untouched bedtools tool would still error, undoing #1613. Left for the follow-up ([draft issue](../1752/followup_shed_version_issue.md)).
- Not done: canonicalized comparison. PR chose raw strings explicitly; a live check on 2026-11-04 (4 bedtools tools, das_tool, ragtag) matched raw and canonical alike.
- Not a finding: `ConnectionError` now an error. On master `get_repositories` sat outside the `try`, so an outage crashed; bioblend wraps network errors into `ConnectionError`.
