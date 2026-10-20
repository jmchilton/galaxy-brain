# Independent rebase review — 2026-10-20

Scope: `vitest_readability`, old cleaned head `e06bbc4c70271aacfe27a88e315c882b5270ecaa`, old base `5ff1e46b8c38c704be8da75b4db05b3d56f93f3d`, new dev `1e6125acd93b22a682043509e9549b124546fd25`.

Reviewed the 22 conflict paths and all seven automatically merged overlapping paths against both the old readability tree and new dev. All 401 readability paths untouched by upstream have identical Git blob IDs in the replay. No production files or extra diff paths were introduced. The two disappeared diff paths are FormBoolean/FormCheck: dev already contains their controlled rendering fixes. No new skipped, pending, or exclusive tests were added.

Three blocking automatic-merge defects were found and reported immediately:

1. DownloadItemCard's new export navigation and finished-elsewhere cases still referenced deleted baseMonitoringData/updateProgressMonitor fixtures and the former mount signature. Preserve both dataset/collection destinations and status refresh assertions while adapting to the current mount helper.
2. CollectionDescription's new sample-sheet/mixed-list/record/hover cases still referenced deleted shared wrapper/defaultTestHDCA fixtures. Give each scenario its own wrapper and retain every expected description/tooltip.
3. FormElement's new radio group label scenario still referenced the removed shared wrapper. Mount a wrapper locally, retaining title association and removal assertions.

The other automatic merges are coherent: CommandPalette keeps its fake-clock debounce behavior; GroupForm keeps the create-role checkbox request; workflowStepStore keeps conditional port rules; workflowStore keeps concurrent instance lookup, failure propagation, and retry tests.

Conflict families retain current dev behavior: transient errors stay hidden until retry exhaustion, pending backoff remains loading, history IDs consistently match fixtures, dataset collection summary/detail caching is split correctly, optional input switch labels and controlled rerenders remain checked, GAlert live-region injection remains covered, Tool Shed requested-revision README checks remain explicit, admin extension links remain covered, and quota spinners use the owned testing Pinia. Graph setup uses a complete invocation fixture and consistently matching parameter workflow-step IDs. Lint composables execute in a disposed test effect scope.

All three findings were repaired and independently rechecked in isolated validation snapshot `e577538ef1d01ae7bd55fe6dffb9a6298de08898`. DownloadItemCard retains both exact destinations and status refresh count/options; CollectionDescription retains every description and both hover titles with an owned wrapper; FormElement retains exact title association and removal. Static review has no remaining blockers, conditional on final runtime/style/type gates and final tree equality to this snapshot. This document does not claim a runtime test run by the reviewer. Root owns history and test execution to avoid mutation during gates.

## Runtime follow-up

The root-run client gate found an additional fixture integration defect missed by the first static review: retrying-invocation was absent from the new per-test dictionaries, whereas upstream explicitly supplied null. `isWorkflowInvocationElementView` rejects only null before evaluating `"steps" in item`; undefined therefore throws. The independently inspected repair seeds both invocation and job-summary dictionaries with explicit null, preserving the original info-role, loading-message, and absence-of-not-found assertions. This restores the upstream fixture contract; it does not weaken the test.

The client type check also found that a generic VueWrapper erased the CollectionDescription hdca prop type. The helper now accepts ReturnType<typeof mountDescription> and drops the unused VueWrapper import; all expected description/hover strings are unchanged. Both corrections were independently verified in the isolated validation checkout whose root-recorded index tree is `f4100858e1a6bca096e3db2bdef4fb632b758229`. Final full-client validation and main-branch tree identity remain root-owned gates. The initial full-client run was superseded after its known fixture failure and is not passing evidence. Root reported Tool Shed 27 files / 183 tests and its type check passed before these client-only changes.

## Final independent history proof

Read-only Git verification confirms final normalized HEAD `a44424a53a97d380801088269c96b5f7c15abbf4`, tree `f4100858e1a6bca096e3db2bdef4fb632b758229`, with new dev `1e6125acd93b22a682043509e9549b124546fd25` an ancestor and a clean main worktree. Exactly 418 commits remain. All 418 complete message bodies, including trailers, are byte-identical to the old cleaned branch range and the original start manifest (accounting for the display newline added by Git format output). The final two controlled-checkbox commits are explicitly empty because dev already contains their patches. The backup ref still points exactly to `e06bbc4c70271aacfe27a88e315c882b5270ecaa`.

Root reports full client and Tool Shed type checks passed, the final two repaired client suites passed 28 tests, and Tool Shed passed 27 files / 183 tests. Final full-client unit and last two-file style gates are still root-owned and pending at this review update. Static review and scoped test challenge have no remaining blockers; publication requires those runtime gates.

## Late dev update and second rebase

The first-stage candidate was published after the root-run full client gate passed 641 files / 5661 tests, with one skipped test, and style/type gates passed. Dev advanced during validation to `93b3c85e5320048b33bcc78f6f7767e06813f7e0`, introducing the GFormInput migration. Root performed a second incremental rebase.

Independent review identified exactly two overlapping readability tests: DatasetCopy and InteractiveTools. The incoming DatasetCopy test used the old setupBase helper; it now uses serveHistories/mountDatasetCopy, explicit source and target selection, and the named new-history input. It preserves the g-form-input assertion and clearing behavior and additionally proves the target checkbox was checked before typing. The incoming InteractiveTools search case referenced the removed outer wrapper; it now owns an awaited mountTools wrapper and uses nth for the fixture, retaining the migrated-input class and filtering assertions. Both repairs were independently inspected in the final candidate. No extra selector defects were found among existing collection/upload consumers. Input modelValue/event compatibility, keyboard listener fallthrough, and focus behavior are covered by the incoming component tests; full client/types are the integration gates.

Read-only final proof confirms HEAD `1358d37887996e552e0fac6467c8738865618d9a`, tree `78ba2e31ca358304cd262e32abb6ca468fa4233c`, new dev `93b3c85e5320048b33bcc78f6f7767e06813f7e0` as ancestor, and a clean worktree. All 418 complete original commit bodies/trailers remain identical to the start manifest. All 426 branch paths outside the two late overlaps remain byte-identical to first published head a44424a53a97. No extra branch diff paths were introduced. Static review is clear; final client and Tool Shed runtime/type/style gates are root-owned and still running at this update. Publication must lease against first published head `a44424a53a97d380801088269c96b5f7c15abbf4`.

## Root final validation and publication

Client 646 files / 5,682 tests pass; one test skipped; Tool Shed 27 files / 183 tests; both full frontend type checks, adapted-file lint/format and whitespace/hooks pass. Published `1358d37887996e552e0fac6467c8738865618d9a` with exact preceding published-head lease; GitHub confirms `MERGEABLE`, draft retained. Final tree `78ba2e31ca358304cd262e32abb6ca468fa4233c` equals the independently checked branch tree. No remaining findings; CI pending.
