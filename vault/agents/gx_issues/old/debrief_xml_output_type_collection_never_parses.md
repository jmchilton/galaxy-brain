# Debrief: xml_output_type_collection_never_parses

Source: `xml_output_type_collection_never_parses.md`, an agent-to-agent draft found while polishing #23890 on `release_26.1`. Proposal: `proposed_xml_output_type_collection_never_parses.md`.

## Research

- **Reproduced at parser level on `origin/dev`.** No app is needed. All four `<output type="collection">` forms fail: three with lxml `TypeError` (an attribute set to `None`), and both attributes together with "Cannot set both".
- **Never worked.** `git log -L` traces the branch to f5c93e868b7 (2018-04-19), not 2019 as the draft said. lxml has always refused `None`.
- **Usage:** 0 hits in Galaxy's own tools, tools-iuc, galaxytools and tools-devteam (local clones, re-grepped). No duplicate issue.
- **XSD:** the `Output` type declares the collection attributes and says `type="collection"` follows the `<collection>` tag's semantics.
- #23890 is the open PR for #23886. Context cites it.

## Rewrite

- The draft became a short bug issue: a table, repro and code in details, a small fix, and one alternative (remove the form instead of fixing it).

## Review (one round, subagent)

- **The proposed fix was wrong.** Copying only the attributes that are present leaves `type="collection"` on the element. Row 2 then fails with "Cannot set both", and `structured_like` alone parses as `collection_type="collection"`.
  - The reviewer replaced it with `_parse_collection(out_child, "collection_type", "collection_type_source")`, with defaults for `<collection>`.
  - Tried in the scratch checkout: rows 1–3 match `<collection>`, row 4 still raises, `discover_datasets` works, and `test_parsing.py` passes (93 tests). Reverted afterwards.
- **Table:** row 4 is a correct rejection, so it is now "✅ rejected", following `SHOW_ME_RULES.md`. The table now has `<output>` and `<collection>` columns.
- Smaller fixes:
  - "never worked" instead of "has been this way since"
  - traceback line 562 on dev
  - `structured_like` added to the XSD attribute list
  - the expression/scalar-output claim checked against `expression_*` tools

## Open

- Untested end to end on a server; the proposed framework test tool would cover that.
- Land the fix in #23890 (`release_26.1`, which makes its new `Output` XSD docs true) or on `dev`.
