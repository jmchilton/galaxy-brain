Run via Claude Opus 5.5 at high effort.

Two no-behavior-change refactors were pulled out of the PR B behavior commits and placed at the start of PR B: `CitationsManager.parse_citations` and `CitationsManager.citations_to_bibtex`.

Tip `144c02cd0bd` → `dea9d0cf3fb`, now 15 commits. `git diff 144c02cd0bd dea9d0cf3fb` is empty. The local backup branch `citation_fetch_hardening_26.1_pre_baseline_refactor` points at the old tip. Nothing was pushed.

## New commits

Both sit after `Use a separate beaker namespace for bio.tools lookups` (the end of PR A) and before `Don't fetch DOI BibTeX to dedupe against BibTeX citations`. They don't depend on PR A's changes, so they could also lead PR B on its own.

1. **`35e0559eb05` Move tool citation parsing into CitationsManager.parse_citations**
   - The loop in `Tool._parse_citations` moves into the new `CitationsManager.parse_citations(citation_models)`.
   - It keeps base call order: `tool_source.parse_citations()` still runs before the `citations_manager` check.
2. **`67ba4fe4be6` Render citation BibTeX through CitationsManager.citations_to_bibtex**
   - New module function `citations_to_bibtex(citations)` and manager method, with `Iterable[CitationT]` typing.
   - The tool API and history service call it in place of `citation.to_dict("bibtex")`.

## How the behavior commits changed

- `Limit uncached DOI lookups per citations request` now adds only the budget. It no longer touches `api/tools.py` or `services/histories.py`.
- `Cap citations per tool` now adds only the caps and `tool_id` to `parse_citations`.
- The `Iterable[CitationT]` annotations now arrive with the R2 commit instead of `Add citation fetch config options`.
- From `Cap citations per tool` through `Strip citation content in the Citation model`, each new commit differs from its old counterpart only by those annotations, and from the config commit onward each new commit's tree is identical to its old counterpart.
- `Add citation fetch config options` was re-created with `--no-verify` from the old commit's tree. `git diff 5731a9423c7 040ca9086ce -- lib/galaxy/config/sample/galaxy.yml.sample doc/source/admin/galaxy_options.rst` is empty.

## Behavior change in `Cap citations per tool` for reviewers

The branch's `Tool._parse_citations` returns `[]` before calling `tool_source.parse_citations()` when the app has no `citations_manager`. Base calls it first.

So in apps without a citations manager, a tool whose citations fail model validation no longer fails to load. The refactor commit keeps base order, which puts this change in the cap commit. The final tree is unchanged. Confirm it's intended, or restore the base order there.

## Candidates considered and left alone

- **`bounded_get`**: already its own commit, and nothing uses it until the DOI commit.
- **bio.tools validator injection (`Bound bio.tools API lookups`)**: it exists only to pass a validator to `bounded_get`, so it has no use on the base.
- **`Tidy DoiCache URL validation`**: it tidies code this branch added in `Bound DOI BibTeX fetches`, so it can't be applied to the base. It would fit better as a fixup of that PR A commit; the PR split still lists it in B.
- **`DoiCache._cache_options` (in the config commit)**: the only gain is in the DB test override that the same commit changes. Splitting it out would just add churn.

## Commit map (old → new)

| Old | New | Subject |
|---|---|---|
| fca40862660 | fca40862660 | Baseline tests for DOI and bio.tools metadata fetching |
| e39f0a9d505 | e39f0a9d505 | Add galaxy.util.requests.bounded_get |
| 96fc28183ad | 96fc28183ad | Bound DOI BibTeX fetches |
| 4a554b4aa90 | 4a554b4aa90 | Bound bio.tools API lookups |
| 39322243b13 | 39322243b13 | Use a separate beaker namespace for bio.tools lookups |
| — | 35e0559eb05 | Move tool citation parsing into CitationsManager.parse_citations |
| — | 67ba4fe4be6 | Render citation BibTeX through CitationsManager.citations_to_bibtex |
| 957b42dbfcf | 6ca8ce8a682 | Don't fetch DOI BibTeX to dedupe against BibTeX citations |
| e2e4c49cf00 | cd7113cae2a | Briefly cache failed DOI lookups |
| d7c7c543256 | 974c609a827 | Limit uncached DOI lookups per citations request |
| af0e61af51a | 5f89d1731f8 | Cap citations per tool |
| 2511dc5d108 | f1c5d1b51ec | Tidy DoiCache URL validation |
| 25e6f584939 | e332e97ad1d | Strip citation content in the Citation model |
| 5731a9423c7 | 040ca9086ce | Add citation fetch config options |
| 144c02cd0bd | dea9d0cf3fb | Stop starting DOI lookups after a per-request deadline |

PR split: A = the first 5 commits. B = the 2 refactors plus `6ca8ce8a682` through `e332e97ad1d`, plus the deadline commit `dea9d0cf3fb`. The deadline commit wasn't in the initial debrief's list and belongs in B, but it sits after C. C = `040ca9086ce`.

## Validation

- **Unit tests at each rewritten commit**: test_citations, test_CitationsManager(_db), test_biotools, test_metadata_source, test_requests and test_parsing. 141 tests pass at both refactor commits, rising to 151 at the tip.
- **mypy** on the 4 touched files: at every commit, only the 3 known `BaseCitation.to_bibtex` errors.
- **ruff, black, isort**: clean on the refactor commits and the conflict resolutions.
- **API tests at `67ba4fe4be6`, run one at a time**: `test_tools.py -k test_tool_citations` and `test_histories.py -k test_history_citations` both pass.

No security-relevant findings.

## Coordinator follow-up

- Restored base call order in `Tool._parse_citations` (fixup into "Cap citations per tool"): `tool_source.parse_citations()` runs before the citations-manager check, so invalid citations still fail loading in apps without a manager.
- Moved "Stop starting DOI lookups after a per-request deadline" before "Add citation fetch config options" so PR B is contiguous; resolved test-file conflicts; final tree equals the pre-reorder tree. Tip `8fb806e8e37`.
