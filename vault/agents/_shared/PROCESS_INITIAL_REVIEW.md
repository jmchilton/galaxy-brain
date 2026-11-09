@REPOSITORY_REVIEWS.md

Below, PROJECT is the repository the PR belongs to (e.g. galaxy, planemo, pulsar, gxformat2); one agent may cover several. N is the review round, 0 for the first; reports and `risks.md` for later rounds go in `REVIEW_DIRECTORY/round_<N>/`. RF is `~/projects/repositories/galaxy-brain/review-factory/bin/review-factory`; if it says it isn't built, run `make review-factory-build` in that checkout, after `npm ci` in `review-factory/` when it has no `node_modules`.

## Security

Security findings and sensitive evidence instead follow [SECURITY_REPORTS.md](SECURITY_REPORTS.md): write them directly to John's home directory, never into the repository. For mixed reviews, keep only ordinary findings in the normal record.

## Initial review

### Run reviews in subagents

First take a `review` snapshot of the PR head per [PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md](PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md), on every round.

Reading a PROJECT PR's diff plus surrounding code burns a lot of context; keep the main session as a coordinator. Pick every applicable profile from the [shared reviewer registry](reviewers/index.md) and the agent directory's own `reviewers/index.md`, when present, and run each in its own subagent, given the profile, the PR and its worktree, the PR's review directory, its private security output destination, and the agent's own review guidance. Below, `<profile_path>` is a profile's path under `vault/agents/`, e.g. `_shared/reviewers/default.md`.

### Effort

Set every subagent's effort explicitly, both reviews and verify/fix. The default effort for reviewers should be high when John asks for a detailed or thorough review, low when they ask for a fast or simple one, medium otherwise. Times to override this default:

- If the PR is a bug fix against a release branch, run any selected gx_test_challenger, generic_test_challenger, or thermo_review reviewers at low effort.
- Run any selected gx_risk_assessment or generic_risk_assessment reviewers at low effort.
- If John requests a low effort fix and the test challenger recommends new E2E tests - please bump the effort level up to medium for the verification agent and make it clear a low effort review is an agent setting and doesn't mean we shouldn't implement missing API/Integration/E2E tests.

Never leave it to the subagent's default.

### Verify and fix

Once all reports are in, launch one subagent to verify the findings and estimate the effort to fix each P1, P2, and P3. If any single fix is under about 200 changed lines (code, tests, docs) and the PR's worktree is available, the subagent creates the review branch `pr_<PR_NUMBER>_round_<N>_rev_0` there from the reviewed commit and fixes each finding under that threshold, one commit per finding.

Slow test layers (Selenium, API, integration) are no reason to skip a fix; write the test. Run only the tests the branch adds or edits, one at a time — not their whole suite or framework, and not tests the branch doesn't touch; CI covers the rest. If a written test couldn't be run, say so in its finding.

The verifier writes one file, `REVIEW_DIRECTORY/review_<N>_findings.yml`: findings aggregated across reports (skipping reports without P-labeled findings), with duplicates merged. Sharpen findings the fix clarified, and filter the ones listed below. The posted response is composed from this file, so nothing else holds findings.

```yaml
round: 0
reviewed_commit: <full 40-character SHA>
agents:      # as the coordinator gives them
  - {profile: default, path: _shared/reviewers/default.md, model: Claude Opus 5.5, effort: medium}
verification: {model: Claude Opus 5.5, effort: medium}
branches:    # omit when there's no review branch
  - name: pr_<PR_NUMBER>_round_<N>_rev_0
    revision: 0
    head: <short SHA of the branch tip>
    pr_title: <a PR title for the branch's fixes>
    description: |
      One readable paragraph on what the branch does. Write `pr_<PR_NUMBER>_round_<N>_rev_0` and `<short reviewed SHA>` in backticks; they get linked.
    commits:   # oldest first, exactly the commits on top of the reviewed commit
      - sha: <short SHA>
        subject: <commit subject>
        detail: <one sentence of detail, starting lowercase>
        findings: [P2 1]
actions: {approve: false, approve_and_merge: false, comment: false, review_comment: false, request_changes: false, pull_request: false, push: false, issue_refactor: false, issue_galaxy_brain: false}
followup_target: dev   # only with followup_refactor_issue.md
findings:
  - id: P2 1
    include: true
    title: <title>
    summary: <one line for John; never posted>
    implementation_verified: true
    issue: |
      <issue paragraph>
    issue_details: |
      <optional>
    evidence: |
      <optional>
    fix: |
      <suggested fix paragraph>
    fix_details: |
      <optional>
    discovered_by:
      - {profile: default, model: Claude Opus 5.5, effort: medium}
  - id: F1
    include: false
    title: <title>
    summary: <one line for John>
    filtered:
      category: relitigates_pr
      reason: <one line>
    discovered_by:
      - {profile: default, model: Claude Opus 5.5, effort: medium}
```

