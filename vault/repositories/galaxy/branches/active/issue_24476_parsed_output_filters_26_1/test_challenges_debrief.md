# Test challenge — READY

Retained the tests unchanged. They cover the externally consumed parsed-tool metadata contract using real XML/YAML sources, with independently verified baseline and regression behavior. No implementation changes or additional tests were justified.

## Coverage and decisions

- The baseline XML parser test pins preservation and ordering of data and collection filter expressions before model conversion. It protects the existing parser contract independently of the new serialization behavior.
- The two baseline authoring-model cases reject `filters` specifically as an extra field for dataset and collection user outputs. The error-location check prevents a rejection for an unrelated validation problem from making these pass.
- The parsed-tool regression checks the JSON-compatible output consumed by clients, including both data and collection conversion and multiple expressions in declared order. It uses the existing `output_filter.xml` functional fixture rather than mocked output objects.
- The four scalar cases cover every scalar discriminator through the same public parsing entry point, including whitespace stripping and expression order. They ensure the sibling conversion path does not silently remain inconsistent.
- The three unconditional cases establish the empty-list contract for XML datasets, XML collections, and YAML collections.
- No mocks, fabricated browser layout, network access, or duplicate API assertions are involved. No helper/refactor was needed.

The test placement follows `doc/source/dev/writing_tests.md`: these components are designed to parse and serialize without a Galaxy server. Moving them to Galaxy API tests would add server/database fixtures while losing direct coverage of standalone `galaxy-tool-util` consumers. Tool Shed endpoint transport itself is unchanged. The feature has no new UI behavior, so E2E/Selenium coverage is not applicable.

## Independent verification

Used temporary base-source files from `origin/release_26.1` and an import finder outside the repository to substitute only the two modified implementation modules, leaving the worktree unchanged.

- All three newly added baseline cases passed against base source (3 passed, 16 deselected).
- All eight new regression cases failed against base source at their own `filters` assertions with `KeyError: 'filters'` (8 failed, 9 deselected); fixtures and entry points existed and parsed successfully.
- Both affected test files passed against the implementation (19 passed).
- The worktree remained clean. The coordinator also reports 147 focused tests passing and a generated schema diff confined to the six parsed-output variants.

No test changes were made, and no commits were created by this review.
