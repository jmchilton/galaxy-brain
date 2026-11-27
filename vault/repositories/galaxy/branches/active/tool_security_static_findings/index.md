---
upstream_base_branch: dev
child_branches:
  - tool_patches_static_findings
  - tool_security_runtime
related_records:
  - galaxy/branches/tool_patches
  - galaxy/branches/stock_tools_review_clean
---
# Static tool security findings (analyser, spec, codes, CLI) without runtime enforcement

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:tool_security_static_findings?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_security_static_findings)

## Status

READY. Implemented, re-scoped and re-hardened. The history was squashed to 6 commits on 2026-11-26, with the tree unchanged, then one commit was added; the old 101-commit head `d4ae281e442` is kept as alt `_alt_cherry_pick_history`. Re-synced with `tool_security_review_spec` on 2026-11-27 (gx_workhorse-3): 15 static ports of its newer commits (getattr, select and literal-list loops, template macros and `#include`, interpreter lookup scope) and one commit pinning the output size limit allowance through `getVar` and a subscript. Head `0ad21214cce`; 810 security unit tests pass, and the analyser's `to_dict()` matches the spec head on the spec and functional tools.

## Decisions

- Source: `jmchilton/tool_security_review_spec` at `6eb4ad6ae71` (first ported at `d5f7cb05e91`), which stacks on mvdbeek's `tool-security-review-on-load`. Port only the static piece; no findings at job preparation, no `ToolEvaluator.build()` enforcement, no job refusals, no runtime config (John, 2026-11-25).
- Method: `cherry-pick -x` the static and mixed commits onto `origin/dev`, keeping authorship; drop runtime hunks; skip runtime-only commits; one framing cleanup commit (approved 2026-11-25).
- History: squashed to 6 commits that keep authorship, with `Co-authored-by` trailers on the mixed ones (John, 2026-11-26). See `implementation_debrief.md`.
- Sanitizer move (`7ea120eef20`): stays the first commit of this branch, not its own PR. No re-export shim at `galaxy.tools.parameters.sanitize`; assume no outside importers (John, 2026-11-26).
- Data source tools (`76a196cdabf`): the exact read `$__app__.config.output_size_limit` (26 stock data source XMLs) produces no finding, via `_HARMLESS_APP_READS` in `capabilities.py`. Spec cases `output_size_limit_read` and `output_size_limit_reach`. Chosen over a Galaxy change to `DataSourceTool` and the XMLs (John, 2026-11-26). Ported to `tool_security_review_spec` as `6eb4ad6ae71`, with jobs for the cases and the `getVar`/subscript pins of this branch's `4fc16ad6b65`, so later re-syncs carry it from the source.
- Drop the LLM judge from mvdbeek's analyser (`judge.py`, `test_judge.py`, the CLI's `--judge`, `Finding.assessment`/`Report.assess()`, its docs) as a new commit on this branch, not folded into `005924736ea`. Keep it off re-syncs from `tool_security_review_spec`, which still has it. Branch 4 drops its judge test scaffolding to match (John, 2026-11-27).
- Source pin `6eb4ad6ae71` (2026-11-27). Each spec commit after `d5f7cb05e91` is one commit here (`cherry picked from` trailer), messages reworded to static behaviour; spec cases keep `review` only (no `code`/`red`/`green`) and new spec tools are listed in `MANIFEST.in`.

## Children

- `tool_patches_static_findings`.
- `tool_security_runtime`: runtime enforcement on top, built in parallel.

Both sit on `0ad21214cce` (rebased 2026-11-27 by gx_workhorse-3, their single writer).

## Re-sync when `tool_security_review_spec` settles

1. Fetch `jmchilton/tool_security_review_spec` and note the new tip `S`.
2. Run `git diff <pin> S --` on the static paths:
   - `lib/galaxy/tool_util/security`
   - `test/unit/tool_util/security`
   - `doc/source/admin/tool_security_review.md`
   - `lib/galaxy/tool_util/parser/sanitize.py`
   - `packages/tool_util/MANIFEST.in`

   Skip `galaxy/tools/security_review.py`, the evaluator, the config, the app wiring, the runtime tests, `codes.py` (its descriptions live in `classify.py` here) and anything judge-related.
3. Apply the static hunks on top of this branch as new topical commits, or fold them into the matching squash commit. Drop runtime framing. Use `rerere.enabled=false`.
4. Check that the analyser's `to_dict()` output still matches source `S` on the spec and functional tools (`simple_constructs.yml` differs only because the source's older YAML parser fails on it). Then run `test/unit/tool_util/security`, ruff, black, isort and mypy.
5. Update the pin above to `S`, and rebase the children with `--onto`.
