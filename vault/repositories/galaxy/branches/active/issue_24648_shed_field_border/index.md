---
upstream_base_branch: dev
---
# Tool Shed form fields keep a low-contrast border (#24648)

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_24648_shed_field_border?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24648_shed_field_border)

## Status

Implemented and hardened (READY); pushed to the fork at `85ca630bac6`.

## Decisions

Targets `dev`: `release_26.2` has the low-contrast rule but not #24569's grey-500 `GFormInput` border that the fix falls back to.
