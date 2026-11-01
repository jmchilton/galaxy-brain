Run via Claude Opus 5.5 at low effort.

No refactoring of the base branch was performed.

The branch (HEAD `c566eeb1d53` over `origin/release_26.1`, 10 commits including 6 `fixup!`s) has nothing that would make a useful refactor commit to land before the change. The baseline tests (`f12e7955aec` and its fixups) already come first. Everything else is either docs (parameter descriptions and docstrings in `text.py`, `xml.py` and `tabular.py`, plus regenerated artifacts) or the behavior fix itself (`^{e}$` to `^(?:{e})$` in `16cfad00004`).

- **The `Expression` split into `TextExpression`/`LineExpression`.** This is the only structural change. A pure-rename commit that kept the old text for both would change no generated artifact and leave reviewers nothing to evaluate. The split exists only so the two parameters can carry different text, so it belongs with the docs commit.
- **No shared helper to extract.** The `^(?:...)$` wrap appears in two adjacent lambdas. Pulling it into a helper ahead of the fix would be churn on a release branch.

History suggestion for polish time. This is not a baseline refactor and was not done, because it needs a force-push. After `git rebase --autosquash origin/release_26.1`, consider moving `16cfad00004` (the grouping fix) ahead of `40db279e2bf` (the docs), giving baseline tests, then the fix, then the docs. The docs commit could then describe the final contract directly instead of first telling users to "group alternatives" by hand and having the next commit retract it (rescope review Low 4). That reorder would conflict in `text.py` and in all 4 generated artifacts. Rewording `40db279e2bf`'s message during the squash is the cheaper alternative.
