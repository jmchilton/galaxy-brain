Store details about implementing and tracking branches in:

vault/repositories/PROJECT/branches/STATUS/BRANCH_NAME/

For PROJECT in (galaxy, pulsar, planemo, etc...).

## Statuses

A branch lives under exactly one directory status:

- `active/` — unmerged work, including parked branches and retained references.
- `merged/` — the work landed.
- `abandoned/` — John explicitly decided to drop it.

The branch-tracking agent defines finer workflow statuses in `index.md` and its tracking index. Implementation, polishing, CI, reviews, approvals, parking, and opening a PR do not move the directory; agents may be working there.

On merge or explicit abandonment, move the directory once agents working there have finished, and update the tracking index and links together. A closed, unmerged PR stays under `active/` pending a decision.

## Directory Contents

Each directory contains an `index.md` file without frontmatter. It serves as a status tracker and holds action links for the user.

File names follow the File Docs: `vault/repositories/_defaults/branches/FILE_DOCS.md`, with sections replaced by `vault/repositories/PROJECT/branches/FILE_DOCS.md`. Prefer a documented name over a new one; add a section when a new kind of file starts recurring. Undocumented files are fine.

Implementation notes, research, plans, reviews, and other supporting files go here.

## index.md

Keep it minimal. Start with `# <branch title>`, followed by bullet action links for "Open PR" and "View on GitHub".

Next comes `## Status`. This section should contain at most one sentence each about the branch status, PR status, and CI status, each as its own paragraph. Don't list files or keep older status updates.

Additional sections can be added as needed but should remain concise and not track transient status information. Explicit decisions, approvals, dependencies, and standing instructions should be concisely stored here if useful.
