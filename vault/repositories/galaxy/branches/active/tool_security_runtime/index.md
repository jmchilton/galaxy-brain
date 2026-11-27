---
upstream_base_branch: dev
parent_branch: tool_security_static_findings
related_records: galaxy/branches/stock_tools_review_clean
---
# Tool security review with runtime enforcement (job refusals) on the static findings

- [Open PR](https://github.com/jmchilton/galaxy/compare/tool_security_static_findings...tool_security_runtime?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_security_runtime)

## Status

Implemented and hardened, with the upload1 exemption added, and rebased onto branch 1's `0ad21214cce` (2026-11-27, after branch 1's re-sync to spec `6eb4ad6ae71`). BLOCKED on a defaults decision: the default `enforce_code` + `strict` still refuses some functional test tools. Head `b9cd00f067b`. After the rebase: unit suites 3045 passed (1065 for security, `test_security_review.py` and `test_cached_tool.py`; 1980 for `test_security_review_spec.py` run alone), and `test/integration/test_tool_security_review.py` 11 of 11.

No PR; CI not run.

## Decisions

- Branch 3 of 4 split out of the tool-security work: `tool_security_static_findings` plus the runtime enforcement (job-prep review, `ToolEvaluator` enforcement, refusals, runtime config, app wiring) it stripped (John, 2026-11-26).
- Source pin: runtime code from `jmchilton/tool_security_review_spec` at `d5f7cb05e91` only, read via `git show`; that branch's ref and worktree are never touched.
- Based on parent head `0ad21214cce` (2026-11-27), which allows the data source tools' `$__app__.config.output_size_limit` read. In the rebased spec commit, `MockAppConfig` gets `output_size_limit = 0`, and every case the parent adds gets the doc, `code` and red/green jobs of the same case in `tool_security_review_spec` (`6eb4ad6ae71`), keeping the parent's `review`; the generated docs section is regenerated.
- Exempt Galaxy's own `upload1` (John, 2026-11-26). It's matched by its real path against the bundled `upload.xml`, never by id or action. The helper is shared byte-for-byte with branch 4.
- Where the parent's re-scope replaced something the runtime calls (`_no_plain_value` became `classify()`, the `Rule` catalog), the runtime uses the parent's version.

## Re-sync with newer source commits

`tool_security_review_spec` moved past the pin (45231d97bac at branch time; the four commits `d5f7cb05e91..45231d97bac` are static-analyser and spec only, so they belong to the parent first). To pick up later runtime changes: `git log --oneline d5f7cb05e91..<new source head> -- lib/galaxy/tools/security_review.py lib/galaxy/tools/evaluation.py lib/galaxy/tools/__init__.py lib/galaxy/app.py lib/galaxy/structured_app.py lib/galaxy/jobs lib/galaxy/config lib/galaxy/app_unittest_utils test/unit/app/tools/test_security_review*.py test/integration/test_tool_security_review.py lib/galaxy/tool_util/security/codes.py`, then port each diff (`git diff d5f7cb05e91 <new head> -- <paths>`) with `git apply -3`, rewriting `lib/galaxy/app.py` and `lib/galaxy/structured_app.py` to their dev packages (`*/__init__.py`), and adapt to `classify()`/`rules.py` as here. Static-analyser changes go to `tool_security_static_findings` first, then rebase this branch.
