# galaxy #24005 — Keep directory dataset content at the root of extra files and expose it to YAML tools

[PR #24005](https://github.com/galaxyproject/galaxy/pull/24005) · Status: active; initial review complete. Recommendation: **request changes**. Open, out of draft; GitHub checked 2026-10-11. Delivery: **findings posted by John as a comment**; formal request-changes draft remains unsubmitted.

[Review and risk assessment](review-2026-10-11.md) · [Unposted review draft](draft-review.md) · [Validation evidence](validation-evidence.txt)

[Shared-input runtime probe](shared-input-probe.py) · [Independent YAML fixture](shared-input.yml) · [Framework runner](run-shared-framework.py) · [Legacy metadata probe](legacy-metadata-probe.py) · [API reset diagnostic](test_legacy_reset.py)

Reviewed HEAD: `9f975eb967f6a0aa19f925fabf7bec79a5778784` (base `dev`). Author: davelopez. Live HEAD unchanged at final check; no reviews/comments posted.

John requested this review on 2026-10-11, with #23991 launched first.

## Current findings

- P2: after an ordinary metadata reset normalizes a historical wrapped Zarr store, persisted `store_root` still names the removed wrapper; published XML consumer fails. Verified through API reset and the existing compatibility tool.
- P2: the included #24004 cherry-pick is an older iteration; shared original/converted inputs still resolve to the original format. Real-model and end-to-end probes reproduce it. Underlying bug predates this branch; this is incomplete dependency readiness.
- P2: Vizarr 0.1.9 prerequisite is merged/published, but the branch still pins 0.1.8.

#24004 dependency: actual carried commit is `4cd1fed0ea4`, not reviewed HEAD `6ea906adf6b4bc3863d1765ba0e3b58fbb2a8f82`. The later head's Python 3.8 and fixture collision blockers were not misattributed to this branch.

## Validation and risks

95 focused unit tests and 5 framework cases passed. Two correctness probes reproduced the findings, including ordinary API reset/consumer behavior. CI: 55 success, 3 skipped. Persistent layout/API compatibility and deliberately unsupported old wrapped stores need an explicit human decision; details in the review.

## Resources

Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24005/` (clean; no Galaxy source edits).
CI cache: `/Users/jxc755/projects/ci-artifacts/galaxy/pr/24005/`; artifact catalog empty, live check statuses inspected. Resources retained while open. Coordinator handles queue/commits/sync; reviewer posted nothing.

## Delivery — 2026-10-11

John [posted the three findings](https://github.com/galaxyproject/galaxy/pull/24005#issuecomment-6112215305) at 2026-10-11T18:24:04Z, with his caveat that he is unsure how much is relevant and a question about the Vizarr prerequisite. This was a comment, not a formal request-changes review. HEAD unchanged; open, out of draft. Ball with the author; resources retained.

## Morning check — 2026-10-12

Open, draft; live HEAD `03e38ae61aa0e822e5814ce19cc9c75309da3faf`. CI snapshot: 5 in progress, 1 neutral, 38 queued, 3 skipped. New head `03e38ae61aa0`; author converted the PR to draft, CI queued/running, no new discussion reply. Findings already delivered; ball with author until ready. Do not present old-head findings as verified current blockers.

## Morning check — 2026-10-14

Open, ready; live head `0acdecef3ce4ee30a63735f49422b68e8bce11ec`. CI: 2 failure, 3 skipped, 56 success. Ready, new reviewed-by-Marius head. Author reports legacy metadata cleanup, the final #24004 dependency, and Vizarr 0.1.9 included. Marius delivered a new review and opened davelopez/galaxy#8 for compatibility with published store_root wrappers; await author handling. This refresh does not verify those fixes or assign CI failures.
