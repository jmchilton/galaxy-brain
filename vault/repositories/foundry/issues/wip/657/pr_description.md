Title: docs(planemo-asserts-idioms): say what has_line_matching and has_n_columns measure

Fixes #657.

`planemo-asserts-idioms` said when to use `has_line_matching` and `has_n_columns` but not what they measure. Both can fail a correct workflow in ways that look like a wrong output.

**`has_line_matching` is anchored.** Galaxy runs `re.findall(f"^{expression}$", output, flags=re.MULTILINE)`, while `has_text_matching` is an unanchored `re.search`. So a prefix pattern like `^I\t` matches only a line that is exactly `I` plus a tab, and counts 0 on a GFF. Section 4 now says this and gives `I\t.*` as the fix.

**`has_n_columns` reads only the first non-comment line.** R's `write.table(row.names = TRUE, col.names = TRUE)` writes a header one field narrower than the data rows, so a five-sample matrix reports 5. Section 4 now says this and shows how to check data-row width with a `has_line_matching` that fixes the field count. The section 1 table row points there.

I tested each worked example against the released galaxy-tool-util 26.1.1 assertion functions:

| Check | Result |
|---|---|
| `^I\t` | matches 0 lines |
| `I\t.*` | matches 2 |
| `has_n_columns` on a ragged matrix | 5 |
| `([^\t]*\t){5}[^\t]*` | matches both six-field data rows |

The note goes to revision 10. The 8 casts that bundle it and `Dashboard.md` are regenerated. No package change, so no changeset. These pass: validate, check-generated, check-casts, check-verify, check-assemble-pipelines, check-fixtures.

The identical schema descriptions for the two `*_matching` families come from Galaxy's docstrings and aren't changed here.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
