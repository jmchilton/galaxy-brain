# planemo#1752 — initial review (default profile)

- Profile: default (+ shared, REVIEW_FOCUS)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `6e4789254bd7173044223986eaa936e241bfa7e0` (base `master` `969e5cee`)

## Verdict

Approach is sound and the endpoint is real; mergeable after one semantics question (P2 1) and some cheap cleanups. The comparison fails safe: any fetch error, parse error or rendering skew falls back to the old error, so false "unchanged" is the only real risk, and that comes from files outside the tool XML.

## What was checked

- **Endpoint exists.** Galaxy `lib/tool_shed/webapp/api2/tools.py` `GET /api/tools/{tool_id}/versions/{tool_version}/tool_source` returns `source.to_string()` from `get_tool_source()` on a fresh hg clone of the revision (`lib/tool_shed/managers/tools.py::_shed_tool_source_for`). So both sides run the same `XmlToolSource.to_string()` (macro-expanded `xml_to_string(root)`). The only parity risk is a skew between the server's Galaxy and the local galaxy-tool-util, and that skew makes tools look changed, which still errors as before.
- **Revision chosen.** `get_repository_metadata_by_tool_version` walks the installable revisions in order and the last one wins. So `{version}` resolves to the newest installable revision that has that tool version, which matches what the lint compares against.
- **Live check.** `https://toolshed.g2.bx.psu.edu/api/tools/richard-burhans~kegalign~kegalign/versions/0.3.2%2Bgalaxy0/tool_source` returned 200 in about 2s with macros expanded and a `language: xml` header. The quoted `+` (`%2B`) works. I couldn't check local/published parity byte for byte: the author's GitHub source is already several versions ahead of the shed, and hgweb raw/archive URLs return HTML. I'm relying on the shared-code argument above and the author's kegalign trial.
- **Custom sheds.** Not affected. `lint_shed_version` hardcodes the main Tool Shed (this predates the PR), and the helper builds its URL from `tsi.base_url`.
- **Tool ids.** The TRS id `owner~repo~tool_id` uses `parse_id()`, the same id the shed metadata matches on. Duplicate ids in one repo still hit the existing `assert len(tool) == 1`, which predates the PR.
- **YAML tools.** `to_string()` returns JSON, `ET.canonicalize` fails on it, so they are treated as changed and still error. That is safe.
- **Tests.** The 5 new tests pass (`uv run --with responses --with pytest pytest tests/test_shed_lint_version.py`).

## Findings

### P2 1: Changes to non-XML repository files no longer require a version bump

Before this PR, any tool whose version equalled the published one was an error. Now a tool counts as unchanged when its rendered XML matches. Changes to files the XML only references are invisible to that comparison: wrapper scripts called via `$__tool_directory__` (kegalign itself ships `run_lastz_tarball.py`), `tool_data_table_conf.xml.sample`, `.loc.sample` and test-data. A script-only fix now lints clean at the same version. The Tool Shed then overwrites that version's metadata instead of creating a new installable revision, and installed Galaxies never see an update. #1525 is about unchanged *siblings*, so a changed helper should still demand a bump. Two options:

- Also compare the repository files each tool references, or more simply the whole repository's non-tool files: if anything other than the tool XMLs changed, keep the old behaviour.
- Or document explicitly that ShedVersion only covers the tool XML.

At minimum, the info message and the code comment should say that only the rendered tool XML is compared.

### P2 2: Semantic conflict with #1751 can silently disable this feature

#1751 changes `tool_version = parse_version(tool_source.parse_version())` to a raw string and compares through `parse_tool_version(...)`. This PR adds `tool_version == parse_version(ts_tool_version)`. The two will conflict textually around the `if tool_version <= ...` hunk. A resolution that keeps #1751's `tool_version` string together with this PR's new line compares `str == Version`, which is always False. The skip then never runs, and no test catches it, because the new tests only cover the helpers (see P3 1). Whichever PR lands second should compare through #1751's `parse_tool_version` on both sides.

### P3 1: No test exercises `lint_shed_version` itself

The tests cover `_same_tool` and `_published_tool_source` in isolation. Nothing checks the wiring: equal version plus same source gives an info message and no error, equal version plus a different source still errors, and a fetch failure still errors. A test that drives `lint_shed_version` with `responses` mocking the four Tool Shed calls (or a patched `tsi`) would cover the guard and the `continue`, and would have caught P2 2.

### P3 2: Reuse the bioblend session instead of bare `requests.get`

`tsi` is a bioblend `ToolShedInstance`, and `tsi.make_get_request(f"{tsi.url}/tools/{trs_id}/versions/{v}/tool_source")` applies the instance's `verify` and `timeout` settings. Using it means one HTTP path for every Tool Shed call in this function, and the `requests` import in `shed_lint.py` can go. Also type `tsi` as `ToolShedInstance` rather than leaving it untyped.

### P3 3: Request cost and timeout

Each same-version tool now triggers a server-side hg clone (about 2s on the main shed) with a 60s client timeout. A slow shed can therefore add N×60s to `shed_lint` on large multi-tool repositories, such as IUC CI sweeps. Consider a shorter timeout (the 10–30s used elsewhere in planemo).

### P3 4: Error message does not say when the comparison was skipped

If the fetch fails or the XML differs, the user gets the same "less or equal" error as before, with no hint about which case applied. A short suffix such as "rendered tool differs from published" or "published source unavailable" would make the new behaviour discoverable when it does not kick in.

## Nits

- The comment's `(#1525)` reference and the "Same version, same rendered tool" reasoning belong in the commit message. One line saying what the block does is enough.
