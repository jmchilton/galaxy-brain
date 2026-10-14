## Tracking ended — 2026-10-14

PR **merged** at `2026-10-14T06:38:12Z`; final head `c1ccdf4f511905cf61f4b4abd3984aa3447e2f3b`. Removed from the queue and archived. Worktree retained: clean at `9008c8cb17c8fc4116e3afca7da707655349812d`, no upstream, and that old head is not an ancestor of the merged head. WORKTREES.md requires John’s confirmation before removing it. Historical findings below retain their original reviewed commits; this state check does not verify the final fixes.

# galaxy #23954 — [26.1] Fix expression parameter connections in extracted workflows

[PR #23954](https://github.com/galaxyproject/galaxy/pull/23954) · [Initial review](review-2026-10-11.md) · [Unposted draft](draft-review.md) · [API reproduction](test_saved_conditional_selector.py) · [Sanitized output](reproduction-output.txt)

Status: active; initial review complete, initial recommendation **request changes** for one P2 extraction regression. John [**approved** on GitHub](https://github.com/galaxyproject/galaxy/pull/23954#pullrequestreview-5483997689) with the finding in his review body on 2026-10-11 at 16:14:17 UTC. Delivery: **posted**; author decision pending. Open, out of draft; GitHub checked 2026-10-11.

Reviewed HEAD: `9008c8cb17c8fc4116e3afca7da707655349812d` (base `release_26.1`), unchanged at final check. Author: mvdbeek.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/23954/`. CI cache: `/Users/jxc755/projects/ci-artifacts/galaxy/pr/23954/`.

Validation: 131 workflow unit tests passed, 1 skipped; both submitted API regressions passed. A saved workflow with an expression-connected conditional select runs successfully, then both extraction endpoints return 500; disabling only the new reconnect pass returns 200 for both. This is separate from an existing workflow-import discriminator limitation. CI has 58 successful checks and 1 skipped CWL job; no discussion or reviews at final check.

John requested this review on 2026-10-11. No Galaxy source edits or GitHub delivery were performed by the agents; John delivered the review. See the full review for evidence, integration-test assessment and Galaxy risk assessment.

Independent re-review requested by John: [Finding verification](finding-verification-2026-10-11.md) agrees with the P2 for existing saved workflows; [API probe](test_independent_selector_verification.py) imports the historical edge through the normal API and shows HEAD 500/500 versus exact parent extraction 200/200. [Single copy-ready comment](single-comment.md); John included the single-comment finding in his approval review.

John’s approval also expresses a preference to tackle the parameter-extraction work and this issue on `dev`, in light of notebook-extraction changes. This is a preference expressed to the author, not authorization to implement or retarget the PR. Preserve the P2 evidence and initial recommendation; the latest formal review state is APPROVED. No later author reply at the delivery check.

## Morning check — 2026-10-12

Open, ready; live HEAD `9008c8cb17c8fc4116e3afca7da707655349812d`. CI snapshot: 1 skipped, 58 success. Live head and discussion unchanged since the prior tracking refresh; existing delivery/author-wait status remains. No new action for John identified.
