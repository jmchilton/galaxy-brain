# galaxy #23827 — Import datasets and collections from another Galaxy with a link

**Latest status — 2026-10-16:** Approved by John; awaiting merge decision; two package checks fail on ssh_util typing. Live head: `4216e350ea93c8f03adb06a648cb249d35a2eeeb`. GitHub state, comments, reviews, latest commit and CI checked; no code revalidation performed.

[PR #23827](https://github.com/galaxyproject/galaxy/pull/23827) · Status: active; initial review and independent confirmation complete. **Both confirmed findings posted by John; ball with author.** Initial recommendation: request changes. GitHub checked 2026-10-11: open, out of draft.

Reviewed HEAD: `f6278fb4e50a4289def49b73d29a77745883afb4` (base `dev`). Author: arash77.

- [Initial review and risk assessment](review-2026-10-11.md)
- [Draft review for John to post](draft-review.md)
- [Validation evidence](validation-evidence.txt)
- [Real API policy comparison](test-options-probe.py) and [runner](run-options-probe.py)
- [Closed-dialog failure diagnostic patch](closed-dialog-probe.patch)
- [Independent confirmation of both P2 findings](confirmation-2026-10-11.md) and [confirmation evidence](confirmation-evidence.txt)
- [Confirmed two-finding comment for John to post](confirmed-comment.md)

Two P2 findings: the new asynchronous API drops `discarded_data`, changing the documented/default import policy; closing the export dialog discards task-failure tracking, allowing failed exports to appear READY in Recent Exports. The normal dataset and paired-collection round trips, including contents/type/build/tags, passed.

Validation: 54 model-store tests passed (1 expected failure), 2 integration tests passed, 2 new API cases passed, 51 client tests passed. Additional diagnostics confirmed both findings. Final live head unchanged, 56 successful checks and 2 skips, no comments/reviews. No Galaxy source or shared virtualenv edits; worktree clean.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/23827/`.

John added this review on 2026-10-11 alongside #23999 and #23975. Review performed by one dedicated subagent; coordinator handles queue and vault sync. The review agents submitted no GitHub comment or review. John delivered both findings; see delivery below.

Independent double-check completed at John's request on 2026-10-11: both findings confirmed. Correct-behavior regressions fail on unchanged HEAD and pass with isolated controls. The API probe exercises eight combinations, including the omitted default; the UI probe closes after a resolved PENDING response, fails afterward, and mounts the real Recent Exports card. The independent reviewer posted nothing.

## Delivery — 2026-10-11

John [posted both independently confirmed findings](https://github.com/galaxyproject/galaxy/pull/23827#issuecomment-6112733349) at 2026-10-11T19:18:22Z, requested fixing or pushing back on them, and noted the App.vue conflict after #23991 merged. He prefers this approach to a file source but wants the user story discussed at Tuesday's developer meeting, including whether an API-key-based import could remove the export preparation step. This was a comment, not a formal request-changes review. Open, out of draft, HEAD unchanged. Ball with author; resources retained.

## Morning check — 2026-10-12

Open, ready; live HEAD `5c59cde64a2a7bce94c0a171f6f118eadbf97309`. CI snapshot: 17 in progress, 10 queued, 2 skipped, 27 success. Author reports both findings fixed and the App.vue conflict resolved on new head `5c59cde64a2a`; verification remains pending while CI runs. [Author reply](https://github.com/galaxyproject/galaxy/pull/23827#issuecomment-6125296399) is in the live PR discussion; two questions need John’s scope decision: fix the analogous `histories/from_store_async` policy gap here or separately, and persist task IDs in Recent Exports to survive reloads. This status refresh does not verify either fix.

## Morning check — 2026-10-14

Open, ready; live head `a113532f91e8bbe071d45e17e6fcd87a19d220d6`. CI: 2 failure, 2 skipped, 54 success. Author reports both fixes and says the link-based scope was agreed at Tuesday’s meeting, with the picker and scoped tokens later. John’s explicit decision is requested: can the analogous `histories/from_store_async` discarded-data policy fix and persisting task IDs across reloads both be separate PRs? Author fixes remain unverified; current failed checks have not been attributed in this refresh.

## John’s response — 2026-10-15

John [responded](https://github.com/galaxyproject/galaxy/pull/23827#issuecomment-6203918285) at 22:50:54 UTC and formally approved at 22:51:04 UTC on head `4216e350ea93c8f03adb06a648cb249d35a2eeeb`. He noted concerns about UI space and adjacent copy/download choices, while offering no better short-term approach. Per John’s instruction, the response/scope decision is no longer pending. Open; approved and awaiting merge. No independent fix revalidation performed.

## Morning check — 2026-10-16

Approved by John; awaiting merge decision; two package checks fail on ssh_util typing.

CI snapshot: 2 failure, 2 skipped, 49 success. Earlier findings retain their reviewed commits.
The two failed package jobs (Python 3.10 and 3.14) both report `galaxy/security/ssh_util.py:18: error: Call to untyped function "publickey"`. No changes or reruns submitted.

## Archived — 2026-10-20

Merged by John into `release_26.2` at 2026-10-20T02:25:26Z on head `4216e350ea9`, despite the two failing package checks (ssh_util typing; PR doesn't touch that file). Tracking ended on merge. Follow-up picker work tracked by the author in #24259.
