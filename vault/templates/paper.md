<%*
const slug = await tp.system.prompt("Paper slug (dir name, e.g. 'galaxy-notebooks')");
const title = await tp.system.prompt("Paper title");
const shortTitle = await tp.system.prompt("Short title");
const kind = await tp.system.prompt("Paper kind", "software");
const venue = await tp.system.prompt("Target venue", "Bioinformatics");
const claim = await tp.system.prompt("Central claim (20-400 chars)");
const summary = await tp.system.prompt("Summary (20-160 chars)");
const today = tp.date.now("YYYY-MM-DD");
await tp.file.move(`/papers/${slug}/index`);
-%>
---
type: paper
title: "<% title %>"
short_title: "<% shortTitle %>"
tags:
  - paper
  # TODO: add galaxy/* tags
status: draft
paper_stage: outline
paper_kind: <% kind %>
target_venue: "<% venue %>"
central_claim: "<% claim %>"
created: <% today %>
revised: <% today %>
revision: 1
ai_generated: false
summary: "<% summary %>"
---

# <% title %>

## Claim

## Audience

## Evidence

## Draft Files