- Number findings once: `P<priority> <n>` for findings to post, `F<n>` for filtered ones. Ids never change afterwards, so gaps show dropped findings.
- Set `implementation_verified: true` when a reproduction, a test or the fix confirmed the finding; leave it out otherwise.
- Write text fields as Markdown, without the `###` heading, `<details>` blocks or the "Fixed on the review branch" line; compose adds those. When the branch fixes a finding, `fix` says what the commit does ("Added …"), not what someone should do.
- Leave out optional fields rather than leaving them empty. Skip evidence that is self-evident and a suggested fix the problem makes obvious.
- A finding a reviewer calls optional is still a finding; say so in its text. A report's notes that aren't labeled findings stay out, and so does `risks.md`, which compose adds by itself.
- `discovered_by` lists every review that raised the finding, and each profile must be one the coordinator ran. Name models by display name, e.g. `Claude Opus 5.5` or `GPT-6.1`, never an API id like `claude-opus-5-5`.
- Multi-line text uses `|` block scalars, indented under its key. Quote a title or one-line value that contains `: `, a comma inside `{…}`, or that starts with a backtick.
- Leave every action false; John checks them.

If `REVIEW_DIRECTORY/thermo_followup_refactor_issue.md` exists, check that it still makes sense as a follow-up issue given the verified findings and fixes. If it does, write the full issue, revised to fit, to `REVIEW_DIRECTORY/followup_refactor_issue.md` and set `followup_target`; if not, filter it.

The verifier filters these out, each as an `F` finding with `include: false` and a one-line `filtered.reason`, under the category in parentheses:
- Findings disproved by verification (`disproved`).
- Findings that aren't actionable, regardless of effort, and a follow-up refactor issue that no longer makes sense (`not_actionable`).
- Findings that re-litigate a decision called out explicitly in the PR description (`relitigates_pr`).
- Findings about pre-existing code the PR doesn't touch (`pre_existing`).
- Especially nit-picky comment adjustments; incorrect comments remain findings (`comment_nit`).
- Adding Galaxy Doctests; we need to update the best practices to dissuade these (`doctest`).
- Requests for Vitest tests that only check a prop reaches a class, attribute or style (`prop_vitest`).

Before finishing, the verifier runs `RF validate REVIEW_DIRECTORY` and fixes every error.

### Review agent details and notes

The coordinator, which launched every subagent and knows their models and efforts, gives the verifier the `agents` entries: one per review run, `{profile, path, model, effort}`, with `path` the profile's path under `vault/agents/`. After the verifier finishes, the coordinator checks them, then creates `johns_review_<N>_comment_note.md`, plus `johns_review_<N>_pr_note.md` when there's a review branch, each holding only `<!-- John's words for the comment; must not be empty to post -->` (or `… for the review-branch PR body …`), and runs `RF validate` again.

### Report

Push any review branch to John's fork; it reaches the author's branch only when John checks Push.

Run `RF status --record REVIEW_DIRECTORY` and `RF compose comment --record REVIEW_DIRECTORY --preview`, and in the report show John the status line and the preview. Link the findings YAML and the notes from `index.md`.

On the record's landing page, in Obsidian or the Herdr app, John then unchecks findings to drop, checks the actions to take, and writes the notes. They ask for [PROCESS_TRIM_FINDINGS.md](PROCESS_TRIM_FINDINGS.md) when the status shows a `✂️ Trim:` line or text needs rewording, and for [PROCESS_RESPOND_TO_INITIAL_REVIEW.md](PROCESS_RESPOND_TO_INITIAL_REVIEW.md) to post.

The coordinator updates the index and handles galaxy-brain commits and pushes per [VAULT_SYNC.md](VAULT_SYNC.md).
