# pulsar #530 — Confine and fail visibly on unsafe staged-out outputs

[PR #530](https://github.com/galaxyproject/pulsar/pull/530) · Status: active; open, out of draft. GitHub state checked 2026-10-11.

[CI triage — 2026-10-11](ci-triage-2026-10-11.md) · [Historical review](review.md)

Recorded review snapshot: `faedeec`. Later review rounds and delivery history remain in the linked notes.

Current PR head: `e9c1838cb21`. The migration refreshed tracking, not the code review.

Tracking: Three framework jobs abort during collection with the same removed-export import error as master after #537. This is inherited integration failure; tests did not exercise #530. Current head still needs a fresh code review. CI diagnosis is internal, not posted to GitHub.

Prior queue tracking: prior review predates current head; three Galaxy integration checks red.
