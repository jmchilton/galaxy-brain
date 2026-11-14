# Orchestration brief (read first, every stage)

John (Galaxy and Pulsar maintainer) is away for several days and asked a coordinator agent to run a staged investigation through subagents. You are one stage. Make as much real progress as possible without him; don't stop to ask questions, decide and record why.

## Background and John's stance

- Galaxy implemented GA4GH WES last year (galaxyproject/galaxy PR #21335, merged 2026-01-27). Vault note: `vault/research/PR 21335 - GA4GH WES API.md`.
- Pulsar can act as a TES consumer: Galaxy's Pulsar TES runner hands jobs to a GA4GH TES server, with Pulsar staging done in the TES task.
- tesp-api (https://galaxyproject.org/news/2025-10-06-tesp-api/) is a community project implementing a TES server on top of Pulsar.
- John's view: Galaxy's WES works but has little point. Galaxy's own APIs work better and do more, and WES on Galaxy needs a Galaxy workflow, which no other WES implementation runs, so interop is small. Investigate honestly; record facts that support or contradict that view.

## Locations

- Vault project (umbrella): `vault/projects/ga4gh_wes_tes/` in `~/projects/repositories/galaxy-brain`. Only `index.md` there is a validated note; other Markdown files are plain documents (no frontmatter).
- Stage log: append a short section for your stage to `vault/projects/ga4gh_wes_tes/STAGE_LOG.md` (what was done, what works, what doesn't, where artifacts are, exact versions/SHAs).
- Demo repository: `~/projects/repositories/galaxy-wes-tes` (local git repo; created in stage 2). Commit there freely. Don't create a GitHub repository for it.
- Galaxy source: `~/projects/repositories/galaxy` (a checkout; don't disturb its state). For Galaxy changes create a worktree with `ghwt create galaxy <branch>` (lands in `~/projects/worktrees/galaxy/branch/<branch>/`). In ghwt worktrees `origin` is upstream; push to the `jmchilton` remote.
- Pulsar: no local checkout yet. `ghwt clone https://github.com/galaxyproject/pulsar` or `ghwt create pulsar <branch>`; push branches to the `jmchilton` fork.
- tesp-api and other third-party code: clone under `~/projects/repositories/` or the demo repo's `vendor/` (gitignored). Don't fork on GitHub; keep changes as local branches plus patch files committed to the demo repo.

## Rules

- No pull requests, issues, comments, or other GitHub posts anywhere. Pushing branches to the `jmchilton` remote for Galaxy and Pulsar is fine.
- Galaxy branches: follow `vault/agents/_shared/GX_IMPLEMENTATION_HANDOFF.md` (debrief in `vault/repositories/galaxy/branches/active/<branch>/implementation_debrief.md`, record per `vault/agents/_shared/REPOSITORY_BRANCHES.md`, one line in `vault/repositories/galaxy/branches/MY_BRANCHES.md`). Pulsar branches likewise under `vault/repositories/pulsar/branches/`. Give each record `related_records` pointing back at sibling records where useful, but link the vault project from the record body.
- galaxy-brain git: do NOT commit or push in `~/projects/repositories/galaxy-brain`; the coordinator does that. Other sessions edit that checkout concurrently, so edit shared files (MY_BRANCHES.md etc.) with the Edit tool, never whole-file rewrites. Run `make validate` from the repo root before finishing if you touched the vault.
- Security: suspected security findings go to `~/security-<project>-<task>-2026-11.md` with mode 0600, never into any repository or vault file. Say in your final report that one exists (path only), nothing more. Give nested subagents this rule.
- Shared machine: 4 cores, ~14 GB RAM, other agent sessions running. Don't stop or remove containers, processes, or worktrees you didn't create. Pick non-default ports (e.g. 18080+ range) and unique container/network names prefixed `wes-tes-`. When your stage ends, stop your long-running services and containers but leave scripts that bring them back up; record this in the stage log. Docker works without sudo.
- Nested subagents: allowed and encouraged for parallel or context-heavy work. John wants time and tokens spent on this: launch every nested subagent with model `opus` and effort `high`, explicitly. Brief them with this file's path. You own their results; verify before recording.
- Thoroughness over speed: John explicitly wants this done carefully. Prefer actually running things over predicting them.
- Pulsar is already cloned at `~/projects/repositories/pulsar`.
- Write prose plainly: short sentences, concrete commands and config, no marketing. Record versions and SHAs of everything you run.
- Final report to the coordinator: a concise, non-sensitive summary: what works (with evidence), what doesn't, artifacts and their paths, branches pushed, open problems for the next stage.
