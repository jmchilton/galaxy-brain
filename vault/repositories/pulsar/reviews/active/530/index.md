# pulsar #530 — Confine and fail visibly on unsafe staged-out outputs

[PR #530](https://github.com/galaxyproject/pulsar/pull/530) · Status: active; open, out of draft. GitHub state checked 2026-10-11.

[Release-branch rebase and verification](rebase-2026-10-11.md) · [Earlier CI diagnosis](ci-triage-2026-10-11.md) · [Historical review](review.md)

Recorded review snapshot: `faedeec`. Later review rounds and delivery history remain in the linked notes.

Current PR head: `eb6d63c2d0c8`, targeting `release_0.15`; all eight author commits rebased and pushed. Rebase-equivalence review and local regression checks completed; no new full code review was performed.

Tracking: Rebased and retargeted at John's request. MERGEABLE; fresh CI queued on the release base. 58 focused tests, Ruff, isort and mypy passed. Historical master-base framework failures do not describe the new head. Internal rebase review only; no GitHub review/comment posted.

Prior queue tracking: prior review predates current head; three Galaxy integration checks red.
