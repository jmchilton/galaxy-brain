# issue_24389_duplicate_test_params_26.1

- [PR #24450](https://github.com/galaxyproject/galaxy/pull/24450)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24389_duplicate_test_params_26.1)

## Status

Polished; opened on John's request 2026-10-25 at `60607462357`.

Draft [#24450](https://github.com/galaxyproject/galaxy/pull/24450) waiting on CI; review requested from bernt-matthias (issue author).

Fork CI on `60607462357`: all green except API tests, an unrelated runner stall (from ~72% every workflow/WES test timed out waiting on jobs, 17 failed / 1605 passed); failed job rerun.

Base: `release_26.1` (`df713519127`). Head: `60607462357`. Alt: `issue_24389_duplicate_test_params_26.1_alt_original_scope`. Fork: `jmchilton/issue_24389_duplicate_test_params_26.1`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24389_duplicate_test_params_26.1`. Issue: [#24389](https://github.com/galaxyproject/galaxy/issues/24389) (assigned to John; root-cause comment posted).

## Decisions

- Base `release_26.1`: John's instruction (reporter on 26.1).
- Title chosen by John: "[26.1] Fix duplicate test params in repeats/conditionals going unreported". Opened as draft (CI not yet green), labels `kind/bug`, `area/tool-framework`.
- Conflicting duplicate qualified test params raise the existing "Ambiguous" error; identical ones stay tolerated (matches 5a443294512 for unqualified).
- No XSD constraint: `xs:unique` per test container broke a working legacy (≤24.1) elided-outer-repeat idiom and XSD can't be profile-gated (normal review).
- PR body must name IUC sourmash sketch (25.0) and isoformswitchanalyzer (25.1): their tests error at load after this.

## Dependencies

- Merge-forward to dev conflicts in `case.py` (take dev's `test_case_validation`, keep the rest), `parser/util.py` and `test_tool_linters.py` (both: keep both sides).

[Implementation debrief](implementation_debrief.md) · [Polish debrief](polish_debrief.md) · [PR description](pr_description.md) · [PR titles](pr_titles.md) · [PR tags](pr_tags.md)
