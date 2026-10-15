# issue_23977_client_api_fanout_26.1

Status: `draft_ready`. Base: `release_26.1`. PR: [#24141](https://github.com/galaxyproject/galaxy/pull/24141) (draft).

Spaces out client retries and removes hidden counts requests (#23977).

[Latest review and commit reading order](review_and_history_2026-10-14.md) · [Codex review](codex_review.md) · [followup workflow counts proposal](followup_workflow_counts_proposal.md) · [Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) · [Test challenges](test_challenges_debrief.md) · [Tracking history](tracking_history.md)

Sibling [issue_23977_datatypes_fanout_26.1](../../merged/issue_23977_datatypes_fanout_26.1/index.md) merged as [#23995](https://github.com/galaxyproject/galaxy/pull/23995). The branches were split to permit either merge order.

## Latest update — 2026-10-14

Head: `5ce39226753`; base: latest `release_26.1` (`933e342ad1d`). Added a detailed history-switch failure toast and coverage, reviewed the complete diff, and rewrote the fork to three commits: passing component baselines, failing regressions, then the green fix and new-helper tests. [Reading order and evidence](review_and_history_2026-10-14.md).

Final validation: 14 changed suites / 123 tests pass; surrounding suites 121 files / 980 tests pass; typecheck and pre-commit pass. Opened draft [#24141](https://github.com/galaxyproject/galaxy/pull/24141) at the user’s request on 2026-10-14, using `pr_description.md` verbatim. Title: **[26.1] Jittered backoff for client API retries; skip hidden workflow counts**. Head: `5ce39226753ae23245f89b0b698477c4c6b5d60f`. Live state: draft, mergeable, CI queued/in progress.

Standing instruction: the user requested a draft; keep it draft until the user asks to mark it ready. This request authorizes opening the draft, not automatic undrafting.

## Problem and resulting behavior

[#23977](https://github.com/galaxyproject/galaxy/issues/23977) reports 165 requests and 96 HTTP 429 responses when opening Workflow Invocations on a rate-limited server. The client amplified the burst: rejected GETs retried together every second, and stores retried failed items on getter re-evaluation without delay. This branch adds jittered exponential backoff, shares in-flight workflow-instance requests (including their failures), and skips `/counts` requests for cards whose count badges cannot appear.

The retry gate replaces three copied retry-count implementations in keyed-cache, history and collection stores. Pending retries remain visibly loading; errors appear once retries finish. It preserves `Retry-After`, including the last failed response's value. A persistently rate-limited item still has a maximum of 16 requests across the two retry layers, spread over roughly 20–40 seconds rather than roughly 12 seconds. This reduces synchronized retry bursts; it does not eliminate every request.

Regression tests count requests at MSW handlers, advance fake timers, and inspect rendered loading/error states. Examples: three concurrent 429 retries move from 1000/1000/1000 ms to 500/750/1000 ms under the test's controlled jitter; a repeated GET moves from 0/1/2/3 seconds to 0/1/3/7 seconds. The recorded post-split validation passed 218 files / 1606 tests plus typecheck and pre-commit. These are implementation-snapshot results, not a fresh rerun or a new live-server measurement. Details and caveats remain in the [implementation debrief](implementation_debrief.md) and [PR description](pr_description.md).

Owned cards on “My workflows” still fetch counts individually. Removing that N+1 requires the separate [workflow-index counts proposal](followup_workflow_counts_proposal.md) for `dev`. This branch references #23977 rather than closing it. GitHub queried on 2026-10-12 returned no PR with this head branch; the local final-review status remains unchanged. The datatype sibling has now merged as [#23995](https://github.com/galaxyproject/galaxy/pull/23995).

## Highlight: a regression test that reaches the real CSS boundary

[PR #23910 — changes](https://github.com/galaxyproject/galaxy/pull/23910/changes), merged 2026-10-06, fixes a separate `DatasetPopoverLink` defect: the scoped `:deep(.dataset-details-popover)` rule required an ancestor that no longer existed after GPopover moved its content under `body`. The intended 420px cap never applied, so the global 70%-of-viewport popover width could put content off screen. A plain scoped selector matches the slot content's retained scope id.

The added `DatasetPopoverLink.width.test.ts` compiles and injects the component's actual scoped styles, mounts the component, verifies that the popover content sits outside the wrapper, and checks its computed `maxWidth` is `420px`. This is a useful testing example because ordinary Vitest mounting does not load SFC styles: the test deliberately reaches the styling boundary that caused the bug. It guards selector matching after relocation, not full browser geometry or a screenshot comparison. This branch touches the same component for retry/loading behavior; #23910 is a separate CSS repair, not part of the fan-out fix.

## TICK — 2026-10-15

All 29 checks succeeded and GitHub reports draft and mergeable. Move to `draft_ready`, preserving the explicit instruction to keep draft until John requests promotion.
