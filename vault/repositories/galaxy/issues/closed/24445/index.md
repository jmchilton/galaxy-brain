# #24445 Interactive Tools panel drops a second interactive tool

Closed 2026-10-27 (completed) by davelopez; fixed by merged PR #24467 (keep new entry points in store, 25.1).

https://github.com/galaxyproject/galaxy/issues/24445. Filed 2026-10-24, assigned jmchilton.

- [raw.md](raw.md): original draft (fix and test commits)
- [proposal.md](proposal.md): the posted text
- [debrief.md](debrief.md): research and review

Fix on `jmchilton/galaxy_ui_driver`: `5e84f0ebadb` "Show a newly started interactive tool when others are already active". Extract it together with `4b54438b1c2`, which the Selenium test needs. Find both by subject.

Next: extract onto the oldest supported release branch (release_25.0 has the bug) and open a PR.
