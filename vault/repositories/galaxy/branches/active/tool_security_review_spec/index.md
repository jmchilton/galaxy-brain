---
upstream_base_branch: release_25.1
---
# Declarative spec, codes and docs for the tool security review

- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_security_review_spec)
- [Compare to mvdbeek/tool-security-review-on-load](https://github.com/mvdbeek/galaxy/compare/tool-security-review-on-load...jmchilton:galaxy:tool_security_review_spec)

## Status

In progress, pushed. Head `5d002704315` on `jmchilton/tool_security_review_spec`, 123 commits on `origin/release_25.1` (mvdbeek's 85, then ours). Landed 2026-11-27:
- the loop readings over literal lists and select values (`8d1d17cbc3d`);
- the interpreter lookup-scope fixes for lambdas, generators, comprehensions, `#block`, `getVar` and in-place list growth, plus the test-challenge pins;
- the output size limit allowance carried over from `tool_security_static_findings`;
- after the rebase, the narrowed maybe-unset `#set` read, the Galaxy names a data source tool's job parameters replace, and the getVar and `#set global` namespace reads (`2963dcacc1e..5d002704315`).

At the head, 972 security unit tests and the 2121 tests of `test/unit/app/tools/test_security_review_spec.py` (run alone) pass. The pre-rebase head is the local branch `tool_security_review_spec_pre_rebase` (`6eb4ad6ae71`).

The test challenge debrief is `test_challenges_debrief.md` (earlier one in `earlier_drafts/1/`); review debriefs are in `subagents/`. Static changes are ported to `tool_security_static_findings`, whose source pin is this head.

## Decisions

- Stacked on mvdbeek's unmerged `tool-security-review-on-load` (originally at `37ae008d5db`); John offered to take docs and declarative testing for it, Marius agreed.
- Rebased, with mvdbeek's commits, onto `origin/release_25.1` to pick up `ad4281d8ee5` (job parameters that are not tool inputs stay out of templates), with no conflicts (John, 2026-11-27). mvdbeek's part is now the branch `mvdbeek_tool_security_review_on_load_rebased` (pushed to `jmchilton`) (`d8fc9a8c777`). Diff our work against that branch, not against `mvdbeek/tool-security-review-on-load`, which still sits on the old base.
- Every refusal kind gets a CODE, each with red and green cases on a real tool XML and a real job context, documented in a new docs section.
- Spec tools and cases ship in the package at `lib/galaxy/tool_util/security/spec/` (John asked for `security_review/spec`; kept under the existing `galaxy.tool_util.security` package), not in `test/functional/tools`: Planemo and the Tool Shed will reuse them.
- "Real tool" means a real tool XML file written for the spec. Don't search the Tool Shed for vulnerable tools (John, 2026-11-23).
- No `enforce` alias for `enforce_code`; the default level stays `enforce_code` (John, 2026-11-26).
