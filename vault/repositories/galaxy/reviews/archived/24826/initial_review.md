# PR #24826 initial review (default profile)

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `4c330c4ed47de5048ea172e64ec186604767c24e`
- Base: `release_26.1`

## Summary

The PR has two commits:

1. `c19b6a27fda` makes `JsonCollectedDatasetMatch.ext` fall back to the collector default when the `ext` group is `None` or empty. This is correct and small, and it fixes both `ext.lower()` crash sites (`_populate_elements` and `collect_primary_datasets`). It also covers the built-in `__name_and_ext__` / `__designation_and_ext__` named patterns, whose `ext` group is optional (`(?P<ext>[^\.]+)?`), so a file like `foo.` used to crash too.
2. `4c330c4ed47` adds `RegexCollectedDatasetMatch.has_element_identifier` and has `DatasetCollector.match` skip, with only a log warning, any regex match that has no non-`None` designation, name or `identifier_N` group. The PR title and description don't mention this commit. It applies to every regex discovery, primary datasets included, not only to collections.

The ext fallback should go in. The skip logic in commit 2 is broader than the crash it addresses, and it changes behavior on a release branch.

## Findings

### P2 1 — Skip rule drops primary-dataset discoveries that worked before, including patterns with no identifier group

`has_element_identifier` returns `False` whenever the groupdict has no `designation`, `name` or `identifier_N` value. That includes patterns that define none of these groups at all. Before this PR, those patterns worked for primary-dataset discovery: `collect_primary_datasets` accepted `designation = None`, named the dataset `f"{outdata.name} (None)"` (or used `name`), and with `assign_primary_output="true"` it moved the file into the primary output. After this PR, such files are dropped silently and the job still succeeds. For example, an `assign_primary_output` pattern of `report\.html` now leaves the primary output unpopulated.

Checked against the PR head:

```
>>> c = dataset_collector(FilePatternDatasetCollectionDescription(pattern=r"report\.html", format="html", assign_primary_output=True))
>>> c.match(None, "report.html")
Skipped discovered file [report.html]: the discover pattern [report\.html] captured no element identifier ...
None
```

No in-repo test tool uses such a pattern (I grepped `test/functional/tools`, `tools`, `lib/galaxy/tools`), so CI won't catch this. Tool Shed tools could still use one. The XSD text added in the PR now says the pattern "must always capture an element identifier for every file", which is a new requirement introduced on a release branch.

Separately, for collections, the old behavior was a crash, so nothing relied on it. Turning that crash into a successful job with elements silently missing is arguably worse for users than a clear failure: the only signal is a server log warning they never see. REVIEW_FOCUS prefers rejecting never-working input over quietly accepting it.

Suggested fix: drop commit 2 from this release-branch PR and keep the PR to the ext fallback it describes. If the identifier problem still needs handling:
- (a) limit the check to collection discovery (`_populate_elements` / `find_files` for collections), and
- (b) fail the job with a clear error message (e.g. raise in `_populate_elements` when an element identifier is `None`) instead of skipping, or
- (c) add a tool linter for optional designation/name/identifier groups, targeted at `dev`.

### P3 1 — `has_element_identifier` doesn't match `designation`'s own precedence

`designation` returns `as_dict["designation"]` whenever the key is present, even when its value is `None`, and only falls back to `name` when the key is absent. `has_element_identifier`, though, accepts a match where `designation` is `None` but `name` is set. For a pattern like `(?P<designation>a)?(?P<name>.*)\.txt` matched against `b.txt`, the check passes but `element_identifiers == [None]`. So the collection crash the commit targets can still happen (verified at the PR head). If the check stays, make `designation` skip `None` values (`self.as_dict.get("designation") or self.as_dict.get("name")`), so the check and the property agree.

### P3 2 — Tests are unit-level only, and the primary-dataset path isn't covered

Both tests drive `find_files` + `populate_collection_elements` directly. The PR says the fix also covers `collect_primary_datasets`, but no test exercises that path. Galaxy already has framework test tools for discovery (`test/functional/tools/multi_output_assign_primary*.xml`, `discover_sort_by.xml`, etc.). A small framework tool with an optional `ext` group, for example one using the `__name_and_ext__` named pattern or the Unzip-style pattern, would cover both the collection and primary paths end to end. It would be a better regression test than the unit test. Optional.

## Non-findings / notes

- The ext fallback treats `""` like `None`. That makes both Unzip tool pattern versions behave the same, and nothing could have relied on an empty extension, so this is fine.
- The PR description says the sibling `visible`/`dbkey` hazards were left out deliberately. Not raised.
