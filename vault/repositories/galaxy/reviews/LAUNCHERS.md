Launchers for Galaxy reviews records; format in [LAUNCHERS.md](../../../agents/_shared/LAUNCHERS.md).

## 💬 Respond to review
status: active
agent_dir: gx_reviews
name: rr-{name}
profile: Sonnet (medium)

Respond to galaxyproject/galaxy#{name}. This is launch is my approval to run the action outlined in the relevant initial_response_action.md file - which may include opening pull requests, creating issues, push commits to the target PR branch, and posting comments.

## ✂️ Trim findings
status: active
agent_dir: gx_reviews
name: tf-{name}

Trim the findings for galaxyproject/galaxy#{name} following ../_shared/PROCESS_TRIM_FINDINGS.md. The review record is {record}.

## 💭 New session
agent_dir: gx_reviews
name: rv-{name}

Let's talk about galaxyproject/galaxy#{name}. The review record is {record}.

## 🔎 Review
status: untracked
agent_dir: gx_reviews
name: rv-{name}

Launch a review of galaxyproject/galaxy#{name}

## 🔁 Rework review into PR
status: active
agent_dir: gx_reviews
name: rw-{name}
profile: Sonnet (medium)

Rework the review of galaxyproject/galaxy#{name} into a pull request description following ../_shared/PROCESS_REWORK_REVIEW_TO_PR.md. REVIEW_DIRECTORY is {record}.

## ⚡ Quick merge
status: untracked, active
agent_dir: gx_reviews
name: qm-{name}
profile: Sonnet (medium)

Quick merge pull request galaxyproject/galaxy#{name} - skip the initial review process. Check it is still open, not a draft, mergeable and CI is green; if not, stop and report without merging. Otherwise merge it according to the processes described in AGENTS.md. This launch is my approval to merge. Then clean up the review record and relevant worktree (if present).
