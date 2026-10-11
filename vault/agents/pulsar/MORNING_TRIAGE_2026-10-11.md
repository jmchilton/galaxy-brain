# Pulsar morning triage — 2026-10-11

Live GitHub sweep of all 13 open PRs and 53 open issues. Current master: `b420e1e7434b40ac9b3f0cf1031f918ad9a70493` (merged #537). Local repository master remains at `77af666`; it was not advanced during this status sweep.

## Recommended order

1. **Unblock framework compatibility after #537.** [#530 CI diagnosis](../../repositories/pulsar/reviews/active/530/ci-triage-2026-10-11.md) establishes that all three red framework legs abort at collection with the same missing `pulsar.client.build_client_manager` import as master. No tests executed. #537 discussion already acknowledges Galaxy-side explicit-import migration and temporary red status. Coordinate that work, then rerun #530; current-head code review remains outstanding. This is not evidence that #530 introduced a regression.
2. **Finish the changelog migration.** [#545 review](../../repositories/pulsar/reviews/active/545/review-2026-10-11.md): its own direct-CHANGELOG guard rejects the intentional migration. The existing `no changelog` label exemption also addresses release coverage of this migration PR. No label or GitHub comment was changed in this sweep. All 14 release-script tests and an isolated release creation smoke test passed.
3. **Rebase merge candidates.** #518 is conflicting at unchanged `a030789`, so “awaiting merge” alone was stale. Rebase it first, then its draft child #529. #517 and draft #523 also conflict. #486 needs a coordinated rebase with Galaxy #23326. #522 conflicts, but Marius asks whether merged #537 supersedes it: decide whether to close it before rebasing. #473 remains with Keith for the acknowledged rebase onto merged #493.
4. **Take #416 into the fix-a-thon.** Nate's October 7 request clarifies that recent corruption concerns `final_status`, not the `launch_config` named in the title. Reproduce zero-length metadata and design bounded recovery rather than endless monitor errors.
5. **Address cleanup before release.** New #541 reports SIGKILL-only cancellation skipping Docker cleanup traps; queued #542 concerns the Docker EXIT handler replacing cvmfsexec cleanup. Coordinate both with Galaxy's corresponding helpers.

## Queue reconciliation

Added active tracking for #545 and outstanding own PRs #517, #522, #523, #529, and #486. Refreshed existing #473/#518/#530 snapshots. No PR in the previous queue has merged or closed. Added issue records for #541 (queued) and #544 (wip via #545); promoted #416 from untriaged to queued. Both open issues assigned to jmchilton, #498 and #520, were already tracked. No delegated issue records exist to sweep.

#498's runner migration is complete in the current workflow: all `pulsar.yaml` jobs use ubuntu-24.04. Its remaining packaging/support-policy follow-up is separate; the historical research explicitly leaves dropping Python 3.7 support undecided. #520 retains John's release prerequisites. #492 remains blocked on open #486 according to the issue's recorded sequencing.

Other old open PRs all conflict: #401 (ARC), #399 (offline staging delegation), draft #394 (publish error handling), and draft #370 (file collector). They were not newly added to the active review queue during this sweep; check author interest and scope before reviving them.

## Worktree and earlier-work audit

Preserved all open-PR worktrees. `pr/530` has an unresolved merge in HISTORY.rst, client/exceptions.py, managers/staging/post.py, and test/job_directory_test.py, plus staged merge changes; no attempt was made to resolve or reset someone else's work. The `htcondor2-rebase` and newly present `failure-reasons-492` branches have no upstream and were preserved. A branch's existence alone does not establish that #492 has been unblocked or implemented.

The published `missing-file-retry-budget` branch is at `9223744`, with `b68bc85` (“Fix per-exception retry budget accounting”) after the September 22 review. That old request-changes verdict predates these fixes; do not present its accounting finding as a current blocker without reviewing the later commits. No corresponding open PR exists in the live sweep.

Removed 13 clean worktrees for merged/closed PRs after rechecking their GitHub state, local changes and published commits, using `ghwt rm`: #538, #528, #532, #536, #540, closed #521, #534, #519, #539, #543, #503, #524, and #537. #537's clean no-upstream checkout matched its merged PR head exactly. No branches were force-pushed or PR code changed.

## Delivery and validation

Ordinary review drafts and tracking are internal. No GitHub reviews, comments, labels, or issue state changes were posted. #545 received a focused current-head review; #530 received CI diagnosis only. Other PRs received status/dependency triage, not a new code review. Agent/repository records require no frontmatter or generated catalog changes.

Validation: `make validate` passed (122 files, zero errors, 15 advisory warnings). All relative links in the 18 changed ordinary files resolve; scoped `git diff --check` passed.
