<%*
const name = await tp.system.prompt("Spec name (e.g. 'Tool State Specification')");
const summary = await tp.system.prompt("Summary (20-160 chars)");
const today = tp.date.now("YYYY-MM-DD");
await tp.file.move(`/research/Component - ${name}`);
-%>
---
type: research
subtype: design-spec
tags:
  - research/component
  # TODO: add galaxy/* tags
component: "<% name %>"
status: draft
created: <% today %>
revised: <% today %>
revision: 1
ai_generated: false
summary: "<% summary %>"
---

# <% name %>

## Goal

## Design

## Open Questions
