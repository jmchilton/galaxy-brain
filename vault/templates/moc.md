<%*
const name = await tp.system.prompt("MOC (Map of Content) name");
const summary = await tp.system.prompt("Summary (20-160 chars)");
const today = tp.date.now("YYYY-MM-DD");
await tp.file.move(`/research/MOC - ${name}`);
-%>
---
type: moc
tags:
  - moc
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

## Notes
