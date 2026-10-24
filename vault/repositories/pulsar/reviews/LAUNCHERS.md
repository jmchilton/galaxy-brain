Launchers for pulsar reviews records; format in [LAUNCHERS.md](../../../agents/_shared/LAUNCHERS.md).

## 🔎 Review
status: untracked
agent_dir: pulsar
name: rv-{name}

Run ./REVIEW.md on galaxyproject/pulsar#{name}

## 🟣 Merge pull request
status: active
agent_dir: pulsar
name: mg-{name}
profile: Sonnet (medium)

Merge pull request galaxyproject/pulsar#{name} according to the processes described in AGENTS.md. Clean up relevant worktrees.

## 💬 Respond to review
status: active
agent_dir: pulsar
name: rr-{name}
profile: Sonnet (medium)

Respond to galaxyproject/pulsar#{name} following ../_shared/PROCESS_RESPOND_TO_INITIAL_REVIEW.md. REVIEW_DIRECTORY is {record}. This launch is my approval to run the checked actions in its initial_response_action.md, which may include opening pull requests, creating issues, pushing commits to the target PR branch, and posting comments.

## 🔁 Rework review into PR
status: active
agent_dir: pulsar
name: rw-{name}
profile: Sonnet (medium)

Rework the review of galaxyproject/pulsar#{name} into a pull request description following ../_shared/PROCESS_REWORK_REVIEW_TO_PR.md. REVIEW_DIRECTORY is {record}.

## ⚡ Quick merge
status: untracked, active
agent_dir: pulsar
name: qm-{name}
profile: Sonnet (medium)

Quick merge pull request galaxyproject/pulsar#{name} - skip the initial review process. Check it is still open, not a draft, mergeable and CI is green; if not, stop and report without merging. Otherwise merge it according to the processes described in AGENTS.md. This launch is my approval to merge. Then clean up the review record and relevant worktree (if present).
