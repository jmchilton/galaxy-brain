---
type: project
title: "Playwright Migration"
tags:
  - project
  - galaxy/testing
status: draft
created: 2026-09-16
revised: 2026-10-20
revision: 37
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
- `BACKLOG.md` — open issues to work down.
- `BRANCHES.md` — short view of live branches; mirrors `vault/agents/gx_branches/MY_BRANCHES.md`.
- `GALAXY_UI_DRIVER_UPSTREAM.md` — long-running task: break `galaxy_ui_driver` into PRs off dev; agreed breakdown, order and coverage to add.
- `GXUI_POLISH.md` — long-running task: finish gxui and the skill; points at the planned work and drafts what "done" means.
- `GALAXY_UI_SKILL_DESIGN.md` — **start here for the UI skill**: status/next steps, `gxui` daemon + CLI over `NavigatesGalaxy`, playwright-cli escape hatch, prerequisite PRs, spikes S1–S3.
- `GALAXY_UI_SKILL_LOOP.md` — setup/drive/verify/report/triage loop over GTN tutorials and IWC workflows, with arm comparison and token measurement.
- `GALAXY_UI_SKILL_RUNS.md` — run ledger: per-run metrics, verification, and findings for the skill, abstractions and training.
- `galaxy_ui_loop/` — eval harness source (Codex runner, prompt, metrics, verify) and spike scripts; gxui itself lives in Galaxy on `galaxy_ui_driver`, the skill on galaxy-skills. State lives in `~/.cache/gxui-loop` and `~/.cache/gxui`.
- `HARDEN_AGAINST_FAQ.md` — FAQ variant of the loop: review or drive each GTN FAQ against 26.2, report GTN/Galaxy findings, save a gxui replay.
- `faqs_26_2.yaml` + `FAQS_YAML_SCHEMA.md` — 26.2 FAQ checklist (497 FAQs) and its schema; `training_findings/26.2/` mirrors GTN paths.
- `TEST_STORIES_RESCUE.md` — plan for recovering PR #21199's Test Stories feature as small branches off dev, minus the Jupyter work.

### Archive (`archive/`)

- `BRANCHES.md` — full ledger to 2026-10-20: every merged migration PR, the parity stack, Test Stories piece notes.
- `SELENIUM_ONLY_SURVEY.md` — the 2026-09 breakdown of `@selenium_only` tests, diagnosed blockers, and the local state-accumulation trap.
- `WORKFLOW_EDITOR_PLAYWRIGHT_STATUS.md` — salvaged `playwright_backlog` triage of workflow-editor `selenium_only` tests, plus established Playwright patterns.
- `GESTURE_ABSTRACTION_DESIGN.md` — backend-neutral input/gesture vocabulary replacing `action_chains()`; step 6 is in `BACKLOG.md`.
- `GALAXY_UI_SKILL.md` — original brief for the Galaxy UI skill and its feedback loop.
- `GALAXY_UI_SKILL_RESEARCH.md` — playwright-cli vs playwright-mcp findings; decision: CLI skill, no MCP yet; skill best practices.
- `GXUI_PACKAGE_MOVE_HANDOFF.md`, `GXUI_CONFIG_LOGIN_HANDOFF.md` — Codex handoffs folded into `galaxy_ui_driver` 2026-10-09.
