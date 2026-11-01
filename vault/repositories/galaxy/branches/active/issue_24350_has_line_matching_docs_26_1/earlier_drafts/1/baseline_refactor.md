Run via Claude Opus 5.5 at low effort.

No refactoring of the base branch was performed.

The branch (HEAD `5b93f36d565` over `origin/release_26.1`) has no refactoring that could land before the fix. The baseline tests (`f12e7955aec` and its fixups) already come first. The rest of the branch is the docs change itself. The only structural edit is splitting the shared `Expression` annotation in `asserts/text.py` into `Expression` and `LineExpression`. That split exists only so the two parameters can carry different text. A split that kept the text identical would change no generated artifact and leave reviewers nothing to look at, so it does not work as a standalone refactor commit.

The one history change still pending is squashing the four `fixup!` commits (`git rebase --autosquash origin/release_26.1`). That is a polish step, not a baseline refactor, and it needs a force-push, which this run did not do.
