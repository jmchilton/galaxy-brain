

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [generic_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this change only alters how `+galaxyN` version suffixes are ordered in `shed_lint` and `autoupdate`, is easily reverted, and doesn't lock the project into hard-to-change choices (a two-way door).

<details><summary>Risk Details</summary>

- Behavior change: `shed_lint` ShedVersion may now pass or fail differently for repos whose versions straddle `+galaxy9`/`+galaxy10`; this is the intended fix, but CI pipelines (e.g. tools-iuc) may see changed lint outcomes.
- Planemo's fallback `_parse_tool_version` must stay in sync with galaxy-tool-util's `parse_tool_version`; with `galaxy-tool-util>=25.1,<26.2`, users get one or the other depending on installed version, so divergence would produce environment-dependent ordering.
- The `getattr` fallback leaves a shim to delete once the minimum galaxy-tool-util includes `parse_tool_version`.

</details>

<details><summary>Risk Review Advice</summary>

Check that the fallback rule matches upstream galaxyproject/galaxy#24320 for edge cases (e.g. `+galaxy.1`, `+galaxy` with no number, non-numeric suffixes) so ordering doesn't depend on the installed galaxy-tool-util. Nothing here is persisted or destructive; a revert restores prior behavior.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/planemo/tree/pr_1751_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Review branch [`pr_1751_review_0`](https://github.com/jmchilton/planemo/tree/pr_1751_review_0), cut from the reviewed commit `3fcaae47`, fixes the ShedVersion lint message so it prints the tool's declared version (not the normalized `1.0+galaxy.10`), and adds the first test for `lint_shed_version`: a real one-tool repository on disk, a small fake Tool Shed class, and exact-message assertions. The `+galaxy9` case fails on master and the message case fails on the PR head. It also restores the parser's return type, notes when to drop the fallback, and splits the tool-version test into a fallback test plus an upstream parity test that skips until galaxy-tool-util ships `parse_tool_version`.

- [`ce13dc68`](https://github.com/jmchilton/planemo/commit/ce13dc68431e6737f7e1b5cb420c92f816ab3d17) Report declared tool version in ShedVersion lint error — compares parsed versions but formats the raw `tool_source.parse_version()` string, with a parametrized fake-shed test in `tests/test_planemo_linters.py`.
- [`3df9ac83`](https://github.com/jmchilton/planemo/commit/3df9ac833ae5294420b5f457a0174edf61acd904) Keep parse_tool_version return type — annotates the fallback and alias as `Union[LegacyVersion, Version]` and drops `Any`.
- [`75cbf683`](https://github.com/jmchilton/planemo/commit/75cbf683c3a9358baccdf0c60773091e63c8533e) State when to drop parse_tool_version fallback — names the removal condition and fixes the docstring's claim that 26.1+ ships it.
- [`5cfdd459`](https://github.com/jmchilton/planemo/commit/5cfdd459d497cec25c7629b1c46d4ffd25cd2c81) Split fallback and upstream parity tool version tests — replaces the parametrize that ran the fallback twice and drops the assert the sort already implies.

</details>

</details>

### P2 1: ShedVersion error prints the normalized `1.0+galaxy.10` and has no test (implementation verified)

`lint_shed_version` now stores the parsed version in `tool_version` and puts it in the error message. With the fallback parser, `str(parse_tool_version("1.0+galaxy10"))` is `1.0+galaxy.10`, so the error reads `version 1.0+galaxy.10 is less or equal than ... 1.0+galaxy11`. That version string appears nowhere in the tool XML, and it sits next to the Tool Shed version, which is not normalized. Master printed the version as declared. `lint_shed_version` has no tests, so neither this regression nor the PR's actual fix at this call site (`+galaxy10` vs `+galaxy9`) is checked.

Keep the raw string for the message and parse only for the comparison. Add a test that fakes only the Tool Shed and asserts the exact messages.

<details><summary>Details</summary>

```python
tool_version = tool_source.parse_version()
...
if parse_tool_version(tool_version) <= parse_tool_version(ts_tool_version):
    lint_ctx.error(
        f"{tool_id}: version {tool_version} is less or equal than version of the latest installable revision {ts_tool_version}",
```

Test (`tests/test_planemo_linters.py`): write a one-tool repository with `version="1.0+galaxy10"` to `tmp_path`, describe it with a small `@dataclass` (`path`, `owner`, `name`), and patch `planemo.shed_lint.tool_shed_instance` to return a small fake shed class (not `mock.Mock`). Then assert with `LintContext`/`_messages` that a Tool Shed version of `1.0+galaxy9` gives no messages, and that `1.0+galaxy10` gives exactly one `ShedVersion` error with the declared `1.0+galaxy10` in its text.

</details>

Fixed in [`ce13dc68`](https://github.com/jmchilton/planemo/commit/ce13dc68431e6737f7e1b5cb420c92f816ab3d17).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the new test failed on the PR head (the message contained `1.0+galaxy.10`) and its `+galaxy9` case failed on master's `shed_lint.py`. Both pass with the fix.

</details>


### P3 1: `parse_tool_version` is typed `Callable[[str], Any]` (implementation verified)

`planemo/tools.py` annotates the alias as `Callable[[str], Any]`, and the fallback has no return annotation. That throws away the `Union[LegacyVersion, Version]` return type that both upstream and the fallback have, so mypy can't check anything that uses the result.

Annotate the fallback and the alias with `Union[LegacyVersion, Version]`. The `getattr` lookup can stay. A `try/except ImportError` import of `parse_tool_version` would fail mypy under the pinned galaxy-tool-util 26.1.1 unless it carried a `# type: ignore`.

Fixed in [`3df9ac83`](https://github.com/jmchilton/planemo/commit/3df9ac833ae5294420b5f457a0174edf61acd904).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: after the fix, mypy reports no new errors in `planemo/tools.py`, `planemo/shed_lint.py`, or `planemo/autoupdate.py` compared with the base.

</details>


### P3 2: Fallback comments don't say when to remove it, and the docstring says 26.1+ ships upstream (implementation verified)

The comment says upstream gained `parse_tool_version` "after 26.1.1", but the fallback's docstring says "(26.1+)". 26.1.1 doesn't have it. Neither one says when the fallback can be dropped.

Fix the docstring and add one line: drop the fallback once the galaxy-tool-util floor in `requirements.txt` ships `parse_tool_version`.

Fixed in [`75cbf683`](https://github.com/jmchilton/planemo/commit/75cbf683c3a9358baccdf0c60773091e63c8533e).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the installed galaxy-tool-util 26.1.1 has no `parse_tool_version`.

</details>


### P3 3: Parametrized version test runs the fallback twice (implementation verified)

`requirements.txt` pins `galaxy-tool-util>=25.1,<26.2`, which resolves to 26.1.1, and that release has no `parse_tool_version`. So `parse_tool_version is _parse_tool_version`, both parametrize cases run the same function, and nothing tests the upstream path. The second assert (`+galaxy10 > +galaxy9`) is already implied by the sort assertion.

Test the fallback's ordering directly. Add a parity test that skips unless galaxy-tool-util has `parse_tool_version` and checks that upstream sorts the same list the same way. Drop the redundant assert.

Fixed in [`5cfdd459`](https://github.com/jmchilton/planemo/commit/5cfdd459d497cec25c7629b1c46d4ffd25cd2c81).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the parity test skips under 26.1.1. It runs and passes when upstream `release_26.1`'s `parse_tool_version` is injected.

</details>
