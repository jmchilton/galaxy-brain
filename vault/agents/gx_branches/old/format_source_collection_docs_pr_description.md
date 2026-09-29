Test and document `format_source` for discovered collections

#23388 made collection-level `format_source` work for dynamically discovered elements, with unit and runtime coverage. This adds the remaining pieces from #11754, which targeted the same issue:

- A framework tool test, `collection_format_source_discover`, adapted from #11754. It covers `format_source` naming a data input, a `multiple="true"` input, and a collection input inside a conditional, plus precedence: a `format` on `<discover_datasets>` and an extension captured from the filename both override `format_source`.
- The `format_source` docs in the XSD now describe the collection behaviour and its precedence.

With the `format_source` block in `collect_dynamic_collections` disabled, the tool test fails (elements come back as `data`, not `txt`).

Fixes #2431. Supersedes #11754 — thanks to Matthias Bernt for the original tests.

## How to test the changes?
- [x] I've included appropriate automated tests.

## License
- [x] I agree to license these contributions under Galaxy's current license.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
