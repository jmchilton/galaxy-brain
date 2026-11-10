---
related_records: pulsar/reviews/550
---
# pulsar#571 — Add optional EngageQueue CLI execution and collection acknowledgment

- [View on GitHub](https://github.com/galaxyproject/pulsar/pull/571) · [Findings](review_0_findings.yml) · [Design review](design_review.md) · [Diagrams](https://claude.ai/artifact/DvDNQBGBuJbFv4w7xsshZa) · [Code review](initial_review.md) · [Thermo review](thermo_review.md) · [Test review](test_challenges_review.md) · [Test debrief](test_challenges_debrief.md) · [Risks](risks.md) · [Comment note](johns_review_0_comment_note.md) · [PR note](johns_review_0_pr_note.md) · [Review branch](https://github.com/jmchilton/pulsar/tree/pr_571_round_0_rev_0)

## Status

Round 0 review of `a08303706ea4b66fc46b5f03a5016b355e0e1414` complete (1 P1, 7 P2, 11 P3) plus ad hoc design review; review branch `pr_571_round_0_rev_0` (`45c474bd718`) pushed to jmchilton; not delivered.

PR open, not draft, targeting `master`, by blankenberg (checked 2026-11-10).

## Context

Supersedes closed #550 (detached local manager), where mvdbeek asked for a thin `BaseJobExec` plugin under `queued_cli` and for collection ack as "a small, generic PR that isn't tied to this manager". Design review recommends splitting: LocalShell exit-status fix, declared recoverable-submission capability, thin EngageQueue plugin, collection ack deferred. Companion Galaxy PRs: galaxyproject/galaxy#24809, #24810.
