Title: docs(iwc-test-data-conventions): drop invalid type: from nested input example

Fixes #671.

In the note's nested `list:paired` input example, each inner element had `type: paired`. tests-format's `Collection` doesn't allow a `type` key, so a test copied from the example fails validation.

The mistake was in our copy, not in IWC. The IWC short-read QC test the note links uses `collection_type: paired` on the inner element, and no IWC test uses `type:`.

- **Example:** the inner element now carries only `class`, `identifier` and `elements`.
- **Prose:** only the outer collection declares `collection_type:`. Galaxy's `to_elements()` gets each inner type by splitting the outer one on the first `:`, so an inner `collection_type:` is redundant and ignored, and `type:` is rejected.
- **Nested outputs:** the note now uses `element_tests:` at each level instead of `elements:`, matching #698.
- **Regenerated:** the 12 casts that bundle the note and `Dashboard.md`. The note goes to revision 5. No package change, so no changeset.

Checked against the vendored `tests-format.schema.json`: the corrected example is valid, an inner `collection_type` is valid, and `type:` is rejected. These pass: validate, check-generated, check-casts, check-verify, check-assemble-pipelines, check-fixtures.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
