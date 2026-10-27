# Normal review

Addressed cleanup subprocesses escaping escalation, removed a process-exit assertion race, and preserved a base-compatible red test.

No recommendations were deferred.

<details><summary>Full review</summary>

P2: EXIT cleanup can start a child after the initial process snapshot. Refresh descendants of surviving captured processes before SIGKILL. Reproduced with a TERM-ignoring cleanup child; added a failing test, then fixed it.

The red test must fail at the missing cleanup marker rather than the newly introduced grace-period argument. The psutil cleanup test now uses the original API and fails at the marker assertion on master.

Avoid separate is_running/status calls without handling NoSuchProcess. The bounded assertion now handles disappearance and zombies.

Windows terminate semantics remain forceful. Per-process disappearance no longer aborts cancellation of remaining processes.

</details>
