# Initial review — galaxy#24320 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: claude-opus-5-5, medium effort
- Reviewed commit: `a0dec1a30b446bb89dff99077e93feb7edc10df1` (base `release_26.1`)

## Summary

Small, well-aimed fix. Moving the `+galaxyN` → `+galaxy.N` rewrite out of `Tool.version_object` into `galaxy.tool_util.version.parse_tool_version()` is the right abstraction: it gives one shared helper in place of logic tied to `Tool`. The PR uses it at every server-side site I found that orders tool versions:

- `ToolLineage` sort key.
- `Tool.version_object`, which also covers `toolbox/base.py:822` (the fallback sort without a lineage) and `base.py:1571`.
- The `Interval2Maf1` legacy bound.
- The Tool Shed TRS version list for stock tools.

The new lineage test fails without the fix, which is the right red-to-green shape. One minor finding below.

## Findings

### P3 1: `+galaxy_N` / `+galaxy-N` now parse as `LegacyVersion` and sort below the base version

`parse_tool_version` strips only `.` from the suffix before adding its own `.`. With a `_` or `-` separator, the rewrite produces two separators in a row, `+galaxy._10` or `+galaxy.-10`. That string is not valid PEP 440, so the version falls back to `LegacyVersion`, which sorts below every real `Version`. These spellings were valid, and already numeric, under plain `parse_version`, which normalizes them to `+galaxy.10`. This PR adds the helper to lineage ordering, so such a tool's newest version would now sort as the oldest. That affects `upgrade_all_steps`, `is_latest_version`, and the "latest" choice in panel and search. I found no such versions in-repo, so this is low impact. It is a cheap fix, though, because the PR is otherwise a strict improvement.

<details><summary>Evidence</summary>

Run against a scratch copy of the PR's `version.py`:

```
1.0+galaxy_10  parse_version -> Version('1.0+galaxy.10')  parse_tool_version -> LegacyVersion('1.0+galaxy._10')
1.0+galaxy-10  parse_version -> Version('1.0+galaxy.10')  parse_tool_version -> LegacyVersion('1.0+galaxy.-10')
parse_tool_version('1.0+galaxy_10') < parse_tool_version('1.0')  -> True   (parse_version: False)
```

`Tool.version_object` already had this quirk before the PR. Lineage ordering is the new exposure.

</details>

Fix: strip all PEP 440 local-segment separators, `suffix.lstrip("._-")`, and add `1.0+galaxy_10` / `1.0+galaxy-10` cases to `TOOL_VERSIONS` or to the equality test.

## Non-finding notes

- **Open question (helper vs changing `parse_version`).** I agree with the separate helper. `parse_version` serves conda/mulled resolution, linters, and profile checks, where the `+galaxy` convention means nothing. Changing it would also change `str()` output on a release branch. A small follow-up could switch planemo (galaxyproject/planemo#1747) to `parse_tool_version`.
- **Sibling sites checked; none missed in a way that matters.**
  - `get_safe_version` (`tools/__init__.py:422-426`) and `version_updates.py` still use `parse_version` on lineage versions, but only for stock tools in `WORKFLOW_SAFE_TOOL_VERSION_UPDATES`, which have no `+galaxy` suffixes.
  - `conda_util.py:615` and the mulled sorts order package versions, not tool versions.
  - The client's `compareToolVersions` (`client/src/utils/tool-version.ts`) already uses `localeCompare(..., {numeric: true})`, so it orders `+galaxy10` after `+galaxy9`.
  - `TrsTool.vue` sorts its own semver-style parse.
  - The Tool Shed has no other tool-version sort besides the TRS one the PR changed.
- **`+galaxy1` vs `+galaxy.1` now compare equal.** The PR describes this. In a `SortedSet` both strings are kept, because membership is by value, but their relative order then follows insertion order. This only matters if a lineage holds both spellings, which is unlikely, so it is not worth a change.
- **Case.** `+Galaxy10` is not rewritten, because the match is case-sensitive, so it still orders as a string. That behavior predates this PR. Mention it only if the P3 fix is being made anyway.
