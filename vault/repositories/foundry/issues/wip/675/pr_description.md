Title: docs(planemo-asserts-idioms): nested sub-collection arity via count/min/max

Refs #675.

`planemo-asserts-idioms` implied the shape check under nested `element_tests:` works the same as at the top level, through `element_count:`. It doesn't. A nested sub-collection takes `count:`, `min:` or `max:`. The vendored schema has accepted these since gxwf 1.14, and the galaxy-tool-util 26.1.1 verifier already enforces them.

- The note now names `count`/`min`/`max` for nested sub-collections. Its example is `count: 1` under an unpaired sample of a `list:paired_or_unpaired` output, which makes a spurious second member fail.
- It also says a nested sub-collection takes no `collection_type:`, because the output's `collection_type:` already fixes every rank.
- The 8 casts that bundle the note and `Dashboard.md` are regenerated. No package change, so no changeset.

Checked against the vendored `tests-format.schema.json`: nested `count: 1` validates and nested `collection_type` is rejected. These pass: validate, check-generated, check-casts, check-verify, check-assemble-pipelines, check-fixtures.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
