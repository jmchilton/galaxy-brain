---
upstream_base_branch: dev
parent_branch: tool_security_static_findings
related_records: galaxy/branches/stock_tools_review_clean
---
# Tool security review with runtime enforcement (job refusals) on the static findings

- [Open PR](https://github.com/jmchilton/galaxy/compare/tool_security_static_findings...tool_security_runtime?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_security_runtime)

## Status

BLOCKED on the defaults decision, as before: the default `enforce_code` + `strict` still refuses some functional test tools. The 2026-11-28 revision (interactive and CWL tools left out) is done.

- Head `ac59cad3390`, pushed (was `4b200abef4e`).
- It is built on shared commit S'' `5a893ddceb2` ("Share the tool security refusal"; it was `e04753dca51`), which sits on branch 1 `590a784bd04`. `tool_patches_static_findings` carries S'' unchanged, so S'' is the branches' merge base.
- Exclusion rule: `review_exclusion(tool_file(tool), tool.tool_type)` in S'' leaves these out of the review and the per-job value check:
  - Galaxy's own tools: upload1, set metadata, data fetch, history import/export;
  - interactive tools: the class Galaxy built is `InteractiveTool`;
  - CWL tools.

  The tools with nothing to review (no command, user-defined, expression) are left alone too. Findings are still reported by the analyser and CLI.
- An ftpfile param is checked as Galaxy writes it.

Tests (2026-11-28):
- unit suites: 3798 passed, 2 xpassed;
- `test/integration/test_tool_security_review.py`: 11 of 11;
- both upload and library API tests pass;
- ruff, black and isort are clean on the changed files; mypy adds no new errors.

See `implementation_debrief.md`.

No PR; CI not run.

## Decisions

- Branch 3 of 4 split out of the tool-security work: `tool_security_static_findings` plus the runtime enforcement (job-prep review, `ToolEvaluator` enforcement, refusals, runtime config, app wiring) it stripped (John, 2026-11-26).
- Source pin: runtime code from `jmchilton/tool_security_review_spec` at `1452f233609` (first `d5f7cb05e91`) only, read via `git show`; that branch's ref and worktree are never touched.
- Based on parent head `0ad21214cce` (2026-11-27), which allows the data source tools' `$__app__.config.output_size_limit` read. In the rebased spec commit, `MockAppConfig` gets `output_size_limit = 0`, and every case the parent adds gets the doc, `code` and red/green jobs of the same case in `tool_security_review_spec` (now `1452f233609`), keeping the parent's `review`; the generated docs section is regenerated. The runtime side of later spec commits goes on top, one commit each with a `cherry picked from` trailer.
- Exempt Galaxy's own `upload1` (John, 2026-11-26). It's matched by its real path against the bundled `upload.xml`, never by id or action. The helper is shared byte-for-byte with branch 4.
- Shared plumbing with branch 4 (John, 2026-11-27): one identical base commit both children carry on top of branch 1, holding `ToolInputRejected`, the upload1 helpers, one "Galaxy's own tool" check and one runner catch. Branch 3 adopts branch 4's direct fail on Pulsar: a refused job fails at once, never resubmitted.
- Galaxy's own tools, exempt from review in both branches (John, 2026-11-27): only upload1 (unless patched), set metadata, data fetch, and history import/export. Everything else Galaxy ships (stock tools in every install layout, converters, collection operations, sample sheet tools) is reviewed. Tools that then get findings are fixed (`stock_tools_review_clean`) or their false positives are removed from the analyser, rather than exempted. The per-job value check skips the same exempt tools.
- Interactive tools (`tool_type="interactive"`, any source) are excluded from the job-preparation review and the per-job value check in both branches, and the admin docs and config descriptions say so plainly (John, 2026-11-27). Their findings are still reported by the analyser. Done 2026-11-28 (`625cafee849`): `review_exclusion` in S'' on the type of the class Galaxy builds (`Tool.tool_type` here, `built_tool_type()` in branch 4).
- CWL tools are excluded the same way in both branches, and documented alongside interactive tools (John, 2026-11-27). Branch 4 had read `$__cwl_command` as an unquoted command and refused every CWL tool. Done 2026-11-28 (`625cafee849`); Galaxy does not build CWL tools yet, so here it is for when runtime support lands.
- Shared base commit S'' is `5a893ddceb2` (2026-11-28; it was `e04753dca51`, before that `5659a4db4a4`); it adds `review_exclusion`, `built_tool_type` and `galaxy.tools.tool_class_for_source`. Rebase S first when branch 1 moves, then `git rebase --onto <new S> <old S>` both children. Branch 1's spec cases need red and green jobs here, as in the spec commit.
- Where the parent's re-scope replaced something the runtime calls (`_no_plain_value` became `classify()`, the `Rule` catalog), the runtime uses the parent's version.

## Re-sync with newer source commits

`tool_security_review_spec` moved past the pin (45231d97bac at branch time; the four commits `d5f7cb05e91..45231d97bac` are static-analyser and spec only, so they belong to the parent first). To pick up later runtime changes (ported through `1452f233609`; use it as the base below): `git log --oneline d5f7cb05e91..<new source head> -- lib/galaxy/tools/security_review.py lib/galaxy/tools/evaluation.py lib/galaxy/tools/__init__.py lib/galaxy/app.py lib/galaxy/structured_app.py lib/galaxy/jobs lib/galaxy/config lib/galaxy/app_unittest_utils test/unit/app/tools/test_security_review*.py test/integration/test_tool_security_review.py lib/galaxy/tool_util/security/codes.py`, then port each diff (`git diff d5f7cb05e91 <new head> -- <paths>`) with `git apply -3`, rewriting `lib/galaxy/app.py` and `lib/galaxy/structured_app.py` to their dev packages (`*/__init__.py`), and adapt to `classify()`/`rules.py` as here. Static-analyser changes go to `tool_security_static_findings` first, then rebase this branch.
