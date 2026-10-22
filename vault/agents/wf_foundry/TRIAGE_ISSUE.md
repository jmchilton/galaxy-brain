# Triage a Foundry issue

Label rules live in Foundry, not here: [`content/meta/issue-labels.md`](https://github.com/galaxyproject/foundry/blob/main/content/meta/issue-labels.md)
(on branch `docs/issue-labels` until merged). Read it first.

1. Read the issue and its comments. Check for open PRs or branches that address it.
2. Choose the labels the doc requires: one `roadmap/*`, one `priority/*`, one `agent/*`, plus any blocker. For `roadmap/substep`, find the `roadmap/main` parent.
3. Derive the vault status from the labels per the "Label mapping" in [CLAUDE.md](CLAUDE.md).
4. Create `vault/repositories/foundry/issues/<status>/<number>/index.md` with the proposed labels, parent, and the reason for each.
5. Move the issue's line in [ISSUES.md](ISSUES.md) to the matching section.
6. Apply labels and the parent link on GitHub only with John's OK.
