# copy_to_clipboard_e2e

Status: `branches_ready_for_final_review`. Base: `dev` (prerequisite PR [#24104](https://github.com/galaxyproject/galaxy/pull/24104) merged; verified 2026-10-14).

Adds an E2E clipboard abstraction and a browser regression test for #24102 (`CopyToClipboard` did nothing after the Vue 3 migration).

[Implementation debrief](implementation_debrief.md)
- [PR description](pr_description.md)
- [Title options](pr_titles.md)
- [Polish debrief](polish_debrief.md)
- [Independent checklist](polish_checklist.md)
- [Single strengthening round](polish_strengthening.md)

## Decision

PR #24104 merged. John requested polishing this as a follow-up against `dev`; the finished description waits for final human review.

## Polish completed — 2026-10-14

Head: `042902f139e62194204c36cd6b404eae4fe2518e`, rebased cleanly onto upstream dev `8b729ff0050c32573ad0fa999e5e1b4d015dca8c` after prerequisite #24104 merged. Range-diff confirms the single E2E patch is unchanged; pushed to the fork with an exact old-head lease. Independent checklist passed; the single fresh strengthening round found nothing to add. The human-read checklist item remains unchecked.

All three focused browser cases pass under both Playwright and Selenium/Chrome; all five clipboard component tests, Ruff, Black, changed-client Prettier and diff checks pass. New-head fork CI is pending, not claimed green. Worktree is clean. See the linked debrief for scope, reproducibility and limitations. No PR or GitHub comments were posted. Tracking sync is pending because main contains unrelated outgoing commits.
