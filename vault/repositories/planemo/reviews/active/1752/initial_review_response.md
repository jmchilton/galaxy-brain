<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [generic_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are low - this change only relaxes the `shed_lint` ShedVersion check (an equal version now passes when the local tool matches the Tool Shed's published source), fails closed to the old error whenever the fetch or comparison doesn't succeed, persists nothing, and is easily reverted (a two-way door).

<details><summary>Risk Details</summary>

- Behavior change: repos whose unchanged tools previously failed ShedVersion (e.g. tools-iuc CI) will now pass; that's the intent, but it's a lint outcome change for downstream pipelines.
- New network dependency: one extra unauthenticated `requests.get` (60s timeout) per tool whose version equals the latest installable revision; large multi-tool repos or a slow Tool Shed can noticeably lengthen lint runs. It bypasses `tsi`'s session/auth/proxy settings.
- Relies on the Tool Shed `/api/tools/{trs_id}/versions/{version}/tool_source` endpoint and on its rendering (macro expansion, tokens) matching `tool_source.to_string()`; mismatches only produce false errors (old behavior), not false passes.
- Canonical comparison with `strip_text=True` ignores leading/trailing whitespace in text, so a change that only alters whitespace inside `<command>`/`<configfile>` (which can matter for Cheetah/shell) would be treated as unchanged.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the endpoint and its rendered output against a real Tool Shed (main and test) for a macro-using tool, so the skip actually fires in practice. Consider whether whitespace-only command edits matter enough to compare text exactly. Nothing here is destructive; a revert restores prior behavior.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/planemo/tree/pr_1752_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Review branch [`pr_1752_review_0`](https://github.com/jmchilton/planemo/tree/pr_1752_review_0), cut from the reviewed commit `6e478925`, adds the first test that drives the new skip through `shed_lint`. It mocks the main Tool Shed for a two-tool repository where one tool is published unchanged and the other edited, plus a 404 case. Both tests fail on master. The branch also sends the published-source request through the bioblend `ToolShedInstance` with a 30s cap, matches the skip on the declared version string so it no longer depends on how #1751 parses `tool_version`, and says in the info message and comment that only the tool XML is compared.

- [`d71c9daa`](https://github.com/jmchilton/planemo/commit/d71c9daa5e0ed5bee270c14ab785e7efe6744a23) Test ShedVersion skip through shed_lint — adds two `ShedLintTestCase` tests using `responses` (one tool unchanged, one edited, and a 404 `tool_source`) at version `1.0+galaxy1`, so the `%2B` encoding stays covered, and folds the two `_published_tool_source` unit tests into them.
- [`8f87cbc0`](https://github.com/jmchilton/planemo/commit/8f87cbc085c406eaffe49673fe68a50c96eb28a9) Fetch published tool source through the bioblend ToolShedInstance — uses `tsi.make_get_request(f"{tsi.url}/tools/...")` and types `tsi` as `ToolShedInstance`. `requests` stays for its exception type.
- [`73d5d85c`](https://github.com/jmchilton/planemo/commit/73d5d85cefb7b34582b8b8c0e6f5022d634879e7) Cap published tool source fetch at 30s — lowers the per-tool timeout from 60s.
- [`83180e5a`](https://github.com/jmchilton/planemo/commit/83180e5a2af67545579387db6c22e58164a6f56e) Match ShedVersion skip on the declared version string — compares `tool_source.parse_version() == ts_tool_version` instead of `tool_version == parse_version(...)`.
- [`e75c4806`](https://github.com/jmchilton/planemo/commit/e75c480646ae93a8d736cb8204b43b6cbe23600c) Say ShedVersion skip compares only the tool XML — the info line now reads "tool XML unchanged since the latest installable revision", and the comment notes that script and other file changes aren't seen.

</details>

</details>

### P2 1: Changes to non-XML repository files no longer require a version bump (implementation verified)

On master, any tool whose version equals the latest installable one is an error. With this PR, such a tool passes when its rendered XML matches the published XML, so changes to files the XML only references are invisible. That covers wrapper scripts called through `$__tool_directory__`, `.loc.sample` and data table samples, and test-data. A fix that touches only a script now lints clean at the same version, and nothing in the output says the script was never compared. #1525 is about unchanged siblings; a changed helper is a change to that tool.

<details><summary>Evidence</summary>

In the new `shed_lint` test from the review branch, appending to the repository's `related_file` still yields `cat: tool XML unchanged since the latest installable revision` and no `ShedVersion` error for `cat`. On master any same-version tool errors; the new test's unchanged case is red there.

</details>

At minimum, say that only the tool XML is compared. The review branch does this in the info message and the comment. To keep the old protection, fall back to the error when any non-tool file changed. For example, compare the repository's other files against the published changeset, or the files each tool references. Otherwise, document the XML-only scope in the ShedVersion docs.

Addressed (message and comment scope only) in [`e75c4806`](https://github.com/jmchilton/planemo/commit/e75c480646ae93a8d736cb8204b43b6cbe23600c).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the new integration test still passed with a modified sibling file, and `e75c4806` scopes the message and comment.

</details>

### P2 2: Merging with #1751 either breaks the lint or silently disables the skip (implementation verified)

#1751 makes `tool_version` the raw string and drops the `parse_version` import. This PR adds `tool_version == parse_version(ts_tool_version)`. A trial merge of the PR head with #1751's review branch conflicts on that hunk. The natural resolution keeps this PR's skip block and #1751's comparison, which fails flake8 with F821 (`parse_version` undefined). If the resolver restores the import, the check becomes `str == Version`, which is always False. The skip then never runs, and #1751's ShedVersion tests still pass.

Compare the declared version string with the Tool Shed's (`tool_source.parse_version() == ts_tool_version`). The `tool_source` route looks the tool up by that string anyway. With that change (`83180e5a`), the natural resolution passes flake8 and this branch's tests pass on the merge. One interaction remains for whichever PR lands second: #1751's `_FakeToolShed` test now reaches `_published_tool_source` in its equal-version case and fails with `AttributeError: '_FakeToolShed' object has no attribute 'url'`. The fake needs a `url` and a `make_get_request` that returns a 404, or both PRs could share one Tool Shed test harness (the `responses` one here or the fake class there) instead of each adding its own.

Fixed in [`83180e5a`](https://github.com/jmchilton/planemo/commit/83180e5a2af67545579387db6c22e58164a6f56e).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: trial merges of `jmchilton/pr_1751_review_0` onto the PR head and onto `pr_1752_review_0` in a scratch worktree, checked with flake8 and both PRs' ShedVersion tests.

</details>

### P2 3: Nothing tests the skip inside `lint_shed_version` (implementation verified)

All 5 new tests target `_same_tool` and `_published_tool_source`. Deleting the new skip block from `lint_shed_version` keeps them green. So nothing checks the info line, the `continue`, the error that remains when the source differs or can't be fetched, or the n-tools branch. Two of the tests also mostly restate the URL template and the `status_code == 200` check.

Add `ShedLintTestCase` tests that mock the main Tool Shed with `responses`, following `test_tool_linting_doi`. Fold the two `_published_tool_source` tests into them and keep the three `_same_tool` tests. The review branch does this (`d71c9daa`). It runs a two-tool `single_tool` copy at `1.0+galaxy1` (which keeps `%2B` covered) with one tool published unchanged and one edited, plus a case where `tool_source` returns 404.

Fixed in [`d71c9daa`](https://github.com/jmchilton/planemo/commit/d71c9daa5e0ed5bee270c14ab785e7efe6744a23).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: both new tests fail with master's `shed_lint.py` (master errors on the unchanged tool and never fetches `tool_source`) and pass on the branch.

</details>

### P3 1: Use the bioblend `ToolShedInstance` instead of bare `requests.get` (implementation verified)

`tsi` is already a bioblend `ToolShedInstance`. Calling `tsi.make_get_request(f"{tsi.url}/tools/...")` applies the instance's `verify` setting and keeps every Tool Shed call in this function on one HTTP path. Type `tsi` as `ToolShedInstance` too. The `requests` import still has to stay, because `make_get_request` doesn't wrap `requests.RequestException`.

Fixed in [`8f87cbc0`](https://github.com/jmchilton/planemo/commit/8f87cbc085c406eaffe49673fe68a50c96eb28a9).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: `8f87cbc0`. The new integration tests pass through it, a live check through it got real tool bodies from the main Tool Shed, and mypy reports no new errors in `shed_lint.py`.

</details>

### P3 2: 60s timeout per same-version tool (implementation verified)

Each same-version tool now costs one request, and the server runs an hg clone for each one (about 2s on the main Tool Shed). With a 60s timeout, a slow Tool Shed can add N×60s to `shed_lint` on large multi-tool repositories or in IUC CI sweeps. The review branch lowers the timeout to 30s (`73d5d85c`). Bioblend's own default timeout is None, so the value has to be passed explicitly.

Fixed in [`73d5d85c`](https://github.com/jmchilton/planemo/commit/73d5d85cefb7b34582b8b8c0e6f5022d634879e7).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: `73d5d85c`.

</details>

### P3 3: The error doesn't say whether the comparison ran

When the published source can't be fetched, or the tool differs from it, the user gets the same "less or equal" error as before. Nothing hints that a comparison was attempted, so the new behavior is hard to discover when it doesn't apply. Add a suffix to the error, or a following info line, that names which case applied, such as "tool XML differs from published" or "published tool source unavailable". #1751's exact-message test would need the extra entry, the same update P2 2 already asks for.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort.

</details>
