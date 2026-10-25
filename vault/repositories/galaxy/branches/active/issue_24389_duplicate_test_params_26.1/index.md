# issue_24389_duplicate_test_params_26.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:issue_24389_duplicate_test_params_26.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24389_duplicate_test_params_26.1)

## Status

Ready for final review: polished 2026-10-25 at `60607462357`; waiting for John's read-through.

No PR.

Fork CI on `60607462357` queued (Python linting green, no reds).

Base: `release_26.1` (`df713519127`). Head: `60607462357`. Alt: `issue_24389_duplicate_test_params_26.1_alt_original_scope`. Fork: `jmchilton/issue_24389_duplicate_test_params_26.1`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24389_duplicate_test_params_26.1`. Issue: [#24389](https://github.com/galaxyproject/galaxy/issues/24389) (assigned to John; root-cause comment posted).

## Decisions

- Base `release_26.1`: John's instruction (reporter on 26.1).
- Conflicting duplicate qualified test params raise the existing "Ambiguous" error; identical ones stay tolerated (matches 5a443294512 for unqualified).
- No XSD constraint: `xs:unique` per test container broke a working legacy (≤24.1) elided-outer-repeat idiom and XSD can't be profile-gated (normal review).
- PR body must name IUC sourmash sketch (25.0) and isoformswitchanalyzer (25.1): their tests error at load after this.

## Dependencies

- Merge-forward to dev conflicts in `case.py` (take dev's `test_case_validation`, keep the rest), `parser/util.py` and `test_tool_linters.py` (both: keep both sides).

[Implementation debrief](implementation_debrief.md) · [Polish debrief](polish_debrief.md) · [PR description](pr_description.md) · [PR titles](pr_titles.md) · [PR tags](pr_tags.md)
