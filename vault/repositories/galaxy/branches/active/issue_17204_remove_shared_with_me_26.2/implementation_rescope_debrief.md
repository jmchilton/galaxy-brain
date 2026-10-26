# Approved second scope expansion

John approved the parked second scope recommendation on 2026-10-26. Commit `684d6e15537` adopts `pluralize` in ten existing owner bulk confirmation/toast strings across HistoryList and WorkflowList, plus the existing Multiview toast (eleven sites total). It also adds missing return annotations to the four recipient removal routes and the workflow manager override.

The earlier per-item alt remains unchanged. The immediately preceding expanded implementation is preserved as `issue_17204_remove_shared_with_me_26.2_alt_before_plural_messages` at `7f8a10ab0e5`, described in `alts/before_plural_messages.md`.

Normal review approved the changes (`subagents/normal_review_plural_messages.md`); its formatting recommendation was applied. Existing HistoryList/WorkflowList tests pass (16), client lint has no errors, and all commit hooks pass. No tests or operation semantics changed. Full formatting passed. Full mypy comparison and fresh hardening are in progress.

All previous hardening reports and final implementation/rescope debriefs moved together into `earlier_drafts/2/`; the initial implementation debrief is retained. The new brain research report supplies testing references for later review agents.
