@REPOSITORY_REVIEWS.md

Below, PROJECT is the repository the PR belongs to (e.g. galaxy, planemo, pulsar, gxformat2); one agent may cover several.

## Security

Security findings and sensitive evidence instead follow [SECURITY_REPORTS.md](SECURITY_REPORTS.md): write them directly to John's home directory, never into the repository. For mixed reviews, keep only ordinary findings in the normal record.

## Initial review

**Run reviews in subagents.** Reading a PROJECT PR's diff plus surrounding code burns a lot of context; keep the main session as a coordinator. Pick every applicable profile from the [reviewer registry](reviewers/index.md) and run each in its own subagent, given the profile, the PR and its worktree, the PR's review directory, its private security output destination, and the agent's own review guidance.

**Verify and fix.** Once all reports are in, launch one subagent to estimate the effort to fix each P1, P2, and P3. If any single fix is under about 200 changed lines (code, tests, docs) and the PR's worktree is available, the subagent creates `pr_<PR_NUMBER>_fix_0` there from the reviewed commit (next free number on later rounds) and fixes each finding under that threshold, one commit per finding. Either way it writes `verified_review.md`: findings aggregated across reports with duplicates merged, and renumbered `P<priority> <n>`, flagged `(implementation verified)` when confirmed by a reproduction, test, or the fix. Sharpen findings the fix clarified; drop disproved ones with a reason. Write each finding as below. Include `<details>` blocks only when needed; skip evidence that is self-evident and a suggested fix the problem makes obvious. Provenance lists every review that raised the finding; the "Verified via" sentence appears only on flagged findings.

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

Discovered by [<profile>](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/<profile>.md) via <model> at <effort> effort. Verified via <model> at <effort> effort.
```

**Respond.** Push any fix branch to John's fork; it reaches the author's branch only when John checks Push below. Write John's response, `initial_response_draft.md`, from `verified_review.md` per the [Review File Docs](../../repositories/_defaults/reviews/FILE_DOCS.md): P1 and P2 only, citing fix branch commits where they strengthen a finding. Leave out review-process archeology such as labels, estimates, and dropped findings. Template:

```markdown
Reviewed by <profile> (<model>, <effort> effort), <profile> (<model>, <effort> effort).

**P1: <title>** — <file:line>. <problem and suggested fix> [Fix](<commit URL>)

**P2: <title>** — <file:line>. <problem and suggested fix>
```

Then write `initial_response_action.md` for John to check one or more options; leave out the last two when there is no fix branch:

```markdown
- [ ] Approve the PR with the response
- [ ] Comment with the response
- [ ] Review comment with the response
- [ ] Request changes with the response
- [ ] Pull request: open a PR from the fix branch
- [ ] Push: push the fix branch into the PR
```

The coordinator updates the index and handles galaxy-brain commits and pushes per [VAULT_SYNC.md](VAULT_SYNC.md).
