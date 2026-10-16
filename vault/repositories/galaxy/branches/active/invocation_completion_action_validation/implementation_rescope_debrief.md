# Rescope — 2026-10-16

User requested replacing the four extraction scope evaluations using the revised process, and implementing recommended scope changes. First reevaluation recommends a modest expansion; [recommendation](earlier_drafts/2/scope_evaluation.md). The superseded original evaluation is [archived](earlier_drafts/1/scope_evaluation.md).

Add optional hook-owned configuration validation with an accepting default. Export hooks reject non-object configuration or missing/non-string/blank target_uri before run state is created, while notification and custom hooks keep existing acceptance.

Original polished head `163b1b36f6f44bd9bae875f7fa396921fffa483e` is preserved and published as `invocation_completion_action_validation_alt_original_scope`; no separate worktree or queue entry was created. Existing branch remains independent from `release_26.2` at `579ca73440d776002b7099538cef000838687d8e`.

Implementation and validation are underway. Fresh normal review, test challenge, applicable quality review and second scope evaluation precede final handoff; previous implementation/review evidence is archived under `earlier_drafts/2/`. A further scope recommendation in that second evaluation will be parked for the user rather than expanded again.
