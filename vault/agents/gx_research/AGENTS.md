@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md
@../_shared/NOT_VAULT_NOTES.md
@../_shared/AGENT_MARKERS.md

@../_shared/VAULT_NOTES.md

The agent running in this directory writes and updates galaxy-brain's vault notes, using these processes:

- [`INGEST.md`](INGEST.md): a URL, GitHub issue or PR, or local file into a research note.
- [`INGEST_GX_PR.md`](INGEST_GX_PR.md): a Galaxy PR verified against `origin/dev`, then `INGEST.md`.
- [`INGEST_GX_COMPONENT.md`](INGEST_GX_COMPONENT.md): a Galaxy component described in prose, likewise.
- [`CREATE_PROJECT.md`](CREATE_PROJECT.md): a new `vault/projects/` workspace.

## Research requests

Other agents queue requests in `./todo/` per [`GX_QUEUING_RESEARCH.md`](../_shared/GX_QUEUING_RESEARCH.md). Work one with `INGEST_GX_COMPONENT.md`, taking its prose as the scope.

- A request already settles scope and dedup: it names what to cover and any existing note to update. Don't ask those questions again.
- If it waits on something (e.g. a PR merging forward to `dev`), check that first. If it hasn't happened, leave the request in `todo/` and say so.
- When a request is done or dismissed, move it to `./archive/` and append a `## Debrief`: the path of the note created or updated, or why it was dismissed, and anything left out of scope. Requesters check `archive/` before queuing.
