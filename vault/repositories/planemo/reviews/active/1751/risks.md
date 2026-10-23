Risks are minimal - this change only alters how `+galaxyN` version suffixes are ordered in `shed_lint` and `autoupdate`, is easily reverted, and doesn't lock the project into hard-to-change choices (a two-way door).

<details><summary>Risk Details</summary>

- Behavior change: `shed_lint` ShedVersion may now pass or fail differently for repos whose versions straddle `+galaxy9`/`+galaxy10`; this is the intended fix, but CI pipelines (e.g. tools-iuc) may see changed lint outcomes.
- Planemo's fallback `_parse_tool_version` must stay in sync with galaxy-tool-util's `parse_tool_version`; with `galaxy-tool-util>=25.1,<26.2`, users get one or the other depending on installed version, so divergence would produce environment-dependent ordering.
- The `getattr` fallback leaves a shim to delete once the minimum galaxy-tool-util includes `parse_tool_version`.

</details>

<details><summary>Risk Review Advice</summary>

Check that the fallback rule matches upstream galaxyproject/galaxy#24320 for edge cases (e.g. `+galaxy.1`, `+galaxy` with no number, non-numeric suffixes) so ordering doesn't depend on the installed galaxy-tool-util. Nothing here is persisted or destructive; a revert restores prior behavior.

</details>
