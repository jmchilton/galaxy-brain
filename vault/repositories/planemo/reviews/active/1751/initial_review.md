# planemo#1751 initial review (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5, effort: medium
- Reviewed commit: `3fcaae47` (diff vs `origin/master` at `969e5cee`)

## Verdict

Approve with small changes. The fix is correct and minimal, matches Galaxy's `parse_tool_version` byte-for-byte in behavior (same `+galaxy` -> `+galaxy.` rewrite as `release_26.1` and `dev`), and covers both tool-version call sites in planemo. One user-visible regression in the ShedVersion lint message; the rest are nits.

## What I checked

- Galaxy upstream: `parse_tool_version` exists on `origin/release_26.1` and `origin/dev` (`lib/galaxy/tool_util/version.py`, commit `a0dec1a30b4`); installed `galaxy-tool-util` 26.1.1 lacks it. Planemo pins `galaxy-tool-util>=25.1,<26.2`, so the fallback is needed and will live until the floor reaches the first release that ships it.
- Existing helpers: planemo has no tool-version parser to reuse. Other `parse_version` uses are Galaxy release versions (`planemo/galaxy/config.py`, `packaging`) and conda versions (`autoupdate.py:123`, correctly left alone). `workflow_lint._lint_tool_versions` compares strings for equality only, so no sibling path diverges.
- `autoupdate_tool`'s `version_str.split("+galaxy")` is token detection, not ordering; unaffected.
- Ran `tests/test_tool_version.py` and both `get_newest_tool_id` tests: 4 passed. Confirmed red on master: `galaxy.tool_util.version.parse_version("1.0+galaxy10") > parse_version("1.0+galaxy9")` is `False`.
- Edge cases of the fallback: `1.0+galaxy` (empty suffix) unchanged; `1.0+galaxy.10` (already dotted) handled by `lstrip('.')`; `1.0+galaxy1.2` vs `1.0+galaxy1.10` orders numerically per segment. All match upstream.

## Findings

### P2 1: ShedVersion error now prints the rewritten version (`1.0+galaxy.10`)

`lint_shed_version` stores the parsed object in `tool_version` and interpolates it into the error message. With the new parser, `str(parse_tool_version("1.0+galaxy10"))` is `1.0+galaxy.10`, so the message reads e.g. `version 1.0+galaxy.10 is less or equal than ... 1.0+galaxy11` — a version string that appears nowhere in the tool XML, next to the unparsed shed version. Before this PR it echoed the version as written.

Fix: keep the raw string for the message, parse only for the comparison:

```python
tool_version = tool_source.parse_version()
...
if parse_tool_version(tool_version) <= parse_tool_version(ts_tool_version):
    lint_ctx.error(
        f"{tool_id}: version {tool_version} is less or equal than ...",
```

(`planemo/shed_lint.py:178`, `:212-214`.)

### P3 1: Prefer `try/except ImportError` over `getattr` on the module, and keep the return type

`planemo/tools.py` imports `galaxy.tool_util.version` twice (as a module and for `parse_version`) and assigns `parse_tool_version: Callable[[str], Any] = getattr(...)`, which erases the return type that both upstream and the fallback have (`Union[LegacyVersion, Version]`). The conventional shape is clearer and type-checks without the `Any`:

```python
try:
    from galaxy.tool_util.version import parse_tool_version
except ImportError:  # galaxy-tool-util < 26.1.2 (galaxyproject/galaxy#24320)
    def parse_tool_version(version: str) -> Union[LegacyVersion, Version]:
        ...
```

The test parametrization over `_parse_tool_version` would then need the fallback kept under its private name (e.g. define `_parse_tool_version` unconditionally and alias in the `except`), so this is a style call rather than a must.

### P3 2: Fallback comment should state the removal condition

The comment says the upstream function arrived "after 26.1.1". Naming the condition to drop the fallback (galaxy-tool-util floor in `requirements.txt` >= the first release with `parse_tool_version`) makes the cleanup discoverable. One line.

### P3 3: Test nits

- `test_galaxy_suffix_orders_numerically`: the second assertion (`+galaxy10 > +galaxy9`) is implied by the sorted-list assertion on `ORDERED`; drop it.
- With galaxy-tool-util 26.1.1 installed, both parametrizations run the same function; once upstream ships it, the `parse_tool_version` case tests Galaxy rather than planemo. Fine as a guard that planemo's fallback agrees with upstream, just worth knowing it is not two independent checks today.
- `lint_shed_version` has no test coverage at all (pre-existing, needs a shed); not a blocker for this PR, and P2 1 is the only behavior change there.
