<%*
const name = await tp.system.prompt("Concept name");
const summary = await tp.system.prompt("Summary (20-160 chars)");
const today = tp.date.now("YYYY-MM-DD");
await tp.file.move(`/research/${name}`);
-%>
---
type: concept
tags:
  - concept
  # TODO: add galaxy/* tags
status: draft
created: <% today %>
revised: <% today %>
revision: 1
ai_generated: false
summary: "<% summary %>"
---

# <% name %>

## Definition

## Why It Matters

## Related
