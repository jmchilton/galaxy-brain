<%*
const name = await tp.system.prompt("Plan name (e.g. 'Workflow Extraction Vue Conversion')");
const summary = await tp.system.prompt("Summary (20-160 chars)");
const today = tp.date.now("YYYY-MM-DD");
await tp.file.move(`/plans/Plan - ${name}`);
-%>
---
type: plan
tags:
  - plan
  # TODO: add galaxy/* tags
title: "<% name %>"
# TODO: related_issues (list of [[Issue N]] wiki links)
status: draft
created: <% today %>
revised: <% today %>
revision: 1
ai_generated: false
summary: "<% summary %>"
---

# <% name %> Plan

## Goal

## Steps

## Testing

## Unresolved Questions
