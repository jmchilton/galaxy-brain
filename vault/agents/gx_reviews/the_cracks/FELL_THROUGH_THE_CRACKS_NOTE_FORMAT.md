Each file in this directory is named for a merge date (`YYYY-MM-DD.md`) and lists PRs merged that day.

A merged PR (not one closed without merging) fell through the cracks if:
- John didn't author/comment/approve/merge it.
- There is no existing review record (`vault/repositories/galaxy/reviews/active/<N>/` or `archived/<N>/`).
- No file in this directory already lists it, including `REVIEWED.md`, the log of PRs John checked off in Obsidian.

The file is a YAML list embedded in Markdown - use `gb-missed-prs` after the backticks to indicate how it should be rendered.

````markdown
```gb-missed-prs
- pr: number
  title: {title}
  author: {author}
  url: {PR URL}
  merged_at: {ISO timestamp}
  merged_by: {login}
  approvers: [{login}, ...]
  summary: {one sentence}
  discussion_summary: {one sentence}
  details: {up to three paragraphs}
  discussion: {up to three paragraphs}
```
````
