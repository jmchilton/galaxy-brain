# Implementation debrief

Branch `issue-535-accept-iwc-policy-pin`, based on `origin/main` at `618853f0`. `ghwt create` branched off stale `8cf75251`; reset the empty branch before any work.

## Done

Both IWC vendor entries pinned to `fa25be50` (iwc#1366 merge commit), Copilot `upstream.prompt` re-vendored, both framing notes updated, superset finding recorded in `workflow-pr-review-command`, stale tier item removed from `galaxy-workflow-review/scenarios.md`.

## Red to green

No code. Moving the Copilot pin alone made `check:vendored` add one drift line for that entry. Re-vendoring removed it, leaving output identical to the base.

Re-vendored with curl instead of `sync:vendored --update`, which re-syncs every entry from local checkouts and would have re-pinned unrelated files.

## Superset comparison

Walked every Copilot section against `review.md` at `fa25be5`. Two differences: "Follow semantic versioning", which the command replaces with human versioning review, and unlabelled `workflow_outputs`, which the normal review caught and the first pass missed.

## Local gate

At `a449e174`, every step run separately: all pass except `check-vendored`, 8 drifts matching the base, none IWC. `make test` passed 496 of 496. `make casts` produced no diff.

At `b4369502`, which edits two notes only: same results except `make test`. Two runs failed only with `Test timed out in 60000ms` (6 of 496 in the full suite, 18 of 82 in `cast-mold` alone), on different tests each time, at load average 90 to 200 from other processes. Not confirmed clean. CI is the next clean run.

`validate-roadmap` needs `GH_TOKEN` when the unauthenticated GitHub rate limit is spent. It passed with one.
