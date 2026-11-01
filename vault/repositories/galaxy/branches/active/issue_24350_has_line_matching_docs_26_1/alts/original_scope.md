# Alt: original_scope

Branch `issue_24350_has_line_matching_docs_26_1_alt_original_scope` (pushed to jmchilton, head `39efe232c41`).

The original, docs-only take on #24350, as the issue proposed. `has_line_matching` gets its own `LineExpression` description and a docstring explaining the `^expression$` wrap, `.*` for prefixes, the need to group alternatives by hand, and multiline span caveats. `has_text_matching` documents its unanchored search and `(?m)`. All 4 generated artifacts are regenerated. Baseline tests pin the ungrouped-alternation leak (`I\t|II\t` counts 2).

How it differs from the parent: no behavior change. The parent also wraps the expression as `^(?:expression)$`, which breaks 2 known galaxytools tests that pass by accident; see `earlier_drafts/1/scope_evaluation.md`. It also adds the `has_n_columns` header note and the `element_text_matches`/`attribute_matches` description fixes. Choose this alt if John wants no behavior change on a release branch.
