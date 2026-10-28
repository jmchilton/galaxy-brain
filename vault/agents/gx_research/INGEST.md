Ingest a source (GitHub issue/PR URL, docs page, paper URL, or local file) into the vault. Create a new research note (or update an existing one), update cross-references on related notes, and append an entry to `vault/log.md`.

Source: $ARGUMENTS

## Steps

### 1. Parse source
- If `$ARGUMENTS` is empty, ask the user for a URL or path and stop.
- Classify:
  - GitHub issue URL (`github.com/<owner>/<repo>/issues/<N>`) → subtype candidate `issue`
  - GitHub PR URL (`github.com/<owner>/<repo>/pull/<N>`) → subtype candidate `pr`
  - Other URL → subtype TBD (likely `component`, `design-problem`, or `dependency`)
  - Local file → inspect content

### 2. Fetch content
- GitHub issue: `gh issue view <N> --repo <owner>/<repo> --json number,title,body,author,state,labels,comments,createdAt`
- GitHub PR: `gh pr view <N> --repo <owner>/<repo> --json number,title,body,author,state,labels,files,createdAt`
- Other URL: WebFetch
- Local file: Read

### 3. Dedup check
Before creating anything, scan for an existing note covering the same source.
- **GitHub issue**: `grep -rnE "^github_issue:\\s*(\\[.*\\b<N>\\b.*\\]|\\s*<N>\\s*$)" vault/`
- **GitHub PR**: `grep -rn "^github_pr:\\s*<N>\\s*$" vault/`
- **Any URL**: normalize (strip trailing `/`, drop `utm_*`/`ref_*` params) and `grep -rn "<normalized-url>" vault/` — catches matches via the `sources:` field.

If a match is found:
- Tell the user which note already exists and propose updating it instead of creating a duplicate.
- Switch to update-existing mode (skip step 5; steps 6–10 still apply).

### 4. Classify type/subtype
Use the Note Types table in `README.md`. Pick `type`/`subtype` based on fetched content. Cross-check `meta_schema.yml` for conditional field requirements.

### 5. Draft new note
- Pick the matching template in `vault/templates/` as a structural reference (do not execute Templater; read as guide).
- Filename convention from `README.md` (e.g. `Issue <N> - <Short Title>.md`, `PR <N> - <Short Title>.md`, `Component - <Name>.md`).
- Frontmatter rules:
  - Required base fields: `type`, `tags`, `status: draft`, `created: <today>`, `revised: <today>`, `revision: 1`, `ai_generated: true`, `summary`.
  - `summary` MUST be 20–160 chars. Quote it (`"..."`) and avoid `:` / `#` / unescaped newlines. Articulate what the note is about — not a restatement of the title. Compile, don't dump.
  - `sources: ["<original-url-or-path>"]` — always populate on ingest.
  - Subtype-conditional fields per `meta_schema.yml` (e.g. `github_issue` + `github_repo` for issues).
- Body: H1 = note title, then the section scaffold from the matching template, filled with synthesized content from the fetched source. Prefer compiled claims + wiki links over verbatim dumps.

### 6. Cross-reference pass
- Read `vault/Index.md` for the full catalog of existing notes + summaries.
- Identify up to 15 existing notes that overlap topically (same component, same area, referenced PRs/issues, related design problems).
- For each candidate, propose ONE of:
  - Add a wiki link to the new note under "Related" / "Notes" section.
  - Flip a stale claim if the new source contradicts it (explicit in the diff).
  - Add cross-reference frontmatter (`related_notes`, `related_issues`, `related_prs`) if appropriate.
- Bump `revised: <today>` and `revision: <N+1>` on every touched note.
- Show all diffs as a single batch and ask the user to confirm before writing.

### 7. Write
- Create the new note (or update the existing one in dedup mode).
- Apply approved cross-reference diffs.

### 8. Validate
- Run `make validate`. Fix any errors before proceeding.

### 9. Append to `vault/log.md`
Append (not prepend) a block at the end of `vault/log.md`:

```markdown
## <YYYY-MM-DD> ingest — <Note Title>
- **source**: <original-url-or-path>
- **created**: [[<basename-of-created-note>]]    # omit if dedup-update mode
- **updated**:
  - [[<basename>]] — <one-line reason>
  - [[<basename>]] — <one-line reason>
```

If zero notes were updated, write `- **updated**: none`. If dedup mode (no new note), replace `**created**` with `**updated-target**: [[<basename>]]`.

### 10. Regenerate Index
Run `make index`. If `make check-index` now passes, commit is clean.

## Entry types in log.md
- `ingest` — this command
- `query` — future `/ask` command
- `lint` — future `/lint-vault`
- `manual` — user-written notes; logged by hand or via future flag

## Notes for the agent
- Never silently skip validation errors. Fix the note.
- Prefer wiki-links over raw URLs inside note body; raw URLs belong in `sources:`.
- If the user aborts at step 6 (cross-ref confirmation), still offer to proceed with just note creation + log entry (no updates).
- `vault/log.md` is excluded from the validator and the Astro site; it's Obsidian-visible only.
