Run via Claude Sonnet 5.5 at medium effort.

- [x] What does the user see when it fails? Nothing new at the UI: unknown `dependency_resolution` still raises the same "Unknown dependency_resolution value encountered ..." job failure; a non-opted-in container job simply skips host-side resolution (debug log "Ignoring dependency_resolution ...").
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Parametrized table on `effective_dependency_resolution` covers inputs/outputs (host vs. container, opt-in, none/local/remote, invalid value), and the Docker integration test asserts a real observable (env.sh marker not sourced for container job, sourced for host-job control).
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `b5e6b197eda` extracts `requires_dependency_resolution` + `MockContainer` behavior-neutrally ahead of the fix.
- [x] Are the comments free of excess archeology? Yes. The stale "One could imagine also allowing dependencies inside of the container..." comment was dropped; remaining comments are one-line what/why.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
