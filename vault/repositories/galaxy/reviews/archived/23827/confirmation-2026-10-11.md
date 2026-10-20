# Independent confirmation — 2026-10-11

PR: [galaxyproject/galaxy#23827](https://github.com/galaxyproject/galaxy/pull/23827). Reviewed HEAD: `f6278fb4e50a4289def49b73d29a77745883afb4`. A different subagent independently traced and tested both initial findings at John's request. **Both P2 findings are confirmed; request changes remains appropriate.** No GitHub comment or review submitted.

## Discarded-data policy

The new asynchronous endpoint accepts `CreateHistoryContentFromStore`, inheriting `StoreContentSource.discarded_data` and its documented `ALLOW` default. It builds `ImportModelStoreTaskRequest` without this option, and that schema has no field for it. `ModelStoreManager.import_model_store()` therefore constructs `ImportOptions` with the existing `FORBID` default. The synchronous sibling converts and forwards the payload's selected policy.

This is a contract mismatch in the newly exposed endpoint. The pre-existing background task's default is not itself introduced by this PR, but accepting the public payload promises its policy semantics. The current upload UI explicitly sends `forbid`, so the finding concerns other valid requests and the documented default. Converting to `ImportDiscardedDataType` matters: the importer's `FORCE` branch uses enum identity rather than accepting any equal string.

The independent regression exported real archives over HTTP and imported each through both actual endpoints, including Celery dispatch and task completion. It exercised all four policies (omitted/default, `allow`, `forbid`, `force`) both with and without bytes. It asserted one HDA per import, expected state/deleted/visible values, and content equality for every `ok` HDA. Results on unchanged HEAD:

| Archive | Policy | Synchronous | Asynchronous | Result |
| --- | --- | --- | --- | --- |
| No bytes | omitted/default | discarded, not deleted | discarded, deleted | mismatch |
| No bytes | allow | discarded, not deleted | discarded, deleted | mismatch |
| No bytes | forbid | discarded, deleted | discarded, deleted | control agrees |
| No bytes | force | discarded, not deleted | discarded, deleted | mismatch |
| With bytes | omitted/default | ok, not deleted | ok, not deleted | control agrees |
| With bytes | allow | ok, not deleted | ok, not deleted | control agrees |
| With bytes | forbid | ok, not deleted | ok, not deleted | control agrees |
| With bytes | force | discarded, not deleted | ok, not deleted | mismatch |

The correct-behavior regression fails with these four mismatches on HEAD (44.45 seconds). In an isolated temporary source copy, adding the task field, forwarding the payload value, and converting it in the worker makes the identical eight-combination regression pass (36.63 seconds). The control preserves `FORBID` as the task schema's default for pre-existing callers; the new API explicitly forwards its own payload's `ALLOW` default.

## Failed export after closing the dialog

Closing changes the store's item to `null`; the watcher stops the Celery monitor and clears the displayed storage ID. Stopping invalidates the monitor's request ID, drops replies from outstanding requests, and prevents further polling. It does not cancel the server task. The prepared-export map retains the Celery ID in component memory for reopening, but the persisted Recent Exports record contains only the storage ID, and its monitor/card selects `useShortTermStorageMonitor`. A fresh card cannot recover the Celery outcome from that record.

On the server, `storage_context` catches an export exception, writes cancellation information, finalizes the storage, and re-raises. `is_ready` checks only finalization. The download endpoint separately checks cancelled serve information and raises the stored exception. Thus a failed export legitimately returns readiness `true` while downloading it raises an error. Seven existing actual storage tests passed, including the arbitrary-exception cancellation case (1.34 seconds).

The independent UI regression strengthens the original diagnostic: it fully resolves a `PENDING` task response before closing, then changes the task to `FAILURE` afterward. There is no FAILURE response already in flight at close. After one polling interval, only the initial task request has occurred. A fresh **actual `DownloadItemCard`**, using the real persistent progress and storage monitors, checks storage readiness and displays `Ready`, `Copy Link`, and `Download`, with no failed state. The persisted record has `taskStatus: READY` and no Celery `task1` ID. The correct-behavior assertion fails; all seven original dialog tests pass (16.14 seconds total including cold transformation).

An isolated control creates a separate outcome monitor keyed to each export, independent of the currently displayed item. That exact regression and all seven original tests then pass (8 passed, 6.52 seconds). This is evidence for the lifetime fix, not a production-ready proposal: the control still disposes its monitors when the page component unmounts and does not preserve Celery IDs across page reload. A durable implementation should either retain both IDs and select the actual task monitor in Recent Exports, or otherwise keep reliable outcome tracking independent of the dialog. Include closing/switching before failure and page-navigation/reload behavior as appropriate.

## Reproduction and validation scope

- [Evidence](confirmation-evidence.txt)
- [Independent backend probe](confirmation-options-probe.py) and [runner](confirmation-options-runner.py): run the runner from the exact-HEAD Galaxy root with `PYTHONPATH=lib`, the existing read-only Galaxy virtualenv, standard backend-test flags, and local test-server permissions.
- [Independent real-dialog/card regression patch](confirmation-client-probe.patch): apply only to a temporary exact-HEAD client copy, install locked dependencies, then run `NODE_OPTIONS=--no-experimental-webstorage pnpm exec vitest run src/components/History/Content/ExportToAnotherGalaxyDialog.test.ts`. The added test asserts desired behavior and should fail on the unchanged PR.
- [Temporary source controls](confirmation-controls.patch): backend and client controls used only for the unchanged regression's green runs. They are review evidence, not applied changes or a complete implementation.
- [One confirmed comment for John to post](confirmed-comment.md)

Backend skill: `jmchilton:galaxy-backend-tests`; Conda auto-init disabled and beta feature flags enabled. Python 3.13.12. API tests required local-port escalation. Client copy used pnpm 10.26.1, Vitest 4.1.11, and the PR's exact lockfile; native Node localStorage disabled to use the test DOM. Client server responses are controlled mocks, with server failure semantics independently verified through real storage tests and code; this was not a full browser test against a failing Celery export or two separate Galaxy installations.

The first independent backend runner had an isolated collection import error, corrected before the reported runs. An initial offline client install lacked one tarball; installing the unchanged lockfile in the temporary copy succeeded. The storage suite exited successfully but its sandbox-restricted atexit process enumerator logged a permission error after all seven tests passed. No Galaxy source or shared virtualenv edits; original worktree remained clean. Final live GitHub check: same HEAD, open and non-draft, 56 successful checks and two skips, no comments/reviews.

## Risks

The findings affect the new API's persisted import semantics and the reliability of export completion status; a code rollback does not repair incorrectly deleted or unnecessarily materialized imported HDAs.

<details><summary>Risk Details</summary>

- Preserve the existing background task's default for older callers when adding the new policy field, while forwarding the new endpoint's payload default explicitly.
- A correct non-default import requires enum conversion after task serialization; a field alone is insufficient.
- A dialog-local lifetime fix covers closing the modal but may leave navigation/reload failures. Keep task outcome and download storage identifiers available to whichever component performs durable monitoring.
- The control tests cover a dataset and normal HTTP source. Collections, expired task results, concurrent exports, and page reload are additional implementation considerations rather than independently demonstrated blockers.

</details>

<details><summary>Risk Review Advice</summary>

The existing integration infrastructure makes a clean async policy regression feasible without introducing a new server setup. Extend the real archived round-trip test for the payload contract, and retain the actual dialog/card lifecycle test for failures after close. Human review should consider whether the chosen outcome tracking survives page navigation, not only modal dismissal.

</details>
