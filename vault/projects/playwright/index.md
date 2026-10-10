---
type: project
title: "Playwright Migration"
tags:
  - project
  - galaxy/testing
status: draft
created: 2026-09-16
revised: 2026-10-09
revision: 36
ai_generated: true
summary: "Recover PR #21199's core, upstream galaxy_ui_driver's fixes with E2E coverage, and finish gxui; the Selenium-to-Playwright migration is done (#24020)."
---

# Playwright Migration

## Overview

Recover the core of PR #21199 using small, atomic, obviously correct PRs.

The Selenium-to-Playwright migration is done:
[galaxyproject/galaxy#24020](https://github.com/galaxyproject/galaxy/pull/24020)
removes the last `selenium_only` decorator. It is no longer a goal.

## Goals

- Recover the core functionality and tests from
  [galaxyproject/galaxy#21199](https://github.com/galaxyproject/galaxy/pull/21199),
  minus the Jupyter notebook work.
- Break `galaxy_ui_driver` down and land its Galaxy fixes in dev, growing E2E coverage along
  the way (`GALAXY_UI_DRIVER_UPSTREAM.md`).
- Get the `gxui` CLI and its skill polished and done (`GXUI_POLISH.md`).
- Keep backlog of issues empty ./BACKLOG.md by working through them.

## Files

- `AGENTS.md` — instructions for agents working on this project (`CLAUDE.md` symlinks to it).
- `PROBLEMS_AND_GOALS.md` — big-picture context.
- `GALAXY_UI_SKILL.md` — brief for an agent skill that drives the Galaxy UI, plus a tutorial/IWC feedback loop.
- `GALAXY_UI_SKILL_RESEARCH.md` — playwright-cli vs playwright-mcp findings; decision: CLI skill, no MCP yet; skill best practices.
- `GALAXY_UI_SKILL_DESIGN.md` — **start here for the UI skill**: status/next steps, `gxui` daemon + CLI over `NavigatesGalaxy`, playwright-cli escape hatch, prerequisite PRs, spikes S1–S3.
- `GALAXY_UI_DRIVER_UPSTREAM.md` — long-running task: break `galaxy_ui_driver` into PRs off dev; first-cut grouping and coverage to add.
- `GXUI_POLISH.md` — long-running task: finish gxui and the skill; points at the planned work and drafts what "done" means.
- `galaxy_ui_loop/` — loop harness source (Codex runner, prompt, metrics, verify), spike scripts, the `gxui` MVP (`gxui/`, `bin/gxui`, tests) and the `galaxy-ui-driver` skill (`skill/`); state lives in `~/.cache/gxui-loop` and `~/.cache/gxui`.
- `GALAXY_UI_SKILL_RUNS.md` — run ledger: per-run metrics, verification, and findings for the skill, abstractions and training.
- `GALAXY_UI_SKILL_LOOP.md` — setup/drive/verify/report/triage loop over GTN tutorials and IWC workflows, with arm comparison and token measurement.
- `GESTURE_ABSTRACTION_DESIGN.md` — design for the backend-neutral input/gesture vocabulary replacing `action_chains()`.
- `BRANCHES.md` — branches and PRs for this project; mirrors `vault/agents/gx_branches/MY_BRANCHES.md`.
- `SELENIUM_ONLY_SURVEY.md` — historical: the 2026-09 breakdown of `@selenium_only` tests, diagnosed blockers, and the local state-accumulation trap.
- `TEST_STORIES_RESCUE.md` — plan for recovering PR #21199's Test Stories feature as small branches off dev, minus the Jupyter work.
- `WORKFLOW_EDITOR_PLAYWRIGHT_STATUS.md` — historical: salvaged `playwright_backlog` triage of workflow-editor `selenium_only` tests, plus established Playwright patterns.
