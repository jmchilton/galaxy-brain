No refactoring of the base branch was performed.

Branch history unchanged: `070071429f7` (Baseline tests) then `9159432b81e` (fix). Head stays `9159432b81e`; no push.

Candidates considered:
- **`identifier_key` local in `JobSearch._build_stmt_for_hda`.** The only refactor-shaped hunk in the fix. On `release_25.1` `f"{k}|__identifier__"` has a single use, so extracting it there would be an unmotivated change. It exists only for the fix's second use (NOT EXISTS guard), so it stays in the fix commit.
- **Shared `|__identifier__` helper/constant across ~6 sites in `managers/jobs.py` (plus actions/wrappers).** A real base-applicable refactor, but the thermo-nuclear review deferred it (and other JobSearch restructures) to dev to keep this 25.1 fix minimal. Not pulled in.
- **`tools/wrappers.py` `element_identifier`.** Pure behavior change (sets `consumes_names`); nothing to extract.
- **Test helpers** (`_list_of_existing_dataset`, `_mapped_inputs`, `_copied_from_and_identifier`, etc.). Already introduced by the baseline tests commit ahead of the fix.
