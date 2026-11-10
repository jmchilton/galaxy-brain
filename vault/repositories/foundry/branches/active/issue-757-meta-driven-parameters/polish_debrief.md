Run via Claude Opus 5.5 at high effort.

# Polish debrief

Wrote [pr_description.md](pr_description.md), [pr_titles.md](pr_titles.md) and [pr_tags.md](pr_tags.md). One strengthening round.

## Strengthening tasks applied

- **Salmon misclassification:** the description and the note both grouped Salmon's `--libType` with route targets. It is a conditional's test parameter (Open), so it takes the fallback. Fixed in both.
- **New fixture (`per-element-select-boolean`):** mapped `param_value_from_file` sets `Cut1`'s `select` `delimiter` (`C` vs `D`) and `wc_gnu`'s boolean `include_header` per element. It passed on Galaxy `release_26.1`. The `select` and boolean rows moved to Verified, and featureCounts' `strand_specificity` now takes a verified route. This also drops the `select` Risk Detail.
- **Opener:** no longer says "computed". The fixture passes the values in.
- **"nf-core does this all the time":** softened to "nf-core does this".
- **#674 misreading:** added a highlighted sentence saying the uniform value stays as the last fallback, and why.
- **Checks summary:** cut to one sentence.

## Not done (scope questions for John)

- Test a mapped connection to a conditional's test parameter (e.g. `random_lines1` `seed_source|seed_source_selector`). That would settle the Open row, but #757 leaves the question to #661 and #667.
- A third case covering the `collection_element_identifiers` → `__SORTLIST__` reorder written out in the note.
- Compute the fixture's values from the data (Codex's option b).
- File upstream issues for the #661 500 and #667's `--connections` skip.
- The note's untouched "Low-Confidence TODOs" and "Mold Use" sections, and the fixtures' `tool_state:` style versus `state:`.
- A float fixture: no stock tool has a clean float parameter.
