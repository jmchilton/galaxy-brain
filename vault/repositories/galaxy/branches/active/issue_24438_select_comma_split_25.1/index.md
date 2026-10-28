---
upstream_base_branch: release_25.1
---

# issue_24438_select_comma_split_25.1

- [Open PR](https://github.com/galaxyproject/galaxy/pull/24491)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24438_select_comma_split_25.1)

## Status

Draft PR #24491; waiting for CI (`ci_wait`) at `d85ea54982db8c335ff616d1aebcdc3c98e70912`.

Human-read checklist item remains unchecked while the draft PR waits for CI.

Fork CI is pending; the only completed failure is a setup/skip failure with no failed job.

Base: `release_25.1` (`8243913fd5cb`); fork: `jmchilton/issue_24438_select_comma_split_25.1`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24438_select_comma_split_25.1`.

## Review materials

- [PR description](pr_description.md)
- [Title options](pr_titles.md)
- [Recommended labels](pr_tags.md)
- [Polishing debrief](polish_debrief.md)
- [Implementation debrief](implementation_debrief.md)
- [Checklist review](subagents/polish_checklist.md)
- [Description strengthening](subagents/polish_strengthening.md)

## Issue

Fixes [#24438](https://github.com/galaxyproject/galaxy/issues/24438). Root cause posted in the [issue comment](https://github.com/galaxyproject/galaxy/issues/24438#issuecomment-6392581298).

## Decisions

- Base `release_25.1`: bug on all supported releases; small test-framework fix; John picked it.
- Fix A: legacy-path test parsing (`verify/parse.py`) comma-splits only data and `multiple` inputs; others wrap as `[value]` (same shape as before). Covers conditional discriminators too.
- Re-scope (scope eval 1): add `TestsParamMultipleSelectCommaOptions` lint warning + `galaxy.xsd` docs for comma option values on multiple selects (`value_json` list). Scope eval 2: keep.
- Not done: moving tool tests off the legacy API path (impossible on 25.1); option-aware splitting.
- Forward-merge to dev: add `hidden_data` to the split gate; don't split `test_case_json` strings.
