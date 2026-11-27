# Alt: original scope

`stock_tools_review_clean_alt_original_scope` at `9cf1f2cadb1` is the branch as it was hardened before the first scope evaluation expanded it: 23 commits on `origin/release_26.1`.

The parent branch adds one fix to a template this branch already rewrites: ML Jupyter's `.ipynb` suffix check.

The scope evaluation also asked for a HiGlass duplicate-name guard. It was added and then reverted, because its premise was wrong: HiGlass ingests each file into storage that never overwrites. See `implementation_rescope_debrief.md`.
