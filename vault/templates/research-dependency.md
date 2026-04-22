<%*
const name = await tp.system.prompt("Dependency name (e.g. 'Graphviz')");
const summary = await tp.system.prompt("Summary (20-160 chars)");
const today = tp.date.now("YYYY-MM-DD");
await tp.file.move(`/research/Dependency - ${name}`);
-%>
---
type: research
subtype: dependency
tags:
  - research/dependency
  # TODO: add galaxy/* tags
status: draft
created: <% today %>
revised: <% today %>
revision: 1
ai_generated: false
summary: "<% summary %>"
---

# <% name %>

## Overview

## Integration Points

## Notes
