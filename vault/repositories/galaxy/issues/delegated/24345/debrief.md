# Debrief: ColumnDataProvider median float index

Source: `column_data_provider_median_float_index.md`, spotted while preparing #24344. Proposal: `proposed_column_data_provider_median_float_index.md`.

## Research

- `ColumnDataProvider.get_data` (`lib/galaxy/visualization/data_providers/basic.py`): `middle_index = (count / 2) - 1` is a float in Python 3. It is identical on origin/dev and origin/release_26.2 and dates from 2012 (`d9747a836fd`).
- Unit repro (provider called directly, metadata from `Tabular.set_meta`): 1-, 2- and 3-row numeric columns all raise `list indices must be integers…`. A column holding `NA` or a non-`#` header row raises the `None` sort error.
- Routing: `raw_data` with no `provider` on `Tabular` → `ColumnDataProvider`. BED, GFF and VCF go to their own raw providers. API tests cover only the 400 paths.
- Callers: none in the client. `galaxy-visualizations` and `galaxy-charts` use `provider=dataset-column`. Galaxy has no stats helper, so stdlib `statistics.median` is the choice.
- Duplicates: none.

## Review round (one subagent)

- No pushback. It switched the repro to real `set_meta` metadata, so `NA` types the column `float` and the error text changed. It added the header-row case (likely the most common real trigger) and a "not run through the API" line, narrowed the odd-count claim to counts of 3 or more, and fixed a self-contradiction about `meta["count"]` (it now stays as rows read). Test cases are now concrete and their expected values were checked.
- I reworded one alternative ("API change rather than a bug fix").

## Leftover

- No live HTTP request was made, so the claim that the API returns a 500 is inferred.
- A literal `nan`/`inf` value would produce non-JSON-safe stats. Left out of the issue.
- The provider has no known caller. Deprecating it is the listed alternative and a possible follow-up.

## Outcome

Posted at John's request during 26.2 release-testing Q&A, labeled `release-testing-26.2`, and delegated (unassigned).
