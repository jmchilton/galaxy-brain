# Issue Incubator File Docs

Default conventions for files in `repositories/<repo>/issues_incubator/<status>/<short_name>/`: issue drafts not yet on GitHub. `incubating/` drafts await preparation or a decision, `internal/` ones are tracked here instead of on GitHub, and `rejected/` ones won't be filed. A posted draft moves to an `issues/` record. A repository's own `issues_incubator/FILE_DOCS.md` replaces any section with the same pattern.

## index.md

Status of the draft, without frontmatter: a `# ` title, then one line describing the issue and the current recommendation.

## raw.md

The rough, context-heavy draft queued by the agent that found the issue.

## proposal.md

The reviewed issue description, as proposed for posting. Absent when the draft is recommended for rejection.

## issue_tags.md

Recommended labels, one backticked label per bullet, applied when the draft is posted.

## debrief.md

Debrief of the research and rewrite behind the proposal, or the case for rejecting the draft.
