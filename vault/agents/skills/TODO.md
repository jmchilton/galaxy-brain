# TODO

## Publish worktree-linked skills to galaxy-skills

These are symlinked into `~/.claude/skills` from worktree branches, so other
machines can't get them. Land each in galaxy-skills (`~/projects/repositories/galaxy-skills`), switch the
symlink (or install) to the maintained source, add it to `inventory.yml`
`environments:`, then sync remotes.

- [ ] `project-review` — `~/projects/worktrees/galaxy-skills/branch/project_review/project-review`
- [ ] `tool-install-yaml` — `~/projects/worktrees/galaxy-skills/branch/tools_yaml/tool-install-yaml`
- [ ] `gxwf-cli` — `~/projects/worktrees/galaxy-tool-util/branch/skills/docs/skills/gxwf-cli` (currently in galaxy-tool-util; decide if it moves or stays)
