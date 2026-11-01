Polished for final human review at `51b6ea3a404759a1d47f92c6fa798916d255fb85`, targeting `release_26.1`. No implementation changes were needed. The required checklist and one fresh strengthening round both passed; John's human-read checkbox remains unchecked. No PR was opened and no PR body or comment was posted.

## Branch and CI

Rebased four commits without conflicts onto current `origin/release_26.1` (`546ed25c4661`), then pushed only to the jmchilton fork with a lease pinned to the old SHA. Range-diff reports all four commits patch-identical; the upstream additions concern library collection selection and do not alter the three branch files.

The old head's release-script failure (run [40341740775](https://github.com/jmchilton/galaxy/actions/runs/40341740775)) is unrelated: its synthetic release test reads the fork's historical `master` (19.05), where `VERSION_MINOR = None` does not match its expected version string. None of this branch's files participate in that test. Other old-head runs were queued/running or green. Fresh CI on the rebased head is queued/pending, with CWL skipped; it is not yet green.

## Validation

- All ten embedded user/admin import variants pass after rebase: `10 passed, 397 deselected, 2 warnings` in 28.47 seconds (`/tmp/24471-polish-api.log`). Existing namespace-deprecation warnings only.
- Used the backend-test skill's direct pytest path with beta formats/modules enabled and conda initialization disabled. The wrapper does not accept the needed `-k` selector and printed usage, so it was not counted as a test run.
- `make format` completed. Reverted its unrelated existing quote normalization in `mulled_build.py`.
- Changed-file mypy reports the same three pre-existing unused-ignore errors in `managers/workflows.py` as base; no new errors. Compared with the recorded base run and confirmed the three branch files are unchanged between the old and refreshed base.
- `git diff --check` passes; Galaxy worktree clean. Existing hardening evidence covers 28 distinct relevant API cases and eight regressions failing with the original constraint error before the fix.
- Vault validation: 126 files, zero errors, 15 existing advisory warnings.

## Review outcome

[Checklist review](subagents/polish_checklist.md) answered every applicable item. [Strengthening review](subagents/polish_strengthening.md) returned nothing to add. Highlighted sentences identify the embedded user/admin audience, nested user-tool coverage, preserved permissions, and retained transaction semantics. Transaction redesign and lookup optimization remain outside this fix's motivation. No further tasks remain from the single strengthening round.

Prepared [description](pr_description.md), [four release-prefixed title options](pr_titles.md), and [recommended labels](pr_tags.md). Moved queue and record to `branches_ready_for_final_review`; human approval and fresh fork CI remain pending.

Revision snapshot:

```text
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/workflow_import_embedded_tools/differential-review/snapshots/20261026T145506Z-revision-51b6ea3a4047.json
  revision @ 51b6ea3a4047 vs origin/release_26.1 (merge-base 546ed25c4661)
  since 20261026T144002Z-hardening-d8e943eff4c4:
    commits: 0 same, 4 rebased, 0 changed, 0 new, 0 dropped
    hunks:   5 carried, 0 changed, 0 new, 0 dropped
```
Polishing snapshot:

```text
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/workflow_import_embedded_tools/differential-review/snapshots/20261026T145633Z-polishing-51b6ea3a4047.json
  polishing @ 51b6ea3a4047 vs origin/release_26.1 (merge-base 546ed25c4661)
  since 20261026T145506Z-revision-51b6ea3a4047:
    commits: 4 same, 0 rebased, 0 changed, 0 new, 0 dropped
    hunks:   5 carried, 0 changed, 0 new, 0 dropped
```
