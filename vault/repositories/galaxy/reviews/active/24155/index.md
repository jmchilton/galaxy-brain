# PR #24155 — Let optional inputs consume filtered-out tool outputs

- PR: https://github.com/galaxyproject/galaxy/pull/24155
- Review date: 2026-10-15
- Reviewed head: `3b3d4b13e09bfe048391e562268b433a4f56f5ec`
- Status: review in progress; **UNPOSTED**.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24155`

The change treats an absent, declared, filtered tool output as an unconnected optional input and removes missing members from multiple data inputs. Focused workflow API validation is underway. Review covers required-input failure boundaries, tool-default replacement, built-in pick behavior, collection mapping, and sibling workflow paths.

CI workflow/API/framework/unit jobs passed. The failed package checks report an unchanged `ssh_util.py` mypy issue; installed startup fails building `packages/meta` (`egg_base` points to missing `src`); integration failures are in explicit Singularity container resolution.
