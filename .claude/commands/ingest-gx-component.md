Deep-research a Galaxy component or facet described in prose against the current `dev` branch, then hand off to `/ingest` to create the vault note.

Source: $ARGUMENTS

This command is the prose-prompt sibling of `/ingest-gx-pr`. Instead of a PR number, the input is a free-form description of a Galaxy component, subsystem, or facet ("Post Job Actions", "E2E test writing", "the gxformat2 parser, syntax only"). It produces a code-grounded dossier verified against `origin/dev` and hands it to `/ingest`, which writes `vault/research/Component - <Name>.md`.

## Steps

### 1. Parse the input

`$ARGUMENTS` is free-form prose describing the component. It may also contain a suggested filename slug (e.g. `as "Component - Post Job Actions"`) and/or one or more Galaxy doc/source URLs the user wants used as orientation.

If empty, ask for a description and stop.

The orchestrator (not the subagent) handles two things up front:
- **Scope clarification**: if the prompt is vague — e.g. bare "workflows", "tools", "collections" — ask the user one scoping question before going further. Better to produce N tight notes than one sprawling one.
- **Typo / outlier check**: per `~/.claude/CLAUDE.md`, challenge name oddities (singular/plural, capitalization, off-by-one) before they end up in the filename or `component:` field.

### 2. Dedup pass

Before deep research, check whether a Component note already covers this topic:

- `ls vault/research/ | grep '^Component - '` for filename overlap.
- `grep -rni '<key term>' vault/research/Component\ -\ *.md` for body overlap.
- Read `vault/Index.md` for the prose catalog.

If a plausible match exists, surface it and **ask the user** which of these to do:
- Update the existing note (treat as `/ingest` dedup mode).
- Create a narrower sibling note (e.g. `Component - Post Job Actions - Frontend.md`).
- Proceed anyway (legitimate split or different angle).

No default — always ask.

### 3. Locate the Galaxy clone

Per `~/.claude/CLAUDE.md`, Galaxy clones live under `~/projects/repositories/`. Use `~/projects/repositories/galaxy/` as the canonical location.

If that path does not exist, ask the user before cloning.

### 4. Update the clone

In `~/projects/repositories/galaxy/`:
- Verify a clean working tree (`git status --porcelain`). If dirty, surface the dirty files and ask before proceeding — do not stash or discard.
- `git fetch origin dev`
- If on `dev` and the tree is clean, fast-forward: `git merge --ff-only origin/dev`. If on another branch, do not switch — anchor citations to `origin/dev` via `git -C ... show origin/dev:<path>` and `git log origin/dev ...`.

Record the current `origin/dev` SHA. Every line-number citation in the dossier is anchored to this SHA.

### 5. Launch the deep-research subagent

Spawn a `general-purpose` subagent with read access to `~/projects/repositories/galaxy/` and read access to `~/projects/repositories/galaxy-brain/vault/`. Brief it as follows (parameterize the resolved component name, the user's prompt, any URLs, and the Galaxy SHA):

> **Task**: produce a deep-research dossier for the Galaxy component / facet described below, verified against `origin/dev` at SHA `<SHA>`. The dossier will be handed to `/ingest` to create a vault note (`type: research, subtype: component`, template `vault/templates/research-component.md`). Match the depth bar of existing component notes in `~/projects/repositories/galaxy-brain/vault/research/`.
>
> **User's prompt**: <verbatim $ARGUMENTS>
>
> **Resolved scope**: <component name + in/out-of-scope statement from step 1>
>
> **Orientation URLs** (optional, user-supplied): <list, or "none">
>
> **Inputs**:
> - The Galaxy clone at `~/projects/repositories/galaxy/` (currently at `<SHA>`).
> - `~/projects/repositories/galaxy-brain/vault/Index.md` for cross-reference candidates.
> - Two existing component notes as shape references — read both before drafting:
>   - `vault/research/Component - Post Job Actions.md` (layered architecture walkthrough).
>   - `vault/research/Component - E2E Tests - Writing.md` (practitioner guide with TOC).
>   These are deliberately different shapes. Pick whichever shape fits this component — or invent a third. Don't force either mould.
>
> **Output shape**: you choose the section structure. Typical material includes architecture, data flow, tests, extension points, recent activity, known issues — include what serves this component, skip what doesn't. The dossier is for downstream synthesis, not human reading; keep prose tight.
>
> **Required fixed sections (at the end of the dossier, in this order)** — these are mechanical inputs to `/ingest`, not content:
> 1. **Cross-reference candidates** — 5-15 existing vault notes (from `vault/Index.md`) that overlap topically, each with a one-sentence justification.
> 2. **Suggested frontmatter** — propose `tags` (must come from `~/projects/repositories/galaxy-brain/meta_tags.yml`), `component`, `galaxy_areas`, `summary` (20-160 chars, no `:` or `#`), `related_notes`, `related_prs`, and a filename of the form `Component - <Name>.md`.
>
> **Required up-front content** (wherever it fits naturally — header, intro, overview):
> - **Scope statement**: what facet of this component is in scope, what is explicitly out. If the prompt was ambiguous and a choice was made, say so.
> - **Galaxy SHA**: the verification anchor.
>
> **Hard rules (correctness, not shape)**:
> - Every file path, symbol, line number, or signature in the dossier must be backed by a real read of the live file at SHA `<SHA>`. Grep first; cite second.
> - "Not found at SHA `<SHA>`" beats invented citations. If the user's prompt names a symbol/file that doesn't exist or has moved, flag it and propose the current equivalent.
> - Grounded in the Galaxy code, not web search. Orientation URLs (if provided) may be `WebFetch`ed as pointers, but file/line citations come from the checkout.
> - Do not modify the Galaxy clone or write to the vault. Dossier only.
>
> **Output**: write the dossier to `~/projects/repositories/galaxy-brain/.ingest-dossiers/Component-<slug>.md` (create directory if missing). This is a working artifact — gitignored, consumed by `/ingest`, then deleted.

### 6. Hand off to `/ingest`

Once the subagent reports the dossier path:
- Surface a one-paragraph summary of what the dossier contains, what scope it landed on, and any cross-checks that turned up surprises (renamed symbols, missing files, contradictions with the user's prompt).
- Run `/ingest <dossier-path>` to create the vault note. The dossier filename's `<slug>` should approximate the final note title so `/ingest`'s subtype/title detection works smoothly (it should land on `subtype: component` and the `vault/templates/research-component.md` shape).
- After `/ingest` completes, delete the dossier file.

### 7. House-keeping

- Ensure `.ingest-dossiers/` is gitignored at the galaxy-brain repo root (add to `.gitignore` if missing).
- The Galaxy clone is left at whatever ref it was on; do not switch branches as a side effect.

## Notes for the agent

- This is the prose-prompt sibling of `/ingest-gx-pr`. Same verification floor, same handoff contract, looser dossier shape.
- Do not let the subagent modify the Galaxy clone or write to the vault directly — it produces a dossier only.
- If the Galaxy clone is on a branch other than `dev`, all citations target `origin/dev` via `git show origin/dev:<path>` style reads. Do not silently rebase the user's working branch.
- Galaxy-specific. Do not generalize to other repos without an explicit user request.
- If the user's prompt is broad enough that the natural output would be sprawling, push back with a scoping question (step 1) rather than producing a 600-line note.
