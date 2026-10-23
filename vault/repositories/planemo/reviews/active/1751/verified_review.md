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

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the new test failed on the PR head (the message contained `1.0+galaxy.10`) and its `+galaxy9` case failed on master's `shed_lint.py`. Both pass with the fix.

</details>

### P3 1: `parse_tool_version` is typed `Callable[[str], Any]` (implementation verified)

`planemo/tools.py` annotates the alias as `Callable[[str], Any]`, and the fallback has no return annotation. That throws away the `Union[LegacyVersion, Version]` return type that both upstream and the fallback have, so mypy can't check anything that uses the result.

Annotate the fallback and the alias with `Union[LegacyVersion, Version]`. The `getattr` lookup can stay. A `try/except ImportError` import of `parse_tool_version` would fail mypy under the pinned galaxy-tool-util 26.1.1 unless it carried a `# type: ignore`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: after the fix, mypy reports no new errors in `planemo/tools.py`, `planemo/shed_lint.py`, or `planemo/autoupdate.py` compared with the base.

</details>

### P3 2: Fallback comments don't say when to remove it, and the docstring says 26.1+ ships upstream (implementation verified)

The comment says upstream gained `parse_tool_version` "after 26.1.1", but the fallback's docstring says "(26.1+)". 26.1.1 doesn't have it. Neither one says when the fallback can be dropped.

Fix the docstring and add one line: drop the fallback once the galaxy-tool-util floor in `requirements.txt` ships `parse_tool_version`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the installed galaxy-tool-util 26.1.1 has no `parse_tool_version`.

</details>

### P3 3: Parametrized version test runs the fallback twice (implementation verified)

`requirements.txt` pins `galaxy-tool-util>=25.1,<26.2`, which resolves to 26.1.1, and that release has no `parse_tool_version`. So `parse_tool_version is _parse_tool_version`, both parametrize cases run the same function, and nothing tests the upstream path. The second assert (`+galaxy10 > +galaxy9`) is already implied by the sort assertion.

Test the fallback's ordering directly. Add a parity test that skips unless galaxy-tool-util has `parse_tool_version` and checks that upstream sorts the same list the same way. Drop the redundant assert.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the parity test skips under 26.1.1. It runs and passes when upstream `release_26.1`'s `parse_tool_version` is injected.

</details>
