Shelve the current work until a blocker clears, as a blocker directory per [BLOCKERS.md](BLOCKERS.md). AGENT_DIRECTORY is the directory you're running in, or the agent dir you were told to shelve to; write the follow-up for an agent there.

1. Work out the blocker from what John gave you and the session's context. If none was given and it isn't clear, ask.
2. Pick a short snake_case name, unique under `AGENT_DIRECTORY/blockers/`.
3. Write `previous_session.md`: what was being done, where it stands (branches, worktrees, commits, open questions) and what comes next. In a fresh session started on a record, summarize the record's current state instead. Keep sensitive findings out, per [SECURITY_REPORTS.md](SECURITY_REPORTS.md).
4. Write `condition.md`, `follow_up.md` and `index.md`. Make the follow-up prompt self-contained: name the record directory, branch or PR. Write `agent_profile.md` only when the follow-up needs a profile other than the default.
5. If there is a record, set `blocker: <agent_dir>/<short_name>` in its `index.md` frontmatter (adding frontmatter if it has none), per [BLOCKERS.md](BLOCKERS.md).
6. Report the blocker's path and condition.
