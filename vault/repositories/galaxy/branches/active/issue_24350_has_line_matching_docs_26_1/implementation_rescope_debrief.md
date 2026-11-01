# Re-scope debrief: issue_24350_has_line_matching_docs_26_1

The first hardening pass's scope evaluation (`earlier_drafts/1/scope_evaluation.md`) recommended a modest expansion of the docs-only branch, staying on `release_26.1`. I kept the original as `issue_24350_has_line_matching_docs_26_1_alt_original_scope` (`alts/original_scope.md`, head `39efe232c41`) and expanded the working branch.

## What changed

- **`16cfad00004` Keep alternation inside has_line_matching's line anchors.** `assert_has_line_matching` now wraps the expression as `^(?:{e})$` instead of `^{e}$`. Before, `foo|xbar` counted the line `foo 1`. The docs no longer tell authors to group alternatives by hand; they say each alternative must match a whole line. The baseline cases flip: `I\t|II\t` goes from 2 to 0 and `I\t|\t5` goes from 3 to 0. A new case, `I\t.*|II\t.*`, counts 3. Artifacts are regenerated.
- **`961b6d0450e` Clarify element/attribute expression and has_n_columns header docs.** The `element_text_matches`/`attribute_matches` expression descriptions now say the regex search is unanchored, because they delegate to `has_text_matching`. The `has_n_columns` docstring notes that a narrower header line is what gets counted, using R `write.table` with row names as the example. Artifacts are regenerated.

## Not taken

- (b) Searching within each line without anchoring: this would silently loosen every existing test.
- (e) Retargeting to `release_25.1`: that branch has no client artifacts, and a behavior change there has the widest exposure.
- `element_text_is`/`attribute_is` lack a leading `^`, so `text="blastp"` passes on `xblastp`. This is a separate bug in other code. It is a candidate follow-up issue, which the coordinator or John should queue; it was not filed here.

## Risk

From the corpus check in `earlier_drafts/1/scope_evaluation.md`: about 1,050 `has_line_matching` uses, of which 3 have a top-level `|`. All 3 are accidental unescaped `gi|...` IDs that pass today only because of the leak. After this change, 2 live bgruening/galaxytools tests (`tRNAscan.xml`, `aragorn.xml`) and 1 deprecated IUC tool would fail. No Galaxy-internal test uses `|` in `has_line_matching`. A courtesy galaxytools PR that escapes the `|` would avoid the breakage.

## Review

A normal review followed the re-scope; see `subagents/rescope_review.md`.
