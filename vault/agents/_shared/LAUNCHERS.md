Agent launch buttons for repository records, shown by the galaxy-brain Obsidian plugin (record note's ⋯ menu, right-click menu, and command palette). Each runs [`scripts/launch_agent.sh`](scripts/launch_agent.sh) after a confirm dialog that picks an agent profile from [`AGENT_PROFILES.yml`](AGENT_PROFILES.yml) (agent, model, effort).

One `## Label` per launcher. Leading `key: value` lines configure it; the rest is the prompt.

- `records:` `<repo>/<kind>` records it applies to, e.g. `galaxy/branches`. Comma-separate several.
- `status:` optional comma list of record statuses (the `<status>` directory) to show it on. `untracked` targets GitHub PRs (as `<repo>/reviews`) and issues (as `<repo>/issues`) in the repository view's GitHub tabs that have no record yet; only launchers listing it show there.
- `agent_dir:` directory under `vault/agents/` to start in.
- `name:` Herdr agent name; sanitized and de-duplicated by the script.
- `profile:` profile preselected in the dialog, by name; the first profile when unset.

Placeholders: `{repo}`, `{kind}`, `{status}`, `{name}` (branch name, PR or issue number), `{record}` (absolute record directory; empty for untracked items).

## 🐴 Implement
records: galaxy/issues
status: queued, wip, needs_decision, blocked
agent_dir: gx_workhorse
name: wh-{name}

Implement galaxyproject/galaxy#{name}. The issue record is {record}.

## 🛡️ Harden
records: galaxy/branches
status: active
agent_dir: gx_workhorse
name: hd-{name}

Re-harden branch {name}. BRANCH_DIRECTORY is {record}.

## ✨ Polish
records: galaxy/branches
status: active
agent_dir: gx_branches
name: po-{name}

Run ./POLISH_BRANCH.md {name}

## 🚦 Fix CI
records: galaxy/branches
agent_dir: gx_branches
name: ci-{name}
profile: Sonnet (high)

Fix CI on branch {name}. BRANCH_DIRECTORY is {record}. Diagnose each red check; fix the ones the branch caused, rerun the unrelated ones, and record the diagnosis in the branch notes.

## 🔀 De-conflict
records: galaxy/branches
status: active
agent_dir: gx_branches
name: dc-{name}
profile: Sonnet (high)

De-conflict branch {name}. BRANCH_DIRECTORY is {record}. Rebase it onto its actual base branch per the rebase rules in AGENTS.md, resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease` to the `jmchilton` fork, update the SHA in the branch record, and note the rebase in the branch notes.

## 🚀 Open PR
records: galaxy/branches
status: active
agent_dir: gx_branches
name: pr-{name}
profile: Sonnet (medium)

Open the PR for branch {name}. BRANCH_DIRECTORY is {record}. If the CI is done and green, open it directly otherwise open it as a draft waiting on CI. This launch is my approval of the PR open. Stop and ask if pr_description.md is missing. If no title is chosen, please pick the first one.

## 💬 Respond to review
records: galaxy/reviews
status: active
agent_dir: gx_reviews
name: rr-{name}
profile: Sonnet (medium)

Respond to galaxyproject/galaxy#{name}. This is launch is my approval to run the action outlined in the relevant initial_response_action.md file - which may include opening pull requests, creating issues, push commits to the target PR branch, and posting comments.

## 💬 Respond to review
records: galaxy/branches
status: active
agent_dir: gx_branches
name: br-{name}

Working on branch {name}. BRANCH_DIRECTORY is {record}. We received PR advice - can you check it out and address it (merging relevant PRs, cherry picking relevant commits, making local changes) unless it degrades the quality of the PR. After the changes have been made - please summarize what you did for John and show an example response with an agent marker. 

## ✂️ Trim findings
records: galaxy/reviews
status: active
agent_dir: gx_reviews
name: tf-{name}

Trim the findings for galaxyproject/galaxy#{name} following ../_shared/PROCESS_TRIM_FINDINGS.md. The review record is {record}.

## 💭 New session
records: galaxy/issues
agent_dir: gx_issues
name: is-{name}

Let's talk about galaxyproject/galaxy#{name}. The issue record is {record}.

## 💭 New session
records: galaxy/branches
agent_dir: gx_branches
name: br-{name}

Let's talk about branch {name}. The branch record is {record}.

## 💭 New session
records: galaxy/reviews
agent_dir: gx_reviews
name: rv-{name}

Let's talk about galaxyproject/galaxy#{name}. The review record is {record}.

## 🔎 Review
records: galaxy/reviews
status: untracked
agent_dir: gx_reviews
name: rv-{name}

Launch a review of galaxyproject/galaxy#{name}

## 🩺 Root cause
records: galaxy/issues
status: untracked
agent_dir: gx_workhorse
name: rc-{name}

Run ./ROOT_CAUSE.md on issue galaxyproject/galaxy#{name}

## 🛠️ Work on
records: galaxy/issues
status: untracked
agent_dir: gx_workhorse
name: wo-{name}

Let's work on https://github.com/galaxyproject/galaxy/issues/{name}. If unassigned, assign me. Implement the feature or bug and harden.
