Launchers for gh-ci-artifacts reviews records; format in [LAUNCHERS.md](../../../agents/_shared/LAUNCHERS.md).

## 💭 New session
agent_dir: dev_tooling
name: rv-{name}

Let's talk about jmchilton/gh-ci-artifacts#{name}. The review record is {record}.

## 🔎 Review
status: untracked
agent_dir: dev_tooling
name: rv-{name}

Run ./REVIEW.md on jmchilton/gh-ci-artifacts#{name}

## 🟣 Merge pull request
status: active
agent_dir: dev_tooling
name: mg-{name}
profile: Sonnet (medium)

Merge pull request jmchilton/gh-ci-artifacts#{name} according to the processes described in AGENTS.md. Clean up relevant worktrees.

## 💬 Respond to review
status: active
agent_dir: dev_tooling
name: rr-{name}
profile: Sonnet (medium)

Respond to jmchilton/gh-ci-artifacts#{name} following ../_shared/PROCESS_RESPOND_TO_INITIAL_REVIEW.md. REVIEW_DIRECTORY is {record}. This launch is my approval to run the actions checked in the latest round's findings YAML (or its initial_response_action.md, for a round on Markdown), which may include opening pull requests, creating issues, pushing commits to the target PR branch, and posting comments.

## ✂️ Trim findings
status: active
agent_dir: dev_tooling
name: tf-{name}

Trim the findings for jmchilton/gh-ci-artifacts#{name} following ../_shared/PROCESS_TRIM_FINDINGS.md. The review record is {record}. Requests beyond the include toggles: <user_input_here>

## ⚡ Quick merge
status: untracked, active
agent_dir: dev_tooling
name: qm-{name}
profile: Sonnet (medium)

Quick merge pull request jmchilton/gh-ci-artifacts#{name} - skip the initial review process. Check it is still open, not a draft and mergeable; if not, stop and report without merging. Otherwise merge it according to the processes described in AGENTS.md. This launch is my approval to merge. Then clean up the review record and relevant worktree (if present).

## 🗄️ Shelve
status: active
agent_dir: dev_tooling
name: sh-{name}
profile: Sonnet (medium)

Shelve the review of {name} per ../_shared/PROCESS_SHELVE.md. The record is {record}. Blocked on: <user_input_here>
