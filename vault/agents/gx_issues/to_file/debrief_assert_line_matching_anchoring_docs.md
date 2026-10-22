# Debrief: has_line_matching anchoring docs

Source: `assert_line_matching_anchoring_docs.md` (from foundry#657). Proposal: `proposed_assert_line_matching_anchoring_docs.md`.

## Research

- `text.py` on origin/dev: `has_line_matching` wraps the expression as `^{e}$` (MULTILINE); `has_text_matching` uses a plain `re.search`/`findall`. Both share the `Expression` annotation ("The regular expressions to attempt match in the output.").
- Repro (scratchpad `repro_line.py`, assertion functions called directly). On a 3-line GFF: line `^I\t` → 0 matches; line `I\t.*` → passes; text `^I\t` → 1 (no MULTILINE); text `I\t.*` → 3 (`II\t` contains `I\t`).
- The text is copied by codegen into galaxy.xsd and `tool_util_models/assertions.py`, and from there into the client `schema.ts`, `ToolSourceSchema.json` and the workflow tests-format models.
- Duplicates: none. #13145 (galaxy.xsd attribute docs in general) is related and now linked.

## Review round (one subagent)

- Premise confirmed. The alternative I drafted ("strip user anchors") was wrong: stripping `^` from `^I\t` still yields an exact-line match. The missing `.*` is the real problem. It was replaced with "search within each line" and "wrap as `^(?:e)$`".
- New finding, which I spot-checked: the wrap isn't grouped, so `foo|xbar` becomes `^foo|xbar$` and matches the line `foo 1`. Added to the body. The suggested doc text now tells authors to group alternatives.
- Context corrected: per foundry#657 the prefix-form assertions were caught by reading the code, not by a failed run. #657 is still open, so Foundry "tracks" the fix rather than "has fixed" it. Regeneration commands made exact (`PYTHONPATH=lib`, needs `xmllint`). Corrected what `ToolSourceSchema.json` drives (the tool editor's schema help, not the authoring docs).

## Leftover

- "nf-core/rnaseq" in Context comes only from the source note. foundry#657 names tximport, stringtie and multiqc. Confirm it, or say "a workflow conversion".
- The source note's optional `has_n_columns` header-width note was left out. It's a separate, smaller docs tweak.
- The ungrouped alternation is arguably a behavior bug (`^(?:e)$` would fix it). The issue offers it as an alternative. Whoever takes the issue decides whether docs alone are enough.

## Recommendation

Post. It's small, but it misleads every tool and workflow-test author through every generated schema, and the alternation edge gives it substance. It's a good first issue for Q&A pickup. Keeping it internal and going PR-first is also reasonable: the PR is about 10 lines plus regeneration.
