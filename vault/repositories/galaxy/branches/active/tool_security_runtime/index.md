---
upstream_base_branch: dev
parent_branch: tool_security_static_findings
---
# Tool security review with runtime enforcement (job refusals) on the static findings

- [Open PR](https://github.com/jmchilton/galaxy/compare/tool_security_static_findings...tool_security_runtime?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_security_runtime)

## Status

Implemented and hardened; BLOCKED on a defaults decision (default `enforce_code` + `strict` refuses Galaxy's own `upload1`, `model_attributes`, `config_vars` and `command_reads_configfile` jobs, inherited from the source), head `26e15a538bd`.

No PR; CI not run.

## Decisions

- Branch 3 of 4 split out of the tool-security work: `tool_security_static_findings` plus the runtime enforcement (job-prep review, `ToolEvaluator` enforcement, refusals, runtime config, app wiring) it stripped (John, 2026-11-26).
- Source pin: runtime code from `jmchilton/tool_security_review_spec` at `d5f7cb05e91` only, read via `git show`; that branch's ref and worktree are never touched.
- Based on the squashed parent head `d4e4f68dd25` (tree identical to the pre-squash `d4ae281e442`).
- Where the parent's re-scope replaced something the runtime calls (`_no_plain_value` became `classify()`, the `Rule` catalog), the runtime uses the parent's version.

## Re-sync with newer source commits

`tool_security_review_spec` moved past the pin (45231d97bac at branch time; the four commits `d5f7cb05e91..45231d97bac` are static-analyser and spec only, so they belong to the parent first). To pick up later runtime changes: `git log --oneline d5f7cb05e91..<new source head> -- lib/galaxy/tools/security_review.py lib/galaxy/tools/evaluation.py lib/galaxy/tools/__init__.py lib/galaxy/app.py lib/galaxy/structured_app.py lib/galaxy/jobs lib/galaxy/config lib/galaxy/app_unittest_utils test/unit/app/tools/test_security_review*.py test/integration/test_tool_security_review.py lib/galaxy/tool_util/security/codes.py`, then port each diff (`git diff d5f7cb05e91 <new head> -- <paths>`) with `git apply -3`, rewriting `lib/galaxy/app.py` and `lib/galaxy/structured_app.py` to their dev packages (`*/__init__.py`), and adapt to `classify()`/`rules.py` as here. Static-analyser changes go to `tool_security_static_findings` first, then rebase this branch.
