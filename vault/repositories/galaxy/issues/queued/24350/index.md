# galaxy#24350 — `has_line_matching` anchors its regex to the whole line, but its docs don't say so

[Issue](https://github.com/galaxyproject/galaxy/issues/24350) · assigned jmchilton · from galaxyproject/foundry#657

- [issue_draft.md](issue_draft.md) — source note
- [proposal.md](proposal.md) — posted text
- [debrief.md](debrief.md) — research, review round, leftovers

Posted 2026-10-22. Queued: docs-only fix (split `Expression` annotation in `asserts/text.py`, extend `has_line_matching` docstring, regenerate via codegen + client schema builds).

Open: docs only, or also group the wrap as `^(?:e)$` (ungrouped alternation escapes the anchors)? "nf-core/rnaseq" in posted Context came only from the source note (foundry#657 names tximport/stringtie/multiqc). Optional `has_n_columns` header-width note left out.

Next: red unit test (`^foo` fails / `foo.*` passes on `foo bar`; alternation case if grouping), then branch.
