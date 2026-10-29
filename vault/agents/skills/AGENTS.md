# Skills maintenance

@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md
@../_shared/NOT_VAULT_NOTES.md
@../_shared/AGENT_MARKERS.md

This directory maintains John's reusable agent skills and plugins, and what each machine has installed:

- [claude-jmchilton-plugins](https://github.com/jmchilton/claude-jmchilton-plugins) — personal workflows packaged for Claude Code and Codex. Its repository `AGENTS.md` holds the packaging, versioning and release rules; read it before changing the repository.
- [galaxy-skills](https://github.com/galaxyproject/galaxy-skills) — community-facing Galaxy development skills.

[inventory.yml](inventory.yml) records each skill's canonical home, unresolved local installs, per-machine expected installs and the maintenance backlog. Update it whenever a skill is added, moved, adopted, retired or reviewed. [HERDR_SUPPORT.md](HERDR_SUPPORT.md) tracks herdr integration on John's Mac. John's `~/.zshrc` and `~/.bashrc` source [config/herdr-codex.zsh](config/herdr-codex.zsh) by absolute path, so moving it means updating both.

## Project settings

In the following files, PROJECT is the repository a branch, issue or PR belongs to.

- `claude-jmchilton-plugins`: upstream `jmchilton/claude-jmchilton-plugins`, base branch `origin/main`, push remote `origin`. Every change under `plugins/jmchilton/` bumps the version in both plugin manifests, and CI (`validate.yml`) checks the bump. Releases are `v*` tags.
- `galaxy-skills`: upstream `galaxyproject/galaxy-skills`, base branch `upstream/main`, push remote the `jmchilton` fork. If the clone's `upstream` remote points at the fork, repoint it at `galaxyproject/galaxy-skills`. It has no CI. It isn't greenlisted, so ask John before opening issues or commenting there.

@../_shared/MY_BRANCHES_INDEX.md
@../_shared/REPOSITORY_BRANCHES.md
@../_shared/WORKTREES.md
@../_shared/PROCESS_INITIAL_REVIEW.md
@../_shared/REVIEW_FOCUS.md
@../_shared/MY_ISSUES_INDEX.md
@../_shared/MY_REVIEWS_INDEX.md

Each project has its own branch queue, issue index and review queue:

- claude-jmchilton-plugins: [branches](../../repositories/claude-jmchilton-plugins/branches/MY_BRANCHES.md), [issues](../../repositories/claude-jmchilton-plugins/issues/MY_ISSUES.md), [reviews](../../repositories/claude-jmchilton-plugins/reviews/MY_REVIEWS.md)
- galaxy-skills: [branches](../../repositories/galaxy-skills/branches/MY_BRANCHES.md), [issues](../../repositories/galaxy-skills/issues/MY_ISSUES.md), [reviews](../../repositories/galaxy-skills/reviews/MY_REVIEWS.md)

The agent running in this directory is also responsible for maintaining and promoting John's branches within those branch queues. Branch records and supporting files live in `vault/repositories/PROJECT/branches/active/<branch_name>/`.

## Machine sync

Remote agent machines are the `host` entries in [ENVIRONMENTS.yml](../_shared/ENVIRONMENTS.yml). `inventory.yml` `environments:` lists what each should have installed.

- After a release, or after adding or removing a skill or plugin, run `ssh HOST 'claude plugin marketplace update && claude plugin update <plugin>'` for each host, and install anything its entry lists but is missing.
- Update the entry, including `last_synced`, in the same change.
- Machine setup itself (tools, auth) is [PROCESS_SETUP_MACHINE.md](../_shared/PROCESS_SETUP_MACHINE.md), not this agent.

## Automatic Actions

The user authorizes these ahead of time, but only exactly as written here.

- **Rerun unrelated reds.** For each entry in those queues whose PR or pushed branch has failed CI: unless its branch record has a CI verdict for that head SHA, check CI per [`CHECK_CI.md`](../_shared/CHECK_CI.md) (upstream from the project settings) and replace the record's CI line with the verdict. Then rerun per that file's "Rerun unrelated reds". Skip `branches_need_decision` and `branches_reference` entries.
- **Report machine drift.** For each host with an `environments:` entry, compare `ssh HOST 'claude plugin list; ls ~/.claude/skills ~/.claude/commands ~/.codex/skills'` against the entry and report drift to John. Don't install or update anything, and ignore Mac-only symlinked skills.
