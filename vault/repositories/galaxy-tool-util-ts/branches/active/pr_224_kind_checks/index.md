---
upstream_base_branch: main
related_records:
  - galaxy-tool-util-ts/issues/210
  - galaxy-tool-util-ts/branches/issue_210_test_kind_checks
  - galaxy-tool-util-ts/branches/issue_210_datatypes_snapshot
---

# Our #210 work as a PR into #224's branch

- [Open PR](https://github.com/denzasikora-lab/galaxy-tool-util-ts/compare/fix/validate-workflow-test-metadata...jmchilton:galaxy-tool-util-ts:pr_224_kind_checks)
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/pr_224_kind_checks)

## Status

Implemented: ten commits on #224's head `e82bc455`, pushed to `origin` at `eb283dd8`; Galaxy and IWC sweeps show 0 new errors ([verification](verification.md)).

No PR yet; it will target `denzasikora-lab:fix/validate-workflow-test-metadata`, not `main`, once John approves the [description](pr_description.md) and the [#224 comment](comment_224_draft.md).

Local gate green apart from 3 `integration-tests` cases and 3 `make check` scripts that fail the same way on `main` here; no CI until a PR opens.

## Decisions

- 2026-11-11: John wants all our #210 work, the datatypes snapshot included, delivered as one PR into #224's branch, and nothing landed on `main` ahead of #224. Rewrite #224's Russian comments in English.
- Opening the PR into the contributor's fork and the #224 comment are outward-facing; show John both before posting.

## Open questions for John

- Outputs of skippable steps (`when`, or downstream of one) get no fixed format, so their `ftype` isn't checked. That drops 36 IWC formats, all VGP. The alternative is to keep the format and report an `ftype` mismatch on such outputs as a warning.

## Notes

- Supersedes `issue_210_datatypes_snapshot` and `issue_210_test_kind_checks`; they stay in `branches_ready_for_final_review` until John moves them.
- Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/pr_224_kind_checks`.
