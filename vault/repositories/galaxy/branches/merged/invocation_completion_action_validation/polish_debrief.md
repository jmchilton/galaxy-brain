# Expanded-scope polish — 2026-10-16

Status: `branches_ready_for_final_review`. No approval SHA or title chosen; human-read remains unchecked. No PR or GitHub discussion created or edited.

Published head `ddfbb3b991c185779b0f4e200801d6f4d443d8c2`; actual base release_26.2 at `579ca73440d776002b7099538cef000838687d8e`. Earlier expanded head `9f04be9b5ad` has exactly the same final tree. This supersedes the old names-only polish evidence.

## Checklist and history

Fetch/rebase found branch current. Fresh independent checklist found the two new notification acceptance cases needed a leading baseline-test commit. Split into `993613b8a9e` (baseline tests only), `8d60f4e6a09` (unknown-name fix) and `ddfbb3b991c` (required export configuration fix). Unknown-name/eight malformed-export regressions stay with their fixes; existing completion units and valid-export/no-action controls remain unchanged. Exact tree equality verified; no production/test content changes. Published only to jmchilton using exact old-head force-with-lease.

Re-review confirms all agent-answerable checklist items pass. Exactly one fresh strengthening round returned nothing to add; highlighted description sentences answer API audience, configuration-vs-destination scope and compatibility misreadings. No scope expansion or remaining task.

[Description](pr_description.md) · [three release-prefixed titles](pr_titles.md) · [labels](pr_tags.md) · [checklist](checklist_evaluation.md) · [strengthening review](strengthening_review.md).

Labels: kind/bug + area/workflows + area/API, reflecting accepted unusable completion requests. Labeler would add workflow/testing/testing-api path labels; recommended semantic areas are workflow/API.

## Verification

- Leading baseline-only commit: **2 notification cases passed** (43s).
- Combined final-content suite: **27 passed, 1 failed**. Existing test_completion_response_structure timed out after 60s waiting for uploaded input data still running, before workflow submission/completion assertions. All 11 new API cases, valid-export control and 15 existing completion units passed.
- Isolated existing completion controls: **2 passed on branch**, **2 passed on baseline**. All 28 distinct selected cases therefore have passing results; the initial combined run is retained as a timeout, not called a clean pass.
- Black, isort and whitespace checks pass for five changed Python files.
- Vault validation: 124 files, 0 errors, 15 advisory warnings.

Reports and matching .log files: /tmp/completion-polish-tests.html, /tmp/completion-polish-baseline.html, /tmp/completion-polish-positive.html, /tmp/completion-polish-base-positive.html. Used direct pytest with standard backend-test skill variables and tool configuration, avoiding runner dependency updates. Tests ran against the exact final contents; history reorder changes no executable bytes.

## CI and handoff

Pre-reorder CI had seven passing workflows and no failures; API/docs/general units were still running. Current final-head snapshot: 22 workflows, 19 queued, 1 pending, 2 skipped, no failures. This is pending final-head coverage, not inherited green CI. Human read-through/title choice remain. Tracking files synced to galaxy-brain main, excluding unrelated staged/unstaged work. Temporary baseline checkout removed after clean/pushed checks.
