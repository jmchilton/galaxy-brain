---
upstream_base_branch: dev
---
# Tool Shed form fields keep a low-contrast border (#24648)

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_24648_shed_field_border?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24648_shed_field_border)

## Status

Polished at `85ca630bac6`; waiting for John's final review.

Fork CI has only unrelated reds.

- [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [polish debrief](polish_debrief.md)

## Decisions

Targets `dev`: `release_26.2` has the low-contrast rule but not #24569's grey-500 `GFormInput` border that the fix falls back to.

## CI Diagnosis (`85ca630bac6`, 2026-11-06)

Unrelated: `Test Galaxy packages` mypy `kombu` `Queue` error, and `macOS startup`, neither failing in dev's last 3 runs. CSS-only change.
