# galaxy #24043 — Restore generate_repository_info_elem_from_repository for data manager hooks

[PR #24043](https://github.com/galaxyproject/galaxy/pull/24043) · Status: active; initial review complete, **approve**, draft unposted. Open, out of draft; GitHub checked 2026-10-11.

[Review and risk assessment](review.md) · [Unposted approval draft](draft-review.md) · [Compatibility probe](compatibility_probe.py)

Reviewed HEAD: `58068a6dfdbd267dc66fbc1903ba1f44d16a19a2` (base `dev`). Author: mvdbeek. Final live HEAD matches.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24043/` — clean after review.

John requested this review on 2026-10-11. Review delivery: **unposted**; no GitHub messages or reviews submitted.

No actionable findings. The restoration preserves the old runtime method bodies and the external hook/import contract. Local validation: 29 focused unit tests passed and four compatibility checks passed. CI: 55 successful, 2 skipped check jobs; actual integration logs show both manual/refgenie cases passed. The author reports a merge-forward red/green integration run; that run was not independently reproduced locally. The review explains the current-head coverage limit and clean building blocks for strengthening the existing integration test.

Risk: low, reversible restoration of an established API and XML format. No new schema or artifact contract.
