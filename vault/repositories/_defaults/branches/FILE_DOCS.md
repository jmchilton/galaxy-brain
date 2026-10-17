# Branch File Docs

Default conventions for files in `repositories/<repo>/branches/<status>/<branch>/`. A repository's own `branches/FILE_DOCS.md` replaces any section with the same pattern. Records may also hold other plans, questions, notes, and scripts.

## index.md

Ongoing debrief of the branch, without frontmatter. Links implementation notes, research, plans, reviews, and other supporting files near the top. Records explicit decisions, approvals, dependencies, and standing instructions.

## pr_description.md

Proposed PR description, linked from `index.md`.

## screenshots/

Local captures for inspecting behavior and supporting reviews or PR descriptions. Ignored by git; describe useful captures in the notes.
