# 06 - Review Skills: galaxy-skills + agentic-plugins Plan

Drafted 2026-09-27. Goal: architecture review commands land as skills alongside the Galaxy docs PR, living in `galaxyproject/galaxy-skills`, exposed via `galaxyproject/agentic-plugins`.

## Current state (verified)

- **galaxy-architecture `review/`:**
  - 8 static commands and 4 generated ones, with the generated ones copied from `generated_agentic_operations/`.
  - Published through a submodule to `claude-galaxy-plugins`, where the submodule is pinned at `a1a9ccc`, one commit behind.
  - Problems:
    - `gx-review-model.md` is empty;
    - `review-di.md` and `review-business-logic-organization.md` are stale duplicates;
    - `gx-review-ui-components.md` has no source file;
    - `gx-e2e-review` exists only in the plugins repo;
    - `gx-review-async-sync` was never published;
    - the `gx-review` dispatch table names wrong files and uses the wrong path (`src/client`).
  - None of the commands have frontmatter or link to the docs. All take an argument.
- **galaxy-skills** (upstream `7eb5a1d`; the local clone points at the jmchilton fork, still in the old layout):
  - Two trees since #35: `skills/` for using Galaxy and `dev-skills/` for tool, workflow and hub work.
  - Format is `SKILL.md` with `name` + `description`, optionally `references/`.
  - No CI. Stated audience is analysts and tool developers; there are no core-dev skills.
  - Maintainers are Dannon and nekrut. jmchilton's PRs #26–28 have been open since June.
- **agentic-plugins** (3 weeks old, nekrut):
  - Each plugin directory serves Claude Code, Codex, Cursor and Antigravity; the repo is also a Pi package.
  - `scripts/sync-skills.sh` `vendor_tree <plugin> <subdir>` copies an upstream tree at a pinned SHA and records it in `UPSTREAM.json`. A weekly sync PR runs in CI.
  - Skills only; there is no commands support.
  - A new tree needs a new plugin dir, 4 manifests, marketplace entries, `pi.skills` and the hardcoded list in `validate.yml`.
