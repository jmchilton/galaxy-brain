# issue_23977_datatypes_fanout_26.1

Status: `merged`. Base: `release_26.1`. [PR #23995](https://github.com/galaxyproject/galaxy/pull/23995) (merged).

Shares client datatype requests and avoids fetching them for help terms (#23977).

[Implementation](implementation_debrief.md) · [Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tracking history](tracking_history.md) · [Review: datatype load errors](review_datatypes_errors.md)

mvdbeek's review comment is addressed in `aaf966c2e46`; reply not yet posted.

Sibling [issue_23977_client_api_fanout_26.1](../issue_23977_client_api_fanout_26.1/index.md) merged as [#24141](https://github.com/galaxyproject/galaxy/pull/24141). The branches were split to permit either merge order.

## Merged — TICK 2026-10-11

Live GitHub state confirms [#23995](https://github.com/galaxyproject/galaxy/pull/23995) merged at `2026-10-11T06:44:03Z`. Removed from the queue and archived this record under `merged/`. The clean, fully pushed worktree at the PR head was removed with `ghwt rm`; ghwt found no separate workspace note to archive.

## Problem and resulting behavior

In [#23977](https://github.com/galaxyproject/galaxy/issues/23977), the Workflow Invocations page requested `/api/datatypes?extension_only=false` once per row (62 observed calls), even though invocation-state help comes from bundled YAML. Each row mounted a help term that fetched the full datatype list unnecessarily. Upload datatype and genome loaders cached only completed results, so concurrent callers could each start a request; a failed datatype request could also become an empty list cached for the session.

Merged [PR #23995](https://github.com/galaxyproject/galaxy/pull/23995) makes YAML help terms request no datatypes and shares the promise for actual datatype/genome loads. Rejected promises are forgotten so later callers can retry. Upload now reports its existing “Unable to load upload options” error instead of quietly retaining an empty format list; the provider catches the store's propagated error and ends loading.

Request-count regressions make the distinction concrete: 25 invocation-state help terms go from 25 datatype requests to zero; 10 concurrent datatype help terms go from 10 requests to one; 10 concurrent upload datatype or genome callers likewise share one request per resource. The recorded post-split validation passed 217 files / 1555 tests plus typecheck and pre-commit. Counts are from unit tests, not a fresh rate-limited-server measurement. See the [PR description](pr_description.md), [implementation debrief](implementation_debrief.md), and [datatype error review](review_datatypes_errors.md) for coverage and decisions.

GitHub confirmed on 2026-10-12 that #23995 merged at `2026-10-11T06:44:03Z`. The [sibling](../issue_23977_client_api_fanout_26.1/index.md) handles retry spacing and hidden workflow-count requests. Owned workflow cards' per-card counts remain a separate backend/API follow-up; these repairs do not close all of #23977.

## Related testing example

[PR #23910 — changes](https://github.com/galaxyproject/galaxy/pull/23910/changes) highlights another boundary that simplified mocks can miss: Vue's scoped CSS after popover content moves under `body`. Its regression test compiles the actual SFC styles and checks the computed 420px width cap on the relocated element. It is a separate merged CSS fix, not a datatype-request repair. The [sibling record's detailed highlight](../issue_23977_client_api_fanout_26.1/index.md#highlight-a-regression-test-that-reaches-the-real-css-boundary) explains the defect and the test's limits.
