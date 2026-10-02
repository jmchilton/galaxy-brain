# galaxy#23819 — Reject page markdown fences the renderer can't display

- Author: dannon. Reviewed at `0358fdba35b` (base dev, +140/-1, 3 files).
- Already merged to dev as `d12f9039128` when reviewed. Worktree: `~/projects/worktrees/galaxy/pr/23819`.
- Verdict: fine to merge. The check matches the client parser. Follow-ups are about duplicated cell-type lists and paths that don't get validated.

## Summary

`validate_galaxy_markdown` now runs `_check_fence_types` first. It rejects any line that, after JS-`trim()`-equivalent stripping, starts with ```` ``` ```` and is followed by something other than `galaxy|markdown|vega|visualization|vitessce`. The error message points users at `~~~` for plain code blocks. The logic copies the client's `parseMarkdown` (`client/src/components/Markdown/parse.ts:23`), where any ```` ``` ```` line starts a new cell and an unknown name shows the "cell type not available" GAlert in `SectionWrapper.vue`. This rules out ```` ```python ````, ```` ``` galaxy ```` (leading space), `Vega` (wrong case), 4-backtick fences, and fences inside `~~~` or indented blocks. A drift test regex-scrapes `SectionWrapper.vue` for the list. 9/9 unit tests pass locally.

## Findings

1. **Medium: the invocation → page path now 400s, but workflow report markdown is never validated.** `PageManager.create` fills in content from `get_invocation_report` (`lib/galaxy/managers/pages.py:309-315`) and then runs `rewrite_content_for_import` → `_validate`. Workflow `reports_config` is stored without any markdown validation (`lib/galaxy/managers/workflows.py:989-990`). So a workflow whose report has a ```` ```python ```` block saves without error, renders the broken cell in the invocation report view, and then fails with MALFORMED_CONTENTS when the user clicks "create page from invocation". The error comes far from where the bad markdown was written. IWC corpus check: only `galaxy` and `visualization` fences appear, so real-world exposure looks small, but user-authored reports and agent-authored reports (`lib/galaxy/agents/prompts/workflow_report.md`) are unchecked.
2. **Low/medium: the cell-type list now exists in three places, and the drift test covers only one of the other two.**
   - `GALAXY_MARKDOWN_CELL_TYPES` (`lib/galaxy/managers/markdown_parse.py:25`)
   - the `SectionWrapper.vue` v-if chain
   - `VALID_TYPES` in `client/src/components/Markdown/Editor/CellWrapper.vue:96`, which the test ignores

   The file already has a single-source pipeline: `directives.yml` → `scripts/markdown_directives_doc.py` → `_markdown_directives.py` + `directives.ts` (see the comment at `markdown_parse.py:33-35`). Cell types belong in that yml, which would make the regex scrape of a `.vue` file (`test/unit/app/test_markdown_validate.py`, `test_markdown_cell_types_match_client_renderer`) unnecessary. The PR adds another accreted constant where it could have extended the existing abstraction.
3. **Low: existing stored pages are stuck until a user edits them.** A page with ```` ``` galaxy ```` or ```` ```python ```` in its latest revision now 400s on every `save_new_revision` (`pages.py:407`) until the user fixes every offending line. The error names the line, so this is acceptable. Restoring an old revision skips validation (`pages.py:437`), which is consistent. ```` ``` galaxy ```` (with a space) used to pass the backend (`GALAXY_FLAVORED_MARKDOWN_CONTAINER_LINE_PATTERN` allows `\s*`), so some older content may hit this. A more forgiving fix would have the client `.trim()` the cell name in `parse.ts:30-32`, with the backend matching, rather than rejecting content it used to accept.
4. **Low: the agent prompts don't mention the `~~~` rule.** `lib/galaxy/agents/prompts/page_assistant.md` documents only ```` ```galaxy ```` blocks and never says plain code must use `~~~`. LLM-written code samples (the test's `loom-job` example looks agent-derived) will be rejected on save. One line in the prompt would prevent that. `workflow_report.md` has the same gap.
5. **Nit (skip):** `_check_fence_types` rejects ```` ```py thon ````, while the JS regex (no `s` flag) treats that line as content. This is a harmless over-rejection of a pathological input.

Tests are reasonable: behavioral cases cover CRLF, BOM, U+2028, indentation, and nesting, plus an API test. `test_markdown_validation_fence_type_error_message` could use `pytest.raises`, but that's a style nit. Imports are at module top. Comments are purposeful.

## Follow-ups

- Move the markdown cell types into `client/src/components/Markdown/directives.yml` and have `scripts/markdown_directives_doc.py` generate them into `_markdown_directives.py` + `directives.ts`. Consume the generated list from `markdown_parse.py`, `SectionWrapper.vue`/`CellWrapper.vue` (`VALID_TYPES`), and drop the `.vue` regex drift test.
- Validate workflow report markdown when a workflow is saved (`workflows.py:989`, at least the fence check), so errors show up where the report is written and not on invocation → page.
- Add a `~~~` code-block rule to `page_assistant.md` and `workflow_report.md`.
- Optional: have the client trim cell names (`parse.ts`), with the backend matching, so ```` ``` galaxy ```` renders again and isn't rejected.
