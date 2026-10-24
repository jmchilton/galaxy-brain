### P2 1: Changes to non-XML repository files no longer require a version bump (implementation verified)

On master, any tool whose version equals the latest installable one is an error. With this PR, such a tool passes when its rendered XML matches the published XML, so changes to files the XML only references are invisible. That covers wrapper scripts called through `$__tool_directory__`, `.loc.sample` and data table samples, and test-data. A fix that touches only a script now lints clean at the same version, and nothing in the output says the script was never compared. #1525 is about unchanged siblings; a changed helper is a change to that tool.

<details><summary>Evidence</summary>

In the new `shed_lint` test from the review branch, appending to the repository's `related_file` still yields `cat: tool XML unchanged since the latest installable revision` and no `ShedVersion` error for `cat`. On master any same-version tool errors; the new test's unchanged case is red there.

</details>

At minimum, say that only the tool XML is compared. The review branch does this in the info message and the comment. To keep the old protection, fall back to the error when any non-tool file changed. For example, compare the repository's other files against the published changeset, or the files each tool references. Otherwise, document the XML-only scope in the ShedVersion docs.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the new integration test still passed with a modified sibling file, and `e75c4806` scopes the message and comment.

</details>

### P2 2: Merging with #1751 either breaks the lint or silently disables the skip (implementation verified)

#1751 makes `tool_version` the raw string and drops the `parse_version` import. This PR adds `tool_version == parse_version(ts_tool_version)`. A trial merge of the PR head with #1751's review branch conflicts on that hunk. The natural resolution keeps this PR's skip block and #1751's comparison, which fails flake8 with F821 (`parse_version` undefined). If the resolver restores the import, the check becomes `str == Version`, which is always False. The skip then never runs, and #1751's ShedVersion tests still pass.

Compare the declared version string with the Tool Shed's (`tool_source.parse_version() == ts_tool_version`). The `tool_source` route looks the tool up by that string anyway. With that change (`83180e5a`), the natural resolution passes flake8 and this branch's tests pass on the merge. One interaction remains for whichever PR lands second: #1751's `_FakeToolShed` test now reaches `_published_tool_source` in its equal-version case and fails with `AttributeError: '_FakeToolShed' object has no attribute 'url'`. The fake needs a `url` and a `make_get_request` that returns a 404, or both PRs could share one Tool Shed test harness (the `responses` one here or the fake class there) instead of each adding its own.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: trial merges of `jmchilton/pr_1751_review_0` onto the PR head and onto `pr_1752_review_0` in a scratch worktree, checked with flake8 and both PRs' ShedVersion tests.

</details>

### P2 3: Nothing tests the skip inside `lint_shed_version` (implementation verified)

All 5 new tests target `_same_tool` and `_published_tool_source`. Deleting the new skip block from `lint_shed_version` keeps them green. So nothing checks the info line, the `continue`, the error that remains when the source differs or can't be fetched, or the n-tools branch. Two of the tests also mostly restate the URL template and the `status_code == 200` check.

Add `ShedLintTestCase` tests that mock the main Tool Shed with `responses`, following `test_tool_linting_doi`. Fold the two `_published_tool_source` tests into them and keep the three `_same_tool` tests. The review branch does this (`d71c9daa`). It runs a two-tool `single_tool` copy at `1.0+galaxy1` (which keeps `%2B` covered) with one tool published unchanged and one edited, plus a case where `tool_source` returns 404.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: both new tests fail with master's `shed_lint.py` (master errors on the unchanged tool and never fetches `tool_source`) and pass on the branch.

</details>

### P3 1: Use the bioblend `ToolShedInstance` instead of bare `requests.get` (implementation verified)

`tsi` is already a bioblend `ToolShedInstance`. Calling `tsi.make_get_request(f"{tsi.url}/tools/...")` applies the instance's `verify` setting and keeps every Tool Shed call in this function on one HTTP path. Type `tsi` as `ToolShedInstance` too. The `requests` import still has to stay, because `make_get_request` doesn't wrap `requests.RequestException`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: `8f87cbc0`. The new integration tests pass through it, a live check through it got real tool bodies from the main Tool Shed, and mypy reports no new errors in `shed_lint.py`.

</details>

### P3 2: 60s timeout per same-version tool (implementation verified)

Each same-version tool now costs one request, and the server runs an hg clone for each one (about 2s on the main Tool Shed). With a 60s timeout, a slow Tool Shed can add N×60s to `shed_lint` on large multi-tool repositories or in IUC CI sweeps. The review branch lowers the timeout to 30s (`73d5d85c`). Bioblend's own default timeout is None, so the value has to be passed explicitly.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: `73d5d85c`.

</details>

### P3 3: The error doesn't say whether the comparison ran

When the published source can't be fetched, or the tool differs from it, the user gets the same "less or equal" error as before. Nothing hints that a comparison was attempted, so the new behavior is hard to discover when it doesn't apply. Add a suffix to the error, or a following info line, that names which case applied, such as "tool XML differs from published" or "published tool source unavailable". #1751's exact-message test would need the extra entry, the same update P2 2 already asks for.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort.

</details>
