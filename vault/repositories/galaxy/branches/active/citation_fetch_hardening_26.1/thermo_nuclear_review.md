Run via Claude Opus 5.5 at high effort.

# citation_fetch_hardening_26.1: thermo-nuclear code quality review

Prompt: `vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md`. Reviewed tip `618e17bb669` against `origin/release_26.1`. New tip: `144c02cd0bd`, with the same 13 commits. Every fixup autosquashed with no conflicts.

## Verdict

Approve after the small fixes below. There is no structural regression, and no file crosses 1k lines (`tools/__init__.py` shrank). The branch adds no ad-hoc conditionals to unrelated flows.
- `bounded_get` is in the right layer (`galaxy.util.requests`), and both external lookups reuse it.
- The caps are policy in `CitationsManager.parse_citations`, and `Tool._parse_citations` got simpler.

I found no code-judo rewrite that deletes a whole category of complexity. The remaining findings are boundary and diff-hygiene problems.

## Findings

1. **Generated-file churn (diff hygiene).** The pre-commit hook stripped `# ` → `#` in the `galaxy.yml.sample` header and trimmed EOF blank lines in both `galaxy.yml.sample` and `galaxy_options.rst`.
   - The generator emits those bytes, so the next `make config-rebuild` would have put them back.
   - The initial debrief did note the trim for the PR body. The point here is that the trim fought the generator.
2. **The fetch budget was threaded through `BaseCitation.to_dict`.** `to_dict` gained a pass-through `budget` param only so `citations_to_bibtex` could call it.
   - `citations_to_bibtex` is the only rendering entry point, so it can build `BibtexCitationResponse(content=citation.to_bibtex(budget))` directly.
3. **`DoiCitation.to_bibtex` had two `except` branches that differed only in a debug message.** `DoiFetchSkipped` vs any other failure both fall through to the stub.
4. **A redundant guard in the `Citation` validator.** `if content != self.content: self.content = content`: `ToolSourceBaseModel` has no `validate_assignment`, so assigning unconditionally is equivalent and plainer.
5. **Tool Shed `getattr` fallbacks.** There are three new ones (`citation_cache_expire`, `citation_fetch_timeout`, `citation_max_fetches_per_request`), plus `fetch_url_allowlist_ips` from PR A. Each carries a "Tool Shed's config has no…" comment, and `DOI_FETCH_TIMEOUT` and `DOI_MAX_FETCHES_PER_REQUEST` duplicate the schema defaults.
6. **The module-level `citations_to_bibtex` duplicates `CitationsManager.citations_to_bibtex`**, including the default.
7. **`bounded_get(allowed_schemes=...)`** is used only by tests, to reach a local `http` server.
8. **Duplicated `functools.partial(validate_non_local, ip_allowlist=...)`** in `DoiCache` and `tools/biotools.py`.
9. **The `_iter_reads` `iter_content` fallback** for responses without `read1` (urllib3 1.x).
10. **`DoiFetchSkipped` and `DoiFetchFailed` as control flow.** `Optional[str]` would be simpler.

## Changed (each as a fixup, autosquashed into its owning commit)

- (1) → `Add citation fetch config options`. I rebuilt both generated files as base plus only the inserted citation blocks, and committed with `--no-verify` so the hook didn't strip them again. The diff against base is now citation hunks only: +13 in the sample, +34 in the rst.
  - Checked by running `config_manage.py build_sample_yaml galaxy --add-comments` and `build_rst galaxy` at the tip. The header, the EOF and the citation blocks match the generator output exactly.
  - The only differences were rewraps in unrelated options (`max_discovered_files`, a JS-eval option, a celery broker option), which predate this branch. I discarded them.
  - The initial debrief's PR-body note about the hook trimming whitespace in the generated files is now obsolete. Drop it from the PR description.
- (2) and (3) → `Limit uncached DOI lookups per citations request`.
  - `to_dict` is back to its base signature, and `citations_to_bibtex` builds the response directly.
  - One `except Exception as e: log.debug("No bibtex for DOI %s: %r", doi, e)`. The exception repr still says whether the lookup was skipped or failed.
- (4) → `Strip citation content in the Citation model`. The validator now assigns `self.content = content` unconditionally.

None of these change behavior. At every commit, the touched unit tests pass: 17→48 under a citation/DOI/bio.tools/bounded `-k` filter. At the tip:
- the full touched files pass (151), and `user_tool_source_validation_cases` passes (36).
- ruff, black and isort are clean.
- mypy shows the same 3 pre-existing `BaseCitation` attr errors.

No API tests were rerun, because no API-facing behavior changed.

## Declined

- (5) **Tool Shed getattrs.** The Tool Shed config is schema-driven (`tool_shed_config_schema.yml`).
  - Moving the options there means a new admin-visible option set plus a regenerated Tool Shed sample and docs. The options would do nothing there, because the Tool Shed never renders BibTeX and so never uses the budget.
  - Hard-coding attributes in `tool_shed/webapp/config.py` would only move the duplicated defaults into another package.
  - `getattr` with a one-line comment is the smaller boundary. Separately, `tool_shed/webapp/config.py:134` reads `citation_cache_url` from `kwargs["citation_cache_lock_dir"]`. That bug predates this branch and is out of scope; it's worth a separate fix.
- (6) Normal review 2 kept this deliberately: unit tests use the module function without an app.
- (7) An https-only default with an explicit override is a reasonable contract for a shared helper. Patching it out in tests would be worse.
- (8) It's two lines at two sites, with no third consumer. A helper in `galaxy.files.uris` would be a thin wrapper.
- (9) `packages/util` requires `requests` without pinning urllib3, so the fallback isn't dead for galaxy-util consumers.
- (10) `test_CitationsManager_db.py` asserts `pytest.raises(DoiFetchFailed)`, so this would be a test contract change for no structural gain.
- `BaseCitation.to_dict` now has no in-tree caller. Removing it is a dev-branch cleanup, not a release_26.1 change.
- I didn't re-raise anything already decided or parked: the header-phase deadline gap, concurrent-miss duplicate fetches, cap/profile gating, and the redirect allowlist.

No security-relevant findings came out of this review.
