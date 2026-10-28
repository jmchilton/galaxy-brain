Deep-research a Galaxy PR against the current `dev` branch, then hand off to `/ingest` to create the vault note.

Source: $ARGUMENTS

This command does the verification work that plain `/ingest` skips for Galaxy PRs — it cross-checks every file path, symbol, and line cited in the PR against current Galaxy `dev`, surfaces what changed since the PR merged, and produces a dossier rich enough to drive PR-18641-grade vault notes.

## Steps

### 1. Parse the input

`$ARGUMENTS` should be one of:
- `https://github.com/galaxyproject/galaxy/pull/<N>`
- `<N>` (bare PR number — assume `galaxyproject/galaxy`)

If empty, ask for a PR number/URL and stop. Reject non-`galaxyproject/galaxy` URLs with a note that this command is Galaxy-specific.

### 2. Locate the Galaxy clone

Per `~/.claude/CLAUDE.md`, Galaxy clones live under `~/projects/repositories/`. Use `~/projects/repositories/galaxy/` as the canonical location.

If that path does not exist, ask the user before cloning (do not clone unprompted; the user has strong opinions about where repositories go).

### 3. Update the clone

In `~/projects/repositories/galaxy/`:
- Verify a clean working tree (`git status --porcelain`). If dirty, surface the dirty files and ask before proceeding — do not stash or discard.
- `git fetch origin dev`
- If on `dev` and the tree is clean, fast-forward: `git merge --ff-only origin/dev`. If on another branch, do not switch — record the merge SHA from `origin/dev` and pass `--source <ref>` semantics to subsequent commands using `git -C ... show origin/dev:<path>` and `git log origin/dev ...`.

Record the current `origin/dev` SHA. Every line-number citation in the dossier is anchored to this SHA.

### 4. Launch the deep-research subagent

Spawn a `general-purpose` subagent with full read access to `~/projects/repositories/galaxy/`. Brief it as follows (parameterize the PR number and Galaxy SHA):

> **Task**: produce a deep-research dossier for galaxyproject/galaxy#<N> verified against `origin/dev` at SHA `<SHA>`. The dossier will be handed to `/ingest` to create a vault note in galaxy-brain. Match the depth of `vault/research/PR 18641 - Parameter Model Improvements Research.md` in `~/projects/repositories/galaxy-brain/` — read it first as the depth bar.
>
> **Inputs**:
> - `gh pr view <N> --repo galaxyproject/galaxy --json number,title,body,author,state,labels,files,createdAt,mergeCommit,mergedAt`
> - The Galaxy clone at `~/projects/repositories/galaxy/` (currently at `<SHA>`)
> - The list of files the PR touched
>
> **Required dossier sections** (in this order):
> 1. **Header** — PR number, title, author, state, merged-at, labels, parent issues/PRs referenced in the body.
> 2. **Summary** — 2-4 sentences synthesizing what the PR actually does. Compile, do not restate the PR body.
> 3. **Changes** — for each meaningful component the PR touched:
>    - The PR's claim (paraphrased).
>    - **Current location**: live file path + line numbers at SHA `<SHA>`. Use ripgrep / `git show` against `~/projects/repositories/galaxy/` to find the symbol now. If renamed/moved/deleted, say so.
>    - Concrete signatures or one-line code excerpts when they aid understanding.
> 4. **Changes since PR** — `git log <merge-sha>..origin/dev -- <each-file>` for the 5-10 most load-bearing files the PR touched. Summarize follow-up commits that renamed, removed, extended, or fixed bugs in the PR's contributions. Cite commit SHAs.
> 5. **File path migration table** — for any file the PR touched that has since moved or been renamed: PR-era path | current path | reason.
> 6. **Tests** — what tests the PR added/modified, current location, whether they still pass at HEAD.
> 7. **Cross-checks** — explicitly verify any specific claim in the PR body that names a file, line, function, migration revision, package, or count. Flag mismatches (e.g., PR body says revision id `X`, file is named after revision id `Y`).
> 8. **Unresolved questions** — concise list of questions raised by the diff that the PR body does not answer; or behaviors that look load-bearing but are tested only weakly.
> 9. **Cross-reference candidates** — list 5-15 existing vault notes (read `~/projects/repositories/galaxy-brain/vault/Index.md` for the catalog) that overlap topically. For each, one-sentence justification.
> 10. **Suggested frontmatter** — proposed `tags` (must come from `~/projects/repositories/galaxy-brain/meta_tags.yml`), `summary` (20-160 chars, no `:` or `#`), `related_prs`, `related_notes`, and a filename of the form `PR <N> - <Short Title>.md`.
>
> **Verification rules**:
> - Every "Current location" must be backed by a real read of the live file. No symbol assumed to exist — grep first.
> - When the PR body and the diff disagree (e.g., a migration revision id), trust the diff and note the discrepancy.
> - Do not invent line numbers. If you cannot find a symbol, say "not found at SHA `<SHA>`".
>
> **Output**: write the dossier to `~/projects/repositories/galaxy-brain/.ingest-dossiers/PR-<N>-<short-slug>.md` (create directory if missing). This file is a working artifact — it is gitignored and will be consumed by `/ingest` and then deleted. Keep prose tight; the dossier is for downstream synthesis, not human reading.

### 5. Hand off to `/ingest`

Once the subagent reports the dossier path:
- Surface a one-paragraph summary of what the dossier contains and what cross-checks turned up surprises.
- Run `/ingest <dossier-path>` to create the vault note. The dossier filename's `<short-slug>` should approximate the final note title so `/ingest`'s subtype/title detection works smoothly.
- After `/ingest` completes, delete the dossier file (it has served its purpose; the vault note is the durable artifact).

### 6. House-keeping

- Ensure `.ingest-dossiers/` is gitignored at the galaxy-brain repo root (add to `.gitignore` if missing).
- The Galaxy clone is left at whatever ref it was on; do not switch branches as a side effect.

## Notes for the agent

- Do not let the subagent modify the Galaxy clone or write to the vault directly — it produces a dossier only.
- If the Galaxy clone is on a branch other than `dev`, all citations should still target `origin/dev` via `git show origin/dev:<path>` style reads. Do not silently rebase the user's working branch.
- If `gh pr view` fails (network, auth, missing), surface the error and stop — do not synthesize from cached state.
- This command is Galaxy-specific. Do not generalize it to other repos without an explicit user request.
