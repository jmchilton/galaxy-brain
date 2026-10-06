# extract_next_followups — fix plan for #22860

Branch `extract_next_followups` stacked on `extract_next` (`c4817499d71`) + local merge of origin/dev
(`1e7e6c1f9fb`, simulates post-merge state). After #22860 merges: `git rebase --onto origin/dev 1e7e6c1f9fb`.
Worktree: `~/projects/worktrees/galaxy/branch/extract_next_followups`.

Sources: deep review subagent + Vue/Bootstrap migration subagent (2026-10-06). Client tests green on merge state.

## Status (2026-10-06)
- Done: all phases 1-8 + review follow-ups through `17e8f000f08`; pushed. See implementation_debrief.md.
- Env: dedicated `.venv` (py3.13, pinned reqs from merged dev); client tests need `npm_config_use_node_version=22.20.0`.

## Phases (each = commit(s), review subagent between)

1. **H3** — drop `_reject_unquotable` from extraction validation (legacy `/extract` + by-ids). Quoted/newline labels accepted; report directive dropped w/ warning via existing `ExtractionLabelIndex._label_arg` unresolved path. Restore newline→space collapse in output labels. Convert the three `*_rejected` API tests to accepted + warning. Red: API test extracting a history whose dataset name contains `"` via legacy path.
2. **Cleanup (zero risk)** — drop chat selectors + `history_page_open_chat` re-added from pre-dev (deleted on dev in 0d083085bd2); drop redundant selenium `test_extract_button_visible_in_notebook_editor`.
3. **M1** — empty notebook → no `reports_config` (keep default report). API test.
4. **H1 + M2** — closure built on `WorkflowSummary` graph (copied-from-other-history tool producer; one pass per ICJ). Fallback min fix in `_synthesize_cross_history_inputs`. API test copying cat1 output across histories.
5. **H2 + M4** — rewrite inline embeds, visualization `dataset_id`, invocation-relative directives (`history_link()` etc.), final sweep dropping any residual instance id w/ warning. API tests.
6. **M5 / M6 / lows** — shared `PageManager` notebook-access helper; dedupe `_resolve_content`, one `original_content_key`, one `tool_for_job`; typing; trim verbose docstrings; label length clamp; seed warning reasons.
7. **Client** — GCard clear-title `icon-only color="red" transparent`, drop `:deep` override, GCard test; move card tests to `WorkflowExtractionCard.test.ts`; `from_page` as route prop; disable Extract button during save.
8. **Tests** — `from_page_id` auth test on `/workflows/extract`; invoke extracted workflow + render invocation report.

## Deferred / needs decision
- M3 element-of-mapped-collection in report (design: element identifier vs warn).
- M7 reconcile re-exposing un-starred outputs (policy).
- GBadge in galaxy-ui; GCard GCheckbox/GLink migration — separate dev PRs.
- Endpoint naming `extraction_summary` vs `workflow_extraction_summary`.
