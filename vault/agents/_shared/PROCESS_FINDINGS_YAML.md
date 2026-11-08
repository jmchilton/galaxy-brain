A review round runs on findings YAML when John asks for it, or when its record already has `review_<N>_findings.yml`. It follows [PROCESS_INITIAL_REVIEW.md](PROCESS_INITIAL_REVIEW.md) with the changes below; trim and respond follow the sections here instead of their own process docs. N is the review round, 0 for the first. RF below is `~/projects/repositories/galaxy-brain/review-factory/bin/review-factory`.

## Verify and fix

The verifier works as [PROCESS_INITIAL_REVIEW.md](PROCESS_INITIAL_REVIEW.md) says, with the same filters, branch rules and test rules, but writes one file, `REVIEW_DIRECTORY/review_<N>_findings.yml`, in place of `verified_review.md`, `filtered_findings.md`, `verified_findings_checklist.md` and `*_branch_details.md`:

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

- Number findings once: `P<priority> <n>` for findings to post, `F<n>` for filtered ones. Ids never change afterwards.
- Every filtered item, including a follow-up issue that no longer makes sense, is an `F` finding with `include: false` and `filtered`. Its category is one of `disproved`, `not_actionable`, `relitigates_pr`, `pre_existing`, `comment_nit`, `doctest`, `prop_vitest`, matching the filter list.
- Write text fields as Markdown, without the `###` heading, `<details>` blocks or the "Fixed on the review branch" line; compose adds those. When the branch fixes a finding, `fix` says what the commit does ("Added …"), not what someone should do. Leave out optional fields rather than leaving them empty.
- A finding a reviewer calls optional is still a finding; say so in its text. A report's notes that aren't labeled findings stay out, and so does `risks.md`, which compose adds by itself.
- Multi-line text uses `|` block scalars, indented under its key. Quote a title or one-line value that contains `: `, a comma inside `{…}`, or that starts with a backtick.
- Every `discovered_by` profile must be one the coordinator ran. Name models by display name.
- Leave every action false; John checks them.

Before finishing, run `RF validate REVIEW_DIRECTORY` and fix every error.

## Review agent details and notes

The coordinator, which launched every run, gives the verifier the `agents` entries: one per review run, `{profile, path, model, effort}`, with `path` the profile's path under `vault/agents/`, e.g. `_shared/reviewers/default.md`. They replace `initial_review_agents.md`. After the verifier finishes, the coordinator checks them, then creates `johns_review_<N>_comment_note.md`, plus `johns_review_<N>_pr_note.md` when there's a review branch, each holding only `<!-- John's words for the comment; must not be empty to post -->` (or `… for the review-branch PR body …`), and runs `RF validate` again.

There's no compose subagent and no `initial_response_action.md`. Instead, run `RF status --record REVIEW_DIRECTORY` and `RF compose comment --record REVIEW_DIRECTORY --preview`, and in the report show John the status line and the preview. Link the YAML and the notes from `index.md`.

## Trim

John drops a finding by setting its `include: false`, checks actions under `actions`, and writes notes. When `RF status` prints a `✂️ Trim:` line, or John asks to reword or to re-include an `F` item, a trim agent:

- Re-reads the YAML before every write, and never changes `include` or `actions`.
- Follows the drop and restore list from `RF status`. It creates `pr_<PR_NUMBER>_round_<N>_rev_<m+1>` from the reviewed commit, cherry-picks the kept commits in order, and cherry-picks restored commits from the earlier revisions they name. A commit `RF status` asks about goes to John.
- Appends the new revision to `branches` with its commits, and leaves earlier revisions in place. Then it pushes the branch to John's fork.
- Gives a re-included `F` item a new `P` id after verifying it, along with full text and any fix commit. Rewording edits the text fields only.
- Runs `RF validate` and `RF status` again, which shouldn't print a trim line any more.

## Respond

For the checked actions, in the order of [PROCESS_RESPOND_TO_INITIAL_REVIEW.md](PROCESS_RESPOND_TO_INITIAL_REVIEW.md):

- With Pull request checked, run `RF compose pr --record REVIEW_DIRECTORY` and `RF compose pr --title …`. Open the PR from the review branch on John's fork against the PR's head branch with that title and body, then run `RF compose comment --record REVIEW_DIRECTORY --pr-url <url>`.
- Otherwise, run `RF compose comment --record REVIEW_DIRECTORY`.
- If any command exits non-zero, stop and report its errors to John. Post stdout unmodified, as the checked comment type (`gh pr review --approve|--comment|--request-changes --body-file -`, or `gh pr comment --body-file -` for Comment). Warnings go to John and don't block.
- Push, Issue and Approve and merge are handled as in [PROCESS_RESPOND_TO_INITIAL_REVIEW.md](PROCESS_RESPOND_TO_INITIAL_REVIEW.md).

Afterwards, update `index.md` and `MY_REVIEWS.md`, and set the delivered actions back to false. The posted text is on GitHub, so nothing records it in the vault.
