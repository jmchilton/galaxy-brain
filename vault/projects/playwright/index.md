---
type: project
title: "Playwright Migration"
tags:
  - project
  - galaxy/testing
status: draft
created: 2026-09-16
revised: 2026-09-16
revision: 4
ai_generated: true
summary: "Migrate the full Galaxy Selenium suite to Playwright and recover the core of PR #21199, via small atomic PRs."
---

# Playwright Migration

## Overview

Move the entire Galaxy Selenium test suite onto Playwright so no `selenium_only`
decorators remain, using small, atomic, obviously correct PRs.

## Goals

- Run every Selenium test under Playwright; drop `selenium_only`.
- Recover the core functionality and tests from
  [galaxyproject/galaxy#21199](https://github.com/galaxyproject/galaxy/pull/21199),
  minus the Jupyter notebook work.

## Files

- `AGENTS.md` — instructions for agents working on this project (`CLAUDE.md` symlinks to it).
- `PROBLEMS_AND_GOALS.md` — big-picture context.
- `GESTURE_ABSTRACTION_DESIGN.md` — design for the backend-neutral input/gesture vocabulary replacing `action_chains()`.
- `WORKFLOW_EDITOR_PLAYWRIGHT_STATUS.md` — salvaged `playwright_backlog` triage; remaining workflow-editor `selenium_only` tests and established Playwright patterns.
