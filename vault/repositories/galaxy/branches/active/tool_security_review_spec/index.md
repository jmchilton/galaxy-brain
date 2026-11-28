---
upstream_base_branch: release_25.1
---
# Declarative spec, codes and docs for the tool security review

- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_security_review_spec)
- [Compare to mvdbeek/tool-security-review-on-load](https://github.com/mvdbeek/galaxy/compare/tool-security-review-on-load...jmchilton:galaxy:tool_security_review_spec)

## Status

In progress, pushed. Head `f8955682e6d` on `jmchilton/tool_security_review_spec` (was `1452f233609`), 146 commits on `origin/release_25.1` (mvdbeek's 85, then ours).

Phase 1 of the planemo-monitor sweep fixes (gx_workhorse-3, t25) landed 2026-11-28 as `1452f233609..f8955682e6d`: the spec's `absent:` matcher, the job-parameter reads (t26), FN-3 to FN-7, `$self.getVar`, FP-2, FP-3, FP-4, FP-10, FP-11, FP-14, FP-16 and the `#echo` lines, then the test challenge's two commits. Each cause is one commit. Two more commits, a job check correctness change and FN-1, are held for John's go-ahead on the local-only ref `tool_security_review_spec_held_t25`. FP-1, FP-5, FP-12, FN-2, FN-8 and the POL items are skipped, most waiting on John. Phase 2 (FP-6, FP-7, FP-13, FP-15, FP-17, FP-18 to FP-22) is next. At `f8955682e6d` the 1250 unit tests pass; at the held head, 1147 security unit tests and the 4136 spec job tests (run alone) pass. See `implementation_debrief.md`, `test_challenges_debrief.md` and `subagents/review_sweep_fixes_1.md` to `review_sweep_fixes_5.md`.

Landed 2026-11-27:
- the loop readings over literal lists and select values (`8d1d17cbc3d`);
- the interpreter lookup-scope fixes for lambdas, generators, comprehensions, `#block`, `getVar` and in-place list growth, plus the test-challenge pins;
- the output size limit allowance carried over from `tool_security_static_findings`;
- after the rebase, the narrowed maybe-unset `#set` read, the Galaxy names a data source tool's job parameters replace, and the getVar and `#set global` namespace reads (`2963dcacc1e..5d002704315`);
- branch 1's FP-2 (`repr()` of a string as a Python literal) and FP-1 (file params rendered sanitized), carried over with red and green jobs (`9f36eccfacd`, `52a1224c47c`);
- the lambda rule: every lambda the review can't read gets `template-lambda` and refuses every job, pure lambdas pass by shape, and a list method passed on as a value marks the template not analysed (`6c836a5a37b..1452f233609`). Over 3,692 corpus tools, 2 change (`scanpy_plot`, `plot_muon`), each gaining a missed source on an existing finding.

At `1452f233609`, 1082 security unit tests and the 2418 tests of `test/unit/app/tools/test_security_review_spec.py` (run alone) passed. From there on gx_workhorse-3 (t25) writes this branch for the planemo-monitor sweep fixes (agreed 2026-11-27). The pre-rebase head is the local branch `tool_security_review_spec_pre_rebase` (`6eb4ad6ae71`).

The current test challenge debrief is `test_challenges_debrief.md` (earlier ones in `earlier_drafts/1/` and `earlier_drafts/2/`); review debriefs are in `subagents/`. Static changes are ported to `tool_security_static_findings`, whose source pin is still `1452f233609`.

## Decisions

- Stacked on mvdbeek's unmerged `tool-security-review-on-load` (originally at `37ae008d5db`); John offered to take docs and declarative testing for it, Marius agreed.
- Rebased, with mvdbeek's commits, onto `origin/release_25.1` to pick up `ad4281d8ee5` (job parameters that are not tool inputs stay out of templates), with no conflicts (John, 2026-11-27). mvdbeek's part is now the branch `mvdbeek_tool_security_review_on_load_rebased` (pushed to `jmchilton`) (`d8fc9a8c777`). Diff our work against that branch, not against `mvdbeek/tool-security-review-on-load`, which still sits on the old base.
- Every refusal kind gets a CODE, each with red and green cases on a real tool XML and a real job context, documented in a new docs section.
- Spec tools and cases ship in the package at `lib/galaxy/tool_util/security/spec/` (John asked for `security_review/spec`; kept under the existing `galaxy.tool_util.security` package), not in `test/functional/tools`: Planemo and the Tool Shed will reuse them.
- "Real tool" means a real tool XML file written for the spec. Don't search the Tool Shed for vulnerable tools (John, 2026-11-23).
- No `enforce` alias for `enforce_code`; the default level stays `enforce_code` (John, 2026-11-26).
- A name a `#set` may not have bound reads as the local or the job parameter, but only for names a job can send on the rebased base: declared inputs, the tool's `template_job_parameters`, or any name on a tool that keeps undeclared job parameters (John, 2026-11-27).
- Every lambda in a template is flagged as code the review can't check, except pure lambdas, whose bodies read only their arguments, literals, `$` names and allowed builtins, and change nothing. The real uses pass by shape, not through a per-tool list (John, 2026-11-27).
- A template that only compiles through Galaxy's Python 2 path is fixed upstream (cmscan: bgruening/galaxytools#2145) or with a `python2to3` patch in the tool patch database, not by converting it inside the analyser (John, 2026-11-27).
- The planemo-monitor sweep fixes land on this branch first, one commit per catalogue cause, each checked against a regression run of the analyser over the sweep's corpus. They reach `tool_security_static_findings` through re-syncs (John, 2026-11-27).
- `${__app__['config'].output_size_limit}` keeps its high finding with no uncheckable code. It's unexercised: no tool uses it, and the `$__app__` wrapper can't be subscripted (John, 2026-11-27).
