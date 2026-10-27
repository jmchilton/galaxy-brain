---
upstream_base_branch: release_26.1
---
# Fix workflow imports containing embedded tools

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:workflow_import_embedded_tools?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_import_embedded_tools)

## Status

Rebased onto `release_26.1` and tool-count assertion added for dannon's review at `82a993c494a`.

[#24475](https://github.com/galaxyproject/galaxy/pull/24475) open, approved by dannon; response drafted in [review_pushback_dannon_1.md](review_pushback_dannon_1.md).

Fresh CI pending on `82a993c494a`; targeted import API tests pass locally.

## Review

- [PR description](pr_description.md)
- [Title options](pr_titles.md)
- [Recommended labels](pr_tags.md)
- [dannon review response](review_pushback_dannon_1.md)
- [Polishing debrief](polish_debrief.md)
- [Implementation and hardening handoff](implementation_debrief.md)
