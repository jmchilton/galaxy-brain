<%*
const parent = await tp.system.prompt("Parent plan name (exact, without 'Plan - ' prefix)");
const section = await tp.system.prompt("Section name (e.g. 'API Design')");
const name = await tp.system.prompt("Filename (e.g. 'Plan - Foo - API')");
const summary = await tp.system.prompt("Summary (20-160 chars)");
const today = tp.date.now("YYYY-MM-DD");
await tp.file.move(`/plans/${name}`);
-%>
---
type: plan-section
tags:
  - plan/section
  # TODO: add galaxy/* tags
parent_plan: "[[Plan - <% parent %>]]"
section: "<% section %>"
status: draft
created: <% today %>
revised: <% today %>
revision: 1
ai_generated: false
summary: "<% summary %>"
---

# <% section %>

## Context

## Design

## Notes
