<%*
const name = await tp.system.prompt("Problem name");
const summary = await tp.system.prompt("Summary (20-160 chars)");
const today = tp.date.now("YYYY-MM-DD");
await tp.file.move(`/research/${name}`);
-%>
---
type: research
subtype: design-problem
tags:
  - research/design-problem
  # TODO: add galaxy/* tags
# TODO: related_issues (list of [[Issue N]] wiki links)
status: draft
created: <% today %>
revised: <% today %>
revision: 1
ai_generated: false
summary: "<% summary %>"
---

# <% name %>

## Problem

## Root Cause

## Options

## Recommendation
