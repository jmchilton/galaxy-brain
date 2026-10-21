`pr_24320_review_0` builds on the reviewed head `a0dec1a30b4` and makes two small changes. `parse_tool_version()` now accepts `_` and `-` as well as `.` between `+galaxy` and its number, so those spellings keep sorting numerically instead of falling back to `LegacyVersion`. The test file also explains why its intentionally invalid version is listed first.

- `75e4e16bfe6` Accept _ and - separators in +galaxyN tool versions: changes `lstrip('.')` to `lstrip('._-')` and parametrizes the separator-equality test with `_` and `-` cases. These cases failed before the change.
- `c37807107c9` Explain LegacyVersion entry at head of TOOL_VERSIONS: adds a one-line comment explaining that `1.8.1+2+galaxy0` sorts first because it falls back to `LegacyVersion`.
