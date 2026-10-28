To request a galaxy-brain research note, queue it for the `gx_research` agent.

Only queue high-value gaps: a Galaxy component or facet the work touches substantially, that future work will likely touch again, and that has no note or a note that is stale or misses it. Not one-off details, or what reading the code for a few minutes answers.

Before writing, check `vault/research/`, `vault/agents/gx_research/todo/` and `vault/agents/gx_research/archive/`. If a pending request covers the gap, add your line under its `## Requested by` instead of writing a new one.

Write `vault/agents/gx_research/todo/<short_name>.md` (no frontmatter):

```markdown
# Component - <Area>

<Prose scope for `gx_research/INGEST_GX_COMPONENT.md`: what the note should cover and leave out. For an existing note, name it and what to update.>

## Why

<1-3 sentences: what the work needed and couldn't find, and which nearby notes fell short.>

## Requested by

- <branch record or other source path>: <one line on what it needed>
```

Match the title to existing `Component - ` notes in `vault/research/`.
