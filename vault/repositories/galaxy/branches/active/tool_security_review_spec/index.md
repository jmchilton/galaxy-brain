---
upstream_base_branch: release_25.1
---
# Declarative spec, codes and docs for the tool security review

- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_security_review_spec)
- [Compare to mvdbeek/tool-security-review-on-load](https://github.com/mvdbeek/galaxy/compare/tool-security-review-on-load...jmchilton:galaxy:tool_security_review_spec)

## Status

In progress, pushed. Head `6eb4ad6ae71` on `jmchilton/tool_security_review_spec`. Landed 2026-11-27: the loop readings over literal lists and select values (`8d1d17cbc3d`), the interpreter lookup-scope fixes for lambdas, generators, comprehensions, `#block`, `getVar` and in-place list growth plus the test-challenge pins (`8d1845286e0..ba8b70b6d35`), and the output size limit allowance carried over from `tool_security_static_findings` (`6eb4ad6ae71`). At the head, 777 security unit tests and the 1973 tests of `test/unit/app/tools/test_security_review_spec.py` (run alone) pass.

The test challenge debrief is `test_challenges_debrief.md` (earlier one in `earlier_drafts/1/`); review debriefs are in `subagents/`. Static changes are ported to `tool_security_static_findings`, whose source pin is this head.

## Decisions

- Stacked on mvdbeek's unmerged `tool-security-review-on-load` (based at `37ae008d5db`); John offered to take docs and declarative testing for it, Marius agreed. Base for diffs and rebases is `mvdbeek/tool-security-review-on-load`, not `release_25.1`.
- Every refusal kind gets a CODE, each with red and green cases on a real tool XML and a real job context, documented in a new docs section.
- Spec tools and cases ship in the package at `lib/galaxy/tool_util/security/spec/` (John asked for `security_review/spec`; kept under the existing `galaxy.tool_util.security` package), not in `test/functional/tools`: Planemo and the Tool Shed will reuse them.
- "Real tool" means a real tool XML file written for the spec. Don't search the Tool Shed for vulnerable tools (John, 2026-11-23).
- No `enforce` alias for `enforce_code`; the default level stays `enforce_code` (John, 2026-11-26).
