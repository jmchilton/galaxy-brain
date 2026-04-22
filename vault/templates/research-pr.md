<%*
const num = await tp.system.prompt("GitHub PR number");
const title = await tp.system.prompt("Short title (for filename)");
const summary = await tp.system.prompt("Summary (20-160 chars)");
const repo = await tp.system.prompt("Repo (owner/name)", "galaxyproject/galaxy");
const today = tp.date.now("YYYY-MM-DD");
await tp.file.move(`/research/PR ${num} - ${title}`);
-%>
---
type: research
subtype: pr
tags:
  - research/pr
  # TODO: add galaxy/* tags
github_pr: <% num %>
github_repo: <% repo %>
status: draft
created: <% today %>
revised: <% today %>
revision: 1
ai_generated: false
summary: "<% summary %>"
---

# PR #<% num %>: <% title %>

## Summary

## Changes

## Notes
