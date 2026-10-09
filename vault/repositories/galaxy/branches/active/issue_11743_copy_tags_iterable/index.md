# issue_11743_copy_tags_iterable

Status: `author_work`. Base: `dev`. [PR #23973](https://github.com/galaxyproject/galaxy/pull/23973) (open).

Types copy_tags as an iterable and preserves nested element tags when copying collections (#11743).

[Implementation](implementation_debrief.md) · [Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tracking history](tracking_history.md)

John converted the PR to draft on 2026-10-08 without recording the reason. That decision remains unresolved; green CI alone does not settle it. PR CI (2026-10-09) red only on macOS startup (3.14), not yet diagnosed.
