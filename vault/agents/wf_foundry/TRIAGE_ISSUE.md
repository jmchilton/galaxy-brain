# Triage a Foundry issue

Label rules live in Foundry, not here: [`content/meta/issue-labels.md`](https://github.com/galaxyproject/foundry/blob/main/content/meta/issue-labels.md). Read it first from current main (`git -C ~/projects/repositories/foundry fetch -q origin && git -C ~/projects/repositories/foundry show origin/main:content/meta/issue-labels.md`); the local clone's checkout may be on another branch.

1. Read the issue and its comments (`gh issue view N -R galaxyproject/foundry --json title,body,comments,labels`; `--comments` can print nothing). Check for open PRs or branches that address it (`gh pr list -R galaxyproject/foundry --search N --state all`).
2. Check its claims against code where cheap: read `origin/main`, not the checkout. Don't implement.
3. Choose the labels the doc requires: one `roadmap/*`, one `priority/*`, one `agent/*`, plus any blocker.
   - Parent: for `roadmap/substep`, pick one from `gh issue list -R galaxyproject/foundry --label roadmap/main --state open`. If none fits, propose `roadmap/off` and name the closest candidate; don't force a parent.
   - Upstream bugs: before proposing `upstream/*`, check whether the fix already exists on the upstream's release branches and published packages (PyPI/npm), not just dev/master. Released → propose closing with upgrade guidance instead.
   - We maintain Planemo, gxformat2 and gxwf (galaxy-tool-util-ts). A bug there is work we can do: prefer `agent/implement` with the fix aimed at that repo; add `upstream/*` only while waiting on a merge or release.
   - Bugs in repos we don't maintain with no matching `upstream/*` label (e.g. tool wrappers): `roadmap/off` + `agent/human`, and say where it should be filed.
4. Derive the vault status from the proposed labels per the "Label mapping" in [CLAUDE.md](CLAUDE.md). Open questions for John go in the note; they don't change the status.
5. Create the directory and `vault/repositories/foundry/issues/<status>/<number>/index.md`: title, issue link, proposed labels and parent with a reason each, status, findings (what was verified, what wasn't), next. See `issues/queued/678/index.md` for shape.
6. Move the issue's line in [MY_ISSUES.md](../../repositories/foundry/issues/MY_ISSUES.md) to the matching section. In batch runs with subagents, the coordinator does this, not the subagents.
7. Apply labels and the parent link on GitHub only with John's OK.
