# Let Planemo committers merge their own PRs

Recommend making self-merging explicit for every committer and removing the blanket approval requirement on `master`. Retain PR visibility, lint and relevant tests, examination of CI results, and agreement on outstanding review concerns. Ask for review where the change warrants it, and wait for that review when requested.

The proposed [diff](https://github.com/galaxyproject/planemo/compare/master...jmchilton:planemo:committer-self-merge) changes only `docs/organization.rst` and `CONTRIBUTING.rst`: 25 insertions and two deletions. It introduces no new roles, waiting periods, or approval forms.

## What the policy actually says

The [current governance](https://github.com/galaxyproject/planemo/blob/5ff07fa8165769f55746dd9281de6d352487aba6/docs/organization.rst) already delegates direct commits and PR merges to committers' discretion. It recommends PRs for larger changes and explicitly favors minimal process while the project is small. That discretion was in the [original 2015 governance document](https://github.com/galaxyproject/planemo/commit/798bd5bfb2d075eaf1ad0ca1748051a91ea41ece). The later file history changes the committer roster and wording, without introducing a second-person approval requirement.

`CONTRIBUTING.rst` describes contribution, lint and testing, but contains no mandatory independent-review or waiting-period rule. `docs/contributing.rst` includes that root file. I found no separate procedure document establishing a stricter merge process.

The live [master protection API](https://api.github.com/repos/galaxyproject/planemo/branches/master/protection), read on 2026-10-26, does require one approving review. Admin enforcement is disabled, so that restriction is not uniform across all trusted developers. Required conversation resolution is enabled. The required status-check context list is empty, although the [CI workflow](https://github.com/galaxyproject/planemo/blob/5ff07fa8165769f55746dd9281de6d352487aba6/.github/workflows/ci.yaml) runs on pushes and PRs. The effective ruleset returned for `master` restricts branch creation, not PR approval.

The available evidence supports clarifying existing governance and relaxing the configured approval requirement. It does not establish when or why that requirement was introduced. Describing this as reverting a documented policy expansion would overstate what I found.

## Evidence for a lighter default

Snapshot: 2026-10-26. The latest 100 PRs by creation date span 2026-03-24 through 2026-10-26. Of those, 63 were merged, including 12 bot-authored PRs. John authored 30 and Marius 13 of the remaining 51 human-authored merged PRs, together 84%. This measures authorship concentration, not reviewer availability or a historical decline in active developers.

A separate complete open-PR query returned 29 open PRs, 24 without the draft flag. Thirteen non-draft PRs had been open at least 30 days. John authored 22 of the 29 open PRs. Non-draft status and age do not establish readiness to merge or time spent waiting solely for approval.

Reproduce the sampling with these read-only queries. Counts will change as PRs are opened, merged, and closed:

```sh
gh api 'repos/galaxyproject/planemo/pulls?state=all&sort=created&direction=desc&per_page=100'
gh api 'repos/galaxyproject/planemo/pulls?state=open&per_page=100'
gh api repos/galaxyproject/planemo/branches/master/protection
gh api repos/galaxyproject/planemo/rules/branches/master
```

The argument is that a universal second-person approval step makes routine maintenance depend on another person's availability, even when the author already has responsibility for maintaining the project. Concentrated authorship makes this dependency worth reconsidering. Allowing self-merges also gives every committer the same documented discretion, instead of relying on admin exceptions.

Independent review still has value. The [review of #1710](https://github.com/galaxyproject/planemo/pull/1710#pullrequestreview-5478932914) identified a change affecting other shed commands, and the [review of #1709](https://github.com/galaxyproject/planemo/pull/1709#pullrequestreview-5478935787) identified a missing Python requirement in the documentation example. These are reasons to retain review by request, seek expertise for broad or disruptive changes, and resolve objections before merging. They also prevent treating every older PR as merely waiting for a rubber stamp.

The tradeoff is that some mistakes another person could have caught will reach `master`. Lint, tests, and author judgment cannot replace every independent review. Committers should remain accountable for regression fixes and reverts. The proposal makes that responsibility explicit.

## Matching GitHub setting

After the proposal is agreed, an administrator should keep **Require a pull request before merging** enabled and disable **Require approvals**, equivalent to changing `required_approving_review_count` from `1` to `0`. GitHub [supports requiring PRs without requiring reviews](https://github.blog/changelog/2021-11-09-require-pull-requests-without-requiring-reviews/). Keep conversation resolution and other existing controls unchanged. A read-back should confirm the zero count, with no additional effective rule requiring approvals.

This is a repository-wide approval-count change. GitHub will also allow any authorized committer to merge an outside contributor's PR without recording a formal approval. The documented policy still requires that committer to review the contribution before merging it. The proposal gives no merge permissions to outside contributors.

No settings have been changed. No upstream PR has been opened. The documentation branch is committed and pushed for discussion. Local `make lint`, warning-free Docutils parsing of both edited files, and `git diff --check` passed. Application tests were not run for this prose-only change. Fork CI was queued at handoff.

## Suggested explanation to committers

I propose making it explicit that any Planemo committer can merge their own PRs once they have checked lint, relevant tests and CI, and resolved outstanding concerns. Our governance already trusts committers to merge at their discretion. The mandatory approval setting adds a dependency on another person's availability for every change, while much of our current maintenance is concentrated among a few authors.

We should continue asking for review for broad or potentially disruptive changes and when another person's expertise would help. When review is requested, we should wait for it, and objections should be resolved before merging. Contributions from people without commit access still need a committer's review. This keeps review available where it adds value while giving trusted maintainers responsibility for moving routine work forward.
