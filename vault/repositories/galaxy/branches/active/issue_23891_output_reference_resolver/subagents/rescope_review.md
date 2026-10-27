# Normal review: metadata_source lint rescope (2026-10-27)

The review found no bugs. I acted on its wording fix and on both test gaps by amending the rescope commit; the result is `886d8ffd327`.

## Not acted on
- **Whether `_error_unmatched` suggests selectors for metadata_source.** It only appends the selector the author wrote, so there's nothing wrong to fix.
- **An XSD sentence saying metadata_source takes no element selector.** It's optional, and the existing docs already say "must name a data (or hidden_data) input".

<details><summary>Review</summary>

- **Runtime parity.** Discovered collections look up `metadata_source` by qualified name only, the same way `format_source` works. Plain `<data>` outputs accept legacy aliases (`tools/actions/__init__.py:673`). The linter's discovered-collection error and the warning for unqualified references are therefore both correct for metadata_source.
- **Wording.** For metadata_source, the linter's own check for a selector on a non-collection input implied that a collection would be accepted. **Fixed:** that check is now guarded to format_source only. The shared `output_reference_problem` message covers metadata_source.
- **Test gaps.** **Fixed:** added two cases.
  - A discovered collection with an unqualified metadata_source.
  - A selector on a data input.
- **Reuse and structure.** Both linters now share `_lint_output_references` and `_check_output_reference`. The rules come from the shared `OUTPUT_REFERENCE_PARAM_TYPES` and `output_reference_problem`, so tool loading and linting can't drift apart. Imports are at the top of the module.
- **Full diff.** Looks right.
</details>
