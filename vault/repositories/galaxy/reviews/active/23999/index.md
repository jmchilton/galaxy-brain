# galaxy #23999 — Unify root uv workspace

[PR #23999](https://github.com/galaxyproject/galaxy/pull/23999) · Status: active; initial review complete; CI-filter finding commented by John; ball with author. Open, out of draft; GitHub checked 2026-10-11.

- [Review and risks](review-2026-10-11.md)
- [Draft review](draft-review.md)
- [Validation evidence](validation-evidence.txt)
- [CI filter reproduction](filter-probe.py)

Reviewed HEAD: `5daad696899b2ad2224cb904555219a78282d5d9`. Base `dev`; merge base `919f4f28403d34dcf15e0ef8924c8bdfdb15d079`. Author: paperbenni. Final live HEAD is unchanged; no comments or submitted reviews at the final check.

## Outcome

Request changes for one P2: retain CI filters for tracked `lib/` sources until those sources are physically moved. Package source paths are symlinks, so replacing the real paths drops existing checks on future source-only changes.

Pinned uv 0.12.23 verifies the lock and all four requirements exports; all 26 workspace members have editable lock entries. 59 focused util tests pass on each of Python 3.10.19 and 3.14.3; auth lint and a util wheel/sdist build pass. Package-wide `make mypy` hits a namespace-duplicate error that also reproduces after restoring base workspace manifests in the same environment; disclosed as a limitation, not a new finding. Live CI: 61 success, 2 skipped jobs (CWL and Pulsar), no failed checks.

## Resources and delivery

Worktree `/Users/jxc755/projects/worktrees/galaxy/pr/23999/` remains clean at the reviewed HEAD. Validation used isolated temporary copies and environments; those temporary resources were removed after retaining ordinary evidence. No Galaxy source edits, GitHub comments, or reviews were posted. No new private security report was created.

John requested this review on 2026-10-11. Coordinator handles the queue and vault sync. Review finding was delivered by John; see delivery below.

## Delivery — 2026-10-11

John [posted the CI-filter finding](https://github.com/galaxyproject/galaxy/pull/23999#issuecomment-6112464099) at 2026-10-11T18:50:54Z, with a broadly positive assessment and a question about whether the workspace change addresses #21811. This was a comment, not a formal request-changes review. Open, out of draft, HEAD unchanged. Ball with author; resources retained.
