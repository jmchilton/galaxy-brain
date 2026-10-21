### P3 1: `+galaxy_N` / `+galaxy-N` versions sort below the base version (implementation verified)

`parse_tool_version()` strips only `.` from the suffix before adding its own, so `1.0+galaxy_10` becomes `1.0+galaxy._10`. That isn't valid PEP 440, falls back to `LegacyVersion`, and sorts below every real version. Plain `parse_version` already treated these spellings as `+galaxy.10`. `Tool.version_object` had the same quirk, but the PR now applies the helper to lineages and TRS. A lineage holding such a tool would rank its newest version as the oldest. No such versions exist in-repo, so impact is low, but the fix is one line.

<details><summary>Evidence</summary>

```
parse_tool_version("1.0+galaxy_10") -> LegacyVersion('1.0+galaxy._10')
parse_tool_version("1.0+galaxy-10") -> LegacyVersion('1.0+galaxy.-10')
parse_version("1.0+galaxy_10")      -> Version('1.0+galaxy.10')
```

</details>

Strip every PEP 440 local separator with `suffix.lstrip("._-")`, and cover `_` and `-` alongside the existing `.` equality case. Commit `75e4e16bfe6` on `pr_24320_review_0` does this.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort: new parametrized cases failed against the PR head and pass with the fix.

</details>

### P3 2: Explain the `1.8.1+2+galaxy0` entry at the head of `TOOL_VERSIONS` (implementation verified)

`TOOL_VERSIONS` is commented "must be in the correct sorting order", but its first entry, `1.8.1+2+galaxy0`, sorts below `1.0`. That's only because the string is invalid PEP 440 and falls back to `LegacyVersion`, which sorts before every `Version`. It's already listed in `LEGACY_VERSIONS` in the same file. A reader will probably think the list is out of order.

Add a one-line comment on the entry. Commit `c37807107c9` on `pr_24320_review_0` does this.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort: the entry is in the existing `LEGACY_VERSIONS` parse test, and the suite passes with the comment.

</details>
