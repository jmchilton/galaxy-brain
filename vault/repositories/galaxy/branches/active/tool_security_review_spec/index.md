---
upstream_base_branch: release_25.1
---
# Declarative spec, codes and docs for the tool security review

- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_security_review_spec)
- [Compare to mvdbeek/tool-security-review-on-load](https://github.com/mvdbeek/galaxy/compare/tool-security-review-on-load...jmchilton:galaxy:tool_security_review_spec)

## Status

Implementation started 2026-11-23.

## Decisions

- Stacked on mvdbeek's unmerged `tool-security-review-on-load` (based at `37ae008d5db`); John offered to take docs and declarative testing for it, Marius agreed. Base for diffs and rebases is `mvdbeek/tool-security-review-on-load`, not `release_25.1`.
- Every refusal kind gets a CODE, each with red and green cases on a real tool XML and a real job context, documented in a new docs section.
- Spec tools and cases ship in the package at `lib/galaxy/tool_util/security/spec/` (John asked for `security_review/spec`; kept under the existing `galaxy.tool_util.security` package), not in `test/functional/tools`: Planemo and the Tool Shed will reuse them.
- "Real tool" means a real tool XML file written for the spec. Don't search the Tool Shed for vulnerable tools (John, 2026-11-23).
