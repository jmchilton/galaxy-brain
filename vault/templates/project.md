<%*
const slug = await tp.system.prompt("Project slug (dir name, e.g. 'collection_semantics')");
const title = await tp.system.prompt("Project title");
const summary = await tp.system.prompt("Summary (20-160 chars)");
const today = tp.date.now("YYYY-MM-DD");
await tp.file.move(`/projects/${slug}/index`);
-%>
---
type: project
title: "<% title %>"
tags:
  - project
  # TODO: add galaxy/* tags
status: draft
created: <% today %>
revised: <% today %>
revision: 1
ai_generated: false
summary: "<% summary %>"
---

# <% title %>

## Overview

## Goals

## Files
