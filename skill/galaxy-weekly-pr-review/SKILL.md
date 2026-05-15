---
name: galaxy-weekly-pr-review
description: Review recently merged galaxyproject/galaxy pull requests for relevance to John/jmchilton and create detailed galaxy-brain vault notes using the galaxy-brain .claude/commands/ingest-gx-pr workflow. Use when asked to scan the last N days of Galaxy merged PRs, decide which PRs are relevant, run or emulate ingest-gx-pr, generate PR review dossiers, or maintain a recurring Galaxy PR review workflow.
---

# Galaxy Weekly PR Review

Use this skill to turn a batch of recently merged `galaxyproject/galaxy` PRs into detailed galaxy-brain review notes.

## Core workflow

1. Locate the `galaxy-brain` project.
   - Default path: `/home/openclaw/projects/repositories/galaxy-brain`.
   - Confirm `.claude/commands/ingest-gx-pr.md` exists and read it before doing ingestion work; it is the source of truth for the deep-review process.
2. List recently merged PRs.
   - Run `scripts/list_recent_galaxy_prs.py --days 7 --login jmchilton` from this skill directory.
   - Tune with `--threshold`, `--since`, or `--interest-file` if the candidate set is too broad/narrow.
3. Review the candidate list with the user if relevance is ambiguous.
   - Strong default relevance: authored by `jmchilton`, mentions/replies involving `jmchilton`, or touches tool framework, tool shed, workflow, schema/API, or closely adjacent test code.
   - Do not ingest every merged PR automatically unless the user explicitly asks.
4. For each selected PR, follow the existing `ingest-gx-pr` command.
   - If running inside Claude with slash commands available, run `/ingest-gx-pr <number>` in the `galaxy-brain` project.
   - In OpenClaw or another environment without Claude slash commands, emulate the command exactly: update/verify the Galaxy clone, produce the `.ingest-dossiers/PR-<N>-<slug>.md` dossier, hand it to the `/ingest` workflow semantics, delete the temporary dossier, and ensure `.ingest-dossiers/` is gitignored.
5. Validate the results.
   - Inspect each new vault note for accurate frontmatter, current-location citations, cross-reference candidates, and no temporary dossier leakage.
   - Run the repository's relevant validation target if available, e.g. `make validate` or the frontmatter validator used by galaxy-brain.
6. Summarize what happened.
   - Include PR numbers ingested, note paths created/updated, any cross-check surprises, and any PRs skipped with reasons.

## Helper script

`./scripts/list_recent_galaxy_prs.py` uses `gh pr list` and scores PRs transparently. It prints:

- review candidates with score reasons
- suggested `/ingest-gx-pr <number>` commands
- lower-scoring merged PRs for audit

Example:

```bash
cd /home/openclaw/projects/repositories/galaxy-brain/skill/galaxy-weekly-pr-review
./scripts/list_recent_galaxy_prs.py --days 7 --login jmchilton --threshold 5
```

Use `references/relevance-profile.example.json` as a starting point for a custom profile:

```bash
./scripts/list_recent_galaxy_prs.py --days 7 --interest-file references/relevance-profile.example.json
```

## Relevance scoring guidance

Treat the script as a triage assistant, not an authority. Prefer ingestion when a PR has any of these:

- John authored, reviewed, commented on, or was mentioned in the PR.
- The PR changes tool parsing/modeling, tool shed internals, workflow semantics, API/schema code, or tests around those areas.
- The PR appears likely to affect future Galaxy architecture notes or galaxy-brain cross-references.

Prefer skipping or asking when a PR is only UI migration churn, dependency maintenance, or release/backport work outside John's current interests.

## Safety and repo hygiene

- Do not modify the Galaxy clone except the fetch/fast-forward behavior allowed by `ingest-gx-pr.md`.
- Stop and ask if the Galaxy clone has a dirty working tree.
- Do not create public GitHub comments, issues, or PRs as part of this skill unless separately requested.
- Keep generated dossiers temporary; vault notes are the durable artifacts.
