---
type: project
title: "Skill Maintenance"
tags:
  - project
status: draft
created: 2026-09-03
revised: 2026-09-03
revision: 1
ai_generated: true
summary: "Tracks canonical homes, documentation, packaging, provenance, and maintenance status for reusable agent skills."
---

# Skill Maintenance

## Overview

This project keeps reusable agent skills in maintained GitHub repositories instead of allowing local installations to become anonymous copies. It tracks where each artifact belongs, which agent hosts can load it, and what still needs documentation or portability work.

The machine-readable source of truth is [`inventory.yml`](inventory.yml). Update it whenever a skill is added, moved, adopted from an upstream project, retired, or reviewed.

## Canonical repositories

- [jmchilton/claude-jmchilton-plugins](https://github.com/jmchilton/claude-jmchilton-plugins) — personal workflows and configuration packaged for Claude Code and Codex.
- [jmchilton/galaxy-skills](https://github.com/jmchilton/galaxy-skills) — reusable Galaxy development skills intended for community use.

Third-party skills may remain in their upstream repositories. The inventory should record their upstream URL and pinned revision rather than copying them into a repository above without a maintenance reason.

## Maintenance rules

1. Give every locally installed skill a canonical repository, path, maintainer, and revision.
2. Prefer installing or symlinking from the canonical checkout over keeping an untracked copy.
3. Document purpose, motivation, prerequisites, installation, supported hosts, and representative usage.
4. Distinguish portable skills from host-specific commands or configuration.
5. Validate manifests, skill metadata, referenced resources, and documented installation paths before release.
6. Record unresolved provenance explicitly; never imply that an unknown local copy is maintained.

## Current priorities

1. Clean-install test and release the new dual-host packaging for `claude-jmchilton-plugins`.
2. Repair documentation drift and add current Codex installation guidance to `galaxy-skills`.
3. Resolve or retire locally installed skills whose source and revision are unknown.
4. Add automated inventory, manifest, reference, and clean-install checks.

## Files

- `AGENTS.md` — instructions for agents maintaining this project.
- `inventory.yml` — canonical repositories, reusable artifacts, local installations, and maintenance state.
