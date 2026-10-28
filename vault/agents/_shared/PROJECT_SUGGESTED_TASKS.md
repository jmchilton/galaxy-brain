Suggested tasks for a project agent directory (pulsar, planemo, workflow_libs), per [PROCESS_COLLECT_SUGGESTED_TASKS.md](PROCESS_COLLECT_SUGGESTED_TASKS.md). `{repo}` is the GitHub repository (`owner/name`) as the PROJECT's `vault/repositories/PROJECT/*/LAUNCHERS.md` spells it; `{project}` is PROJECT; `{agent_dir}` is AGENT_DIRECTORY. Agents covering several projects walk each section once per PROJECT, where the PROJECTs are the repositories [RECORD_AGENTS.yml](RECORD_AGENTS.yml) maps to AGENT_DIRECTORY.

## Review New PRs

when: daily
what: open, non-draft PRs on {repo} not by jmchilton and not yet in `MY_REVIEWS.md` or a record under `vault/repositories/PROJECT/reviews/`.

For each PR number `n`, `description` is a one-line summary from the PR text. `status` is `recommended` unless another contributor already has a review request on it, then `idea`.

Suggest:

```
prompt: Run ./REVIEW.md on {repo}#{n}
agent_dir: {agent_dir}
link: https://github.com/{repo}/pull/{n}
description: 🔎 {description}
status: {status}
```

## Work New Issues

when: daily
what: issues on {repo} opened in the last 24 hours, open, unassigned or assigned to jmchilton, and not already tracked per `MY_ISSUES_INDEX.md`.

For each issue number `n`, `description` is a one-paragraph summary from the issue text. `status` is `recommended` for a clear bug with a likely small fix, otherwise `idea`.

Suggest:

```
prompt: Run ./WORK_HORSE.md on {repo}#{n}
agent_dir: {agent_dir}
link: https://github.com/{repo}/issues/{n}
description: 🐴 {description}
status: {status}
```

## Fix Red Branches

when: whenever
what: entries in `vault/repositories/PROJECT/branches/MY_BRANCHES.md` whose PR or branch has a red check the branch likely caused (live GitHub state).

`description` is the branch's queue line plus the failing checks.

Suggest:

```
prompt: Fix CI on branch {name}. BRANCH_DIRECTORY is vault/repositories/{project}/branches/active/{name}/. Diagnose each red check; fix the ones the branch caused, rerun the unrelated ones, and record the diagnosis in the branch notes.
agent_dir: {agent_dir}
record: {project}/branches/{name}
profile: Sonnet (high)
description: 🔧 {description}
status: recommended
```

## De-conflict Branches

when: whenever
what: entries in `MY_BRANCHES.md` whose PR has merge conflicts with its base.

`description` is the branch's queue line.

Suggest:

```
prompt: De-conflict branch {name}. BRANCH_DIRECTORY is vault/repositories/{project}/branches/active/{name}/. Rebase it onto its actual base branch, resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease`, update the SHA in the branch record, and note the rebase in the branch notes.
agent_dir: {agent_dir}
link: https://github.com/{repo}/pull/{n}
record: {project}/branches/{name}
profile: Sonnet (high)
description: 🔀 {description}
status: recommended
```

## Respond to Review (deferential)

when: whenever
what: PRs in `MY_BRANCHES.md` with a review or review comments from mvdbeek or davelopez that we haven't answered (no jmchilton reply or push since).

`reviewer` is their login; `description` is the branch's queue line plus a one-line gist of the review.

Suggest:

```
prompt: Respond to {reviewer}'s review of {repo}#{n} (branch {name}) per ../_shared/RESPOND_TO_REVIEW.md. BRANCH_DIRECTORY is vault/repositories/{project}/branches/active/{name}/.
agent_dir: {agent_dir}
link: https://github.com/{repo}/pull/{n}
record: {project}/branches/{name}
profile: Opus (low)
description: 🙇 {description}
status: recommended
```

## Respond to Review (confirmatory)

when: whenever
what: as above, for reviews from anyone else (not jmchilton, not bots).

Suggest:

```
prompt: Respond to {reviewer}'s review of {repo}#{n} (branch {name}) per ../_shared/RESPOND_TO_REVIEW.md. BRANCH_DIRECTORY is vault/repositories/{project}/branches/active/{name}/. Confirm your plan with me before changing the branch.
agent_dir: {agent_dir}
link: https://github.com/{repo}/pull/{n}
record: {project}/branches/{name}
profile: Opus (low)
description: 💬 {description}
status: recommended
```

## Starter Issues

when: daily
what: only when no other section suggested anything: up to three issues from `MY_ISSUES.md` (`queued` first) worth starting.

`description` is the issue's `MY_ISSUES.md` line.

Suggest:

```
prompt: Run ./WORK_HORSE.md on {repo}#{n}
agent_dir: {agent_dir}
link: https://github.com/{repo}/issues/{n}
description: 🌱 {description}
status: idea
```
