---
name: galaxy-brain
description: Load a galaxy-brain vault document into context. Use when the user asks to load, lookup, or reference a galaxy-brain note. Triggers on phrases like "use galaxy brain", "load galaxy brain", "galaxy brain lookup".
argument-hint: [document-path]
---

Load a galaxy-brain vault document into context for reference.

Document path: $ARGUMENTS

Steps:

1. Determine the file path by appending `.md` to the argument and prepending `vault/`.
   - Example: `research/Component - Backend Dependency Management` becomes `vault/research/Component - Backend Dependency Management.md`

2. Try to read from the local vault at `~/.galaxy-brain/vault/`:
   - Full path: `~/.galaxy-brain/vault/{argument}.md` (expand ~ to home directory)
   - If `~/.galaxy-brain/vault/` does not exist OR the file is not found, fall back to step 3.

3. Fetch from GitHub raw content:
   - URL: `https://raw.githubusercontent.com/jmchilton/galaxy-brain/main/vault/{url-encoded argument}.md`
   - Use WebFetch to retrieve the raw markdown content.

4. Present the full document including frontmatter. Do not summarize or truncate.

5. Briefly note which source it was loaded from (local or GitHub).
