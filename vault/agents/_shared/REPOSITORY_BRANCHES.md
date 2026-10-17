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

## Contents

Each directory contains an `index.md` file without frontmatter. It serves as an ongoing debrief as work is done.

File names follow the File Docs: `vault/repositories/_defaults/branches/FILE_DOCS.md`, with sections replaced by `vault/repositories/PROJECT/branches/FILE_DOCS.md`. Prefer a documented name over a new one; add a section when a new kind of file starts recurring. Undocumented files are fine.

Implementation notes, research, plans, reviews, and other supporting files go here. Link them near the top of `index.md`; organize the rest to suit the repository's process. Keep the agent's tracking index short, with links to these details.

Record explicit decisions, approvals, dependencies, and standing instructions as needed. A next step is not required when it follows from the workflow status.
