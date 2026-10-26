# Revision — preserve sparse state and make expansion optional

Requested by John on 2026-10-26 after investigating Galaxy's conditional-default semantics. Pushed `37264be13d0d137ae17ea10d03dcd755f0decf31` to the existing `issue_202_fill_defaults` branch, and updated PR #207's title and body.

The final scope is optional `gxwf fill-defaults`. Strict validation continues to accept defaulted omitted selectors. Removed the completeness checker, its exports and warnings, and its threading through both validators, tree validation, lint, and concrete drafts. The validator source files now match the PR base. Updated docs, changeset, and regressions to reflect the intended contract.

The revised regressions failed under the old implementation, then passed after removing the incompatible requirement. Build, required checks, and the full test suite passed. Focused results: 57 tests. Full results include 429 CLI tests, 5169 schema tests, and 117 gxwf-web tests passing, with existing expected-failure/skipped cases retained. No live Galaxy import or execution was performed.

GitHub CI, dependency review, and docs runs were queued after the push. Prior model-review badges were removed from the PR description because they covered the previous scope. The Galaxy import bug remains in the separate queue with `release_26.1` as the requested target.

## Differential review snapshot

```text
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy-tool-util-ts/branches/active/issue_202_fill_defaults/differential-review/snapshots/20261026T172447Z-revision-37264be13d0d.json
  revision @ 37264be13d0d vs origin/main (merge-base 539c16c9d425)
  first snapshot: 16 commits, 16 files, 19 hunks
```

## Subsequent Galaxy investigation (2026-10-26)

The Galaxy agent's rejection prompted a direct API comparison. The bug is already fixed by merged Galaxy PR #24272, which the initial investigation missed. All 13 import cases pass on current `release_26.1`. Removing only its five-line visitor change reproduces eight HTTP 500s, including the exact fastp `eval_dups` error. The original source was restored. See [the evidence and branch history](galaxy_import_followup.md).

PR #207's body now points to the merged fix instead of the queued draft and records the follow-up import checks. Its title and code remain appropriate. The queued draft is annotated as superseded, with a recommendation not to file a duplicate. Earlier statements above about a pending Galaxy fix describe the knowledge at the time of the code revision.
