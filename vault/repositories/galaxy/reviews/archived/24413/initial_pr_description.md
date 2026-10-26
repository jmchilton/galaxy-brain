(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at low effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at low effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment · Model: claude-opus-5-5 · Effort: low · Reviewed commit: 4f2e4126a6b

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It turns a 500 into success for PUT of workflows embedding subworkflows; hidden subworkflow StoredWorkflows created during update are now unpublished, matching create's default (`publish=False`). No API, schema, or format changes; trivially revertable.

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24413_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24413_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24413_review_0) (from 4f2e4126a6b) strengthens the PR's API test so it guards the round trip and the `published` value, not just the absence of the 500. Test passes locally.

- [`1b881f03d8a`](https://github.com/jmchilton/galaxy/commit/1b881f03d8a) Assert embedded subworkflow content survives PUT round trip — checks the re-exported subworkflow still has exactly the `cat1` tool step.
- [`5b6156bcc8a`](https://github.com/jmchilton/galaxy/commit/5b6156bcc8a) Assert subworkflows built on PUT are not published — lists workflows with `show_hidden` and asserts none are published.

</details>

</details>

### P3 1: Test only checks that a subworkflow step survives the PUT (implementation verified)

`test_update_with_unchanged_export_of_workflow_with_subworkflow` asserts one subworkflow step exists after the update. That passes if the embedded subworkflow were rebuilt empty or altered, and it doesn't pin the `published` value the new expression computes.

Assert the inner `cat1` tool step is still in the re-exported subworkflow, and that no workflow (hidden subworkflow StoredWorkflows included) is published after the PUT. Fixed in [`1b881f03d8a`](https://github.com/jmchilton/galaxy/commit/1b881f03d8a) and [`5b6156bcc8a`](https://github.com/jmchilton/galaxy/commit/5b6156bcc8a).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at low effort.

</details>
