# Dependency audit — 2026-10-16

Core stack is published: cleaned readability `e06bbc4c702` -> stories `4e60254eded` (159 commits) -> play `fd94d33f277` (99 commits). Original story and play heads are preserved in dated backup refs. The old churn-inclusive readability head and the comparison branch are excluded from the new play ancestry. The comparison remains published at `488693a2611`.

The separate a11y prototype has exactly two own commits above `81c4987360debdff86678e038e8035c31213a410`, with remote head `c246eb4fde308f62f817018b5ce5f41fbfba7407` verified unchanged. Those commits add accessibility infrastructure and annotate story exceptions in 32 paths. Its recorded historical browser failures and current markup changes need separate compatibility validation when transplanting those two commits onto the new play head.

The real-API branch has exactly three own commits above historical readability `f0659f1cf0d69a8e17011bc3b4ef5489b02c3891`, with remote head `3076db79898e5db847fe05dd521e48b80034ef72` verified unchanged. Its 17-file layer adds recorder/fixture infrastructure and quota/history fixture consumers. Its actual dependency is historical readability; it is not currently stacked on stories/play. A separate restack must use that explicit cut and chosen dependency, preserving fixture capture validation. Replaying the full divergent history would incorrectly reintroduce inherited readability commits.

No changes were made to either ancillary branch during the core stories/play restack. Both boundaries are now recorded for their separate restacks. Neither branch gains PR approval from this audit.
