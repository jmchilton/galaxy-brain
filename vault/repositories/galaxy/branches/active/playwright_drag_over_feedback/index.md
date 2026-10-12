# playwright_drag_over_feedback

Status: `ready`. Base: `dev`. [PR #24010](https://github.com/galaxyproject/galaxy/pull/24010) (open, not draft).

Adds drag_over feedback checks and runs test_drag_drop_visual_feedback under Playwright.

[Implementation](implementation_debrief.md) · [Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tracking history](tracking_history.md)

Approved SHA: `b77dfe4a59b` (John, 2026-10-05 at `21cfc109eb0`; carried across a clean rebase onto dev 2026-10-09). Opened as draft 2026-10-09 at John's request to let upstream CI run Playwright. Chosen title: **Run test_drag_drop_visual_feedback under Playwright**.

Recorded CI conditions and description instructions are in the tracking history; [shared CI context](../../queue_context.md) applies.

## TICK — 2026-10-11

Live #24010 is already OPEN and non-draft, mergeable. Remaining upstream failure is Minikube setup downloading kubeadm (`K8S_INSTALL_FAILED`, protocol error), before tests. Diagnosed unrelated and reran failed jobs in [run 37951980602](https://github.com/galaxyproject/galaxy/actions/runs/37951980602). No rebase or PR-setting change was needed.

## TICK — 2026-10-12

Requested failed-job reruns for the recorded unrelated failures: [run 37951980602](https://github.com/galaxyproject/galaxy/actions/runs/37951980602). All requests were accepted; this does not claim a passing rerun or recover an evicted client cache/artifact.