- **Galaxy `dev`:**
  - Already hosts `.claude/commands/` triage commands (#21579, #21915) and 3 nested `CLAUDE.md` files.
  - #21614, guerler's "/review-pr", was closed with a pointer to claude-galaxy-plugins.

## Decision (2026-09-27): skills live in the Galaxy repo

jmchilton chose Alt A. The skills ship in `galaxyproject/galaxy` with the architecture docs. agentic-plugins vendors them from Galaxy for the other harnesses. galaxy-skills isn't the home; at most it holds a pointer.

`agentic_operations` + `agent-context` are **kept**. They are the skills' source: operation = which skill plus its task prompt; agent-context = agent-only patterns and pitfalls; slide/prose blocks = shared knowledge. Same repo, same PR, so docs, agent context and skill change together.

## Plan

### Step 0 - Triage in galaxy-architecture (now, 1 PR)
- Drop `gx-review-model` (empty) and the 2 stale duplicates.
- Pull `gx-e2e-review` back from claude-galaxy-plugins.
- Fix the `gx-review` dispatch table.
- Regenerate `gx-review-ui-components` from its topic (its generated source is missing).
- Give `review-vitests` (tests topic) its first generation or drop it.
- For each of the 8 static commands, decide: fold into a topic as an `agentic_operation` (+ `agent-context`) when there's a matching topic; otherwise keep it as a standalone hand-written skill.
  - Topic-backed: `gx-review-test-types` → tests; `gx-fastapi-review` → frameworks/application-components; `gx-vitest-review` → tests (review-vitests); `gx-e2e-review` → tests.
  - Standalone: `gx-review-migration` (no topic yet), `py-challenge-patches`, `py-review-code-structure`.

### Step 1 - Generator emits skills
- `/generate-agentic-op` writes `SKILL.md` (frontmatter `name`, `description: Use when reviewing Galaxy changes touching X`) instead of a slash command. Argument handling moves into the body.
- It stamps `source_digest` (a hash of the topic's content + metadata) and `generated_from` (the topic id) into the frontmatter.
- `gx-review` becomes a router skill naming its sibling skills.
- Drop `claude-slash-command` as an operation type; only skills remain.

### Step 2 - Format conversion carries agent content (fold into Phase 2 / Q2)
- In the one-md-per-topic format:
  - `agentic_operations` becomes front-matter;
  - `agent-context` becomes an HTML-comment-delimited region (`<!-- agent-context -->` … `<!-- /agent-context -->`), the same mechanism as slide markers.
- MyST ignores HTML comments, so agent-only text stays out of rendered docs but lives in the page an editor is already touching.
- The converter check covers it: generated skills must be unchanged by the conversion.

### Step 3 - Galaxy PR1 layout
- `doc/source/dev/architecture/<topic>.md`: docs, with agent-context regions and `agentic_operations` front-matter.
- Generated skills committed at `.claude/skills/<name>/SKILL.md`. This follows the `.claude/commands/` precedent and matches "commit rendered PlantUML SVGs": LLM-generated, reviewed, committed.
- Hand-written standalone skills sit beside them.
- Tests (same file as the `code_paths` test):
  - every backticked Galaxy path in a SKILL.md exists;
  - **staleness:** each generated skill's `source_digest` matches its topic's current digest. A docs edit without regenerating fails CI with "regenerate skill X". The check is deterministic even though generation isn't.
- The generator command itself ships as `.claude/commands/generate-architecture-skill.md` (or as a skill).

### Step 4 - agentic-plugins exposure
Add a `galaxy-core-dev-skills` plugin with `vendor_tree` pointed at Galaxy `.claude/skills/`:
- needs a sparse or shallow clone of Galaxy;
- `sync-skills.sh` currently takes a repo per tree (foundry precedent), so check how it parameterizes the repo;
- 4 manifests, marketplace entries, `pi.skills`, `validate.yml`.

Caveat: Pi installs every skills root, so analysts on Pi would get these. Do this after PR1 merges.

### Step 5 - Retire
- **galaxy-architecture:** `review/`, the submodule, and `generated_agentic_operations/` (replaced by `.claude/skills/`). Remove the README "Agentic Code Review" section and rewrite "Feedback Loop" around suggestions from reviews → topic edits → the digest check forcing regeneration.
- **claude-galaxy-plugins:** add a README pointer to agentic-plugins, then archive.
- **galaxy-skills:** optional README line pointing to Galaxy's core-dev skills.

## Pitch impact
Preempt "AI content in our repo":
- agent text sits in clearly marked regions or `.claude/`, never in rendered docs;
- skills are generated from human-reviewed docs;
- CI guarantees they can't silently drift from the docs;
- precedent: `.claude/commands/` triage (#21579, #21915).

This is the README "code is cheap, understanding is the bottleneck" argument made concrete: the same understanding feeds reviewers and review agents.

## Decisions (2026-09-27)

1. Skills go in `.agents/skills/` (cross-tool), not `.claude/skills/`. Replaces `.claude/skills/` in Step 3/4.
2. Skills ship in PR1 together with the docs.
3. Generic Python skills come into Galaxy as standalone skills.
4. `source_digest` staleness is a hard CI failure.
5. `refactor-to-di` stays in scope.
6. Open: whether migrations get a data-model topic. For now `gx-review-migration` stays standalone.

## Unresolved questions

1. `.claude/skills/` vs a harness-neutral dir (e.g. `.agents/skills/`) plus a Claude pointer?
2. Skills in PR1, or PR1 docs-only with skills in PR2 to keep the first review small?
3. Generic Python skills (`py-challenge-patches`, `py-review-code-structure`): into Galaxy as standalone, or drop?
4. Is `source_digest` staleness a hard fail in CI, or a warning?
5. Keep `refactor-to-di` (a non-review op) in scope?
6. Is `gx-review-migration` worth a data-model/migrations topic, or does it stay standalone?
