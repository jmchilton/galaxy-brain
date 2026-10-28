@REPOSITORY_REVIEWS.md

Below, PROJECT is the repository the PR belongs to (e.g. galaxy, planemo, pulsar, gxformat2); one agent may cover several.

## Security

Security findings and sensitive evidence instead follow [SECURITY_REPORTS.md](SECURITY_REPORTS.md): write them directly to John's home directory, never into the repository. For mixed reviews, keep only ordinary findings in the normal record.

## Initial review

### Run reviews in subagents

First take a `review` snapshot of the PR head per [PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md](PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md), on every round.

Reading a PROJECT PR's diff plus surrounding code burns a lot of context; keep the main session as a coordinator. Pick every applicable profile from the [reviewer registry](reviewers/index.md) and run each in its own subagent, given the profile, the PR and its worktree, the PR's review directory, its private security output destination, and the agent's own review guidance.

### Effort

Set every subagent's effort explicitly, both reviews and verify/fix. The default effort for reviewers should be high when John asks for a detailed or thorough review, low when they ask for a fast or simple one, medium otherwise. Times to override this default:

- If the PR is a bug fix against a release branch, run any selected gx_test_challenger, generic_test_challenger, or thermo_review reviewers at low effort.
- Run any selected gx_risk_assessment or generic_risk_assessment reviewers at low effort.
- If John requests a low effort fix and the test challenger recommends new E2E tests - please bump the effort level up to medium for the verification agent and make it clear a low effort review is an agent setting and doesn't mean we shouldn't implement missing API/Integration/E2E tests.

Never leave it to the subagent's default.

### Verify and fix

Once all reports are in, launch one subagent to estimate the effort to fix each P1, P2, and P3. If any single fix is under about 200 changed lines (code, tests, docs) and the PR's worktree is available, the subagent creates the review branch `pr_<PR_NUMBER>_review_0` there from the reviewed commit (next free number on later rounds) and fixes each finding under that threshold, one commit per finding, then writes `REVIEW_DIRECTORY/review_<n>_branch_details.md` (matching the branch number): one readable paragraph on what the branch does, then a list of its commits, each with its short SHA, subject, and one sentence of detail. Either way it writes `verified_review.md`: findings aggregated across reports (skipping reports without P-labeled findings) with duplicates merged, and renumbered `P<priority> <n>`, flagged `(implementation verified)` when confirmed by a reproduction, test, or the fix. Sharpen findings the fix clarified; filter disproved ones (below). Write each finding as below. Include `<details>` blocks only when needed; skip evidence that is self-evident and a suggested fix the problem makes obvious. Provenance lists every review that raised the finding; the "Verified via" sentence appears only on flagged findings.

Slow test layers (Selenium, API, integration) are no reason to skip a fix; write the test. Run only the tests the branch adds or edits, one at a time — not their whole suite or framework, and not tests the branch doesn't touch; CI covers the rest. If a written test couldn't be run, say so in its finding.

```markdown
### P<priority> <n>: <title> (implementation verified)

<issue paragraph>

<details><summary>Details</summary>

<issue details>

</details>

<details><summary>Evidence</summary>

<evidence>

</details>

<suggested fix paragraph>

<details><summary>Details</summary>

<suggested fix details>

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [<profile>](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/<profile>.md) via <model> at <effort> effort. Verified via <model> at <effort> effort.

</details>
```

If `REVIEW_DIRECTORY/thermo_followup_refactor_issue.md` exists, check that it still makes sense as a follow-up issue given the verified findings and fixes. If it does, write the full issue, revised to fit, to `REVIEW_DIRECTORY/followup_refactor_issue.md`; if not, filter it (below).

`verified_review.md` becomes the posted response, so it holds only findings to post. The verifier filters out:
- Findings disproved by verification.
- Findings that aren't actionable, regardless of effort.
- Findings that re-litigate a decision called out explicitly in the PR description.
- Findings about pre-existing code the PR doesn't touch.
- A follow-up refactor issue that no longer makes sense.
- Especially nit-picky comment adjustments (incorrect comments should remain issues)
- Adding Galaxy Doctests (we need to update the best practices to disuade these)

Write each filtered item, with a one-line reason, to `REVIEW_DIRECTORY/filtered_findings.md` for John. Don't create this file if nothing was filtered.

### Review agent details

The coordinator, which launched every subagent and knows their models and efforts, writes `REVIEW_DIRECTORY/initial_review_agents.md`, one profile bullet per review run. Include the "Reviewed with" line only when PROJECT is galaxy:

```
<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [<profile>](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/<profile>.md) was run via <model> at <effort> effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via <model> at <effort> effort.

</details>
```

### Respond

Push any review branch to John's fork; it reaches the author's branch only when John checks Push below.

Have a subagent with low effort assemble an initial response from these pieces following [PROCESS_COMPOSE_INITIAL_REVIEW_RESPONSE.md](PROCESS_COMPOSE_INITIAL_REVIEW_RESPONSE.md).

Then write `initial_response_action.md` for John to check one or more options; leave out Pull request and Push when there is no review branch, the refactor Issue when `REVIEW_DIRECTORY/followup_refactor_issue.md` doesn't exist, and the galaxy-brain Issue when `REVIEW_DIRECTORY/learning_galaxy_followup_issue.md` doesn't exist.

```markdown
- [ ] Approve the PR with the response
- [ ] Approve and merge the PR with the response
- [ ] Comment with the response
- [ ] Review comment with the response
- [ ] Request changes with the response
- [ ] Pull request: open a PR from the review branch
- [ ] Push: push the review branch into the PR
- [ ] Issue: open the follow-up refactor issue
- [ ] Issue: open the galaxy-brain research follow-up issue
```

When `verified_review.md` has findings, also write `verified_findings_checklist.md`: one checked box per finding, in order, then an Other Actions section left blank for John. John unchecks findings to drop and adds free-text requests, then asks for [PROCESS_TRIM_FINDINGS.md](PROCESS_TRIM_FINDINGS.md).

```markdown
- [x] P1 1: <title>
- [x] P2 1: <title>

Other Actions:
```

The coordinator updates the index and handles galaxy-brain commits and pushes per [VAULT_SYNC.md](VAULT_SYNC.md).
