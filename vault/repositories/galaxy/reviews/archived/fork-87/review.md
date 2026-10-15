# Review of jmchilton/galaxy #87 — 2026-10-13

[Review fixes for #24055 collection type picker](https://github.com/jmchilton/galaxy/pull/87), authored by mvdbeek, targets `issue_19049_collection_type_picker` (upstream [#24055](https://github.com/galaxyproject/galaxy/pull/24055)).

Reviewed head: `216bc728e6c931665589d11d00b0d1a340c8efbb`.
Reviewed base: `d37a9e903038064bbc1ed9eb2830ef013150a48d`.

Recommendation: **merge the reviewed head into the named feature branch**. No blocking findings across the eight commits. This recommendation does not approve merging upstream #24055, and any head change requires a fresh review.

## Code assessment

- Workbook card layout: restores the existing 2 + 3 card arrangement, with shared `CollectionTypeCards`, the same selection event and value in both rows. Added test inspects actual rendered grids and existing tests cover each selection.
- Selenium selector: searching for the complete `(type)` suffix avoids bare `list` or `paired` matching other labels first. Independently evaluated actual `rankSearchIndex` against the YAML registry: all 12 types return exactly their own option. `None` and custom remain separate paths; no broadening of helper behavior.
- Empty custom input: tracks edits separately from validation. Untouched empty input retains its validation alert (so parent forms can disable submission) while avoiding premature invalid styling. Invalid saved values still render invalid. Existing alert clearing, unmount, undo/redo, explicit null, and typed listed-value tests remain intact.
- Blank custom text and Tool Shed names: whitespace fails the shared control's empty check; ordinary nonblank text keeps its original value. Tool Shed alone trims a new section label at request construction, consistent with its existing case-insensitive trimmed lookup for existing sections. Integration-style component tests assert both the outgoing request and disabled submission; assertions were added, not weakened.
- Unlisted empty saved values: non-null empty strings become editable custom text with an alert; explicit null still means an optional unset selection. Workflow collection-type control already normalizes legacy empty strings to null.
- Reactive options: replacing the option list with one that removes the selected non-null value moves the preserved value to text mode without emitting. Previously custom text stays custom if an option later includes it, matching typing-through-listed-value behavior. Current callers derive replacement arrays rather than mutating a supplied array in place; the shallow options watcher is sufficient for these paths.
- Sample-sheet workflow notes: independently compared the four sample-sheet descriptions with `CollectionTypeDescription.accepts`. Plain lists cannot feed these inputs; mixed sample sheets accept plain, paired and mixed sample sheets. The listed corresponding plain-list destinations all accept the sample-sheet types. Existing shared registry and context-specific description abstraction are reused.
- Simplification: section alias removes prop shadowing, selection resolves directly to the indexed option, and all registry short labels are lowercase already. No behavior change found in these cleanups.

## Validation

- Exact-head Vitest: **61 files, 370 tests pass** across `Form/`, `Collections/`, `Workflow/Editor/Forms/`, `Toolshed/`, and `History/Content/Collection/`. Command: `NODE_OPTIONS=--no-experimental-webstorage node_modules/.bin/vitest run src/components/Form/ src/components/Collections/ src/components/Workflow/Editor/Forms/ src/components/Toolshed/ src/components/History/Content/Collection/ --maxWorkers=2`.
- Additional focused run: **6 files, 78 tests pass**, including collection-type compatibility tests.
- Independent actual-code checks: 12/12 unique selector matches and sample-sheet acceptance matrix verified.
- Changed-file ESLint: 0 errors, 2 pre-existing undeclared-emits warnings in `InstallationSettings.vue`.
- `git diff --check` passes.
- Full typecheck reports three implicit-any errors in unchanged `HistoryCardList.vue`, `StatelessTags.vue`, and `WorkflowCardList.vue`. An isolated exact-base checkout with the same dependencies reports the identical three errors; no new typecheck regression.

The isolated checkout used the existing feature-branch dependency installation through local symlinks. The workspace UI/API packages are unchanged from the reviewed base. Initial broader runs without the Node flag failed because Node 25's experimental global localStorage shadows happy-dom's implementation (`window.localStorage.getItem is not a function`); using the Node flag resolves this environment problem and the entire selected suite passes. No test or application source was changed to obtain the pass.

## Current-head CI failures

All failures inspected from the current-head merge-ref CI logs; unrelated classification is based on the observed failure and changed paths, not merely a red job name.

| Check | Evidence | Assessment |
| --- | --- | --- |
| [Client Unit Testing](https://github.com/jmchilton/galaxy/actions/runs/38370888681) | 559 files passed, 3 assertions failed in unchanged GPopover/focusOrder tests about hidden controls | Unrelated to this diff. All changed feature suites pass locally. |
| [Galaxy package tests, Python 3.10 and 3.14](https://github.com/jmchilton/galaxy/actions/runs/38370888737) | Test collection fails importing removed `social_core.exceptions.AuthMissingParameter`; subsequent circular Celery import errors cascade from collection | Unrelated dependency/package-import failure. PR Python change is restricted to two browser helper methods. |
| [Integration, shard 2](https://github.com/jmchilton/galaxy/actions/runs/38370888666/job/115207506410) | Launchpad connection timeout while adding Apptainer PPA before tests start | Infrastructure failure, no change exercised. |
| [Integration, shard 3](https://github.com/jmchilton/galaxy/actions/runs/38370888666/job/115207506271) | Missing cached bwa image; underlying Apptainer pull fails with Quay TLS internal error (357 tests passed) | External container download failure. |
| [Playwright, shard 1](https://github.com/jmchilton/galaxy/actions/runs/38370889207/job/115213085174) | `test_expanded_execution_of_simple_workflow` times out waiting for hid=2 state ok after submitting a flat-dataset concatenation workflow | No collection-type helper or changed settings path invoked. Treat as unrelated workflow completion timeout; exact environmental cause was not reproduced. |

Other current-head checks include green Python/client lint, browser-build jobs, Selenium shards, API/unit/workflow-framework checks. No local full server/browser run was performed. The selector is checked against the real ranking algorithm; live browser validation remains covered only by the available CI evidence.

## Follow-up

No required code follow-up for this fork PR. Retry the unrelated failed jobs as appropriate; do not change assertions or rebase merely to hide their failures. Upstream #24055's review work remains separate.
