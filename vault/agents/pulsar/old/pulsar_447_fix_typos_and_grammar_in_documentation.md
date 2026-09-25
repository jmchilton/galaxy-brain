# PR 447 — Fix typos and grammar in documentation

PR: https://github.com/galaxyproject/pulsar/pull/447

Reviewed head: `79b0084`

Current base at review: `87e487b`

Replacement: https://github.com/galaxyproject/pulsar/pull/495

## Resolution

Superseded by PR 495. The replacement is based on current `master`, preserves
Martin Carrere as commit author and Matthias Bernt as co-author, drops the
unrelated `tox` change, and corrects the malformed links and prose regressions
identified below. Local `tox -e docs` and `git diff --check` both pass.

## Recommendation

**Do not merge the current branch.** It needs a rebase and a focused copy-edit
before maintainer review. GitHub reports it as conflicting (`DIRTY`), and it is
136 commits behind `master`. A local rebase reproduces a content conflict in
`README.rst` on the first commit.

The intent is useful and many individual corrections are good, but the branch
also introduces broken reStructuredText, several new grammar errors, trailing
whitespace, and an unrelated dependency change that the author already agreed
to move to a separate PR. A smaller curated replacement based on current
`master` would be easier and safer than merging this branch as-is.

## Blocking findings

1. **The plugins link is duplicated and malformed.**
   `docs/configure.rst:139-142` contains the same URL target twice, with the
   second copy detached from link text. This came from applying the review
   suggestion without replacing the original target line.

2. **Several edits replace typos with incorrect or degraded prose.** Examples:

   - `README.rst:46`: "a test job runs with" should remain parallel with
     "downloaded" (for example, "a test job run").
   - `docs/containers.rst:48`: "BioContainers containers" is duplicated, and
     the entire sentence has been collapsed into a very long line.
   - `docs/containers.rst:50`, `:71`, `:73`, and `:83` add single-backtick RST
     references (`Pulsar runners`, `Pulsar container`, `MQ`) without defining
     targets. These are product/common terms, not references.
   - `CODE_OF_CONDUCT.rst:83`: commas around "in some ways" are incorrect and
     the plural subtly changes the original meaning.
   - `docs/configure.rst:149`: "location to find a location" remains
     nonsensical, while `:154` still says "will be source" rather than
     "sourced".

3. **The unrelated `tox` dependency is still present.**
   `dev-requirements.txt:25` adds `tox`. Matthias asked for this to be separated,
   and the author replied that they would create a separate PR, but the latest
   head still contains it. Current `master` also does not include this addition.

4. **The branch fails repository hygiene checks.** `git diff --check` reports
   trailing whitespace in `CONTRIBUTING.rst:23` and `:98`.

## Upstream overlap

Current `master` already contains commit `3944c07` ("docs: fix some typos"),
which independently fixes part of this PR: the README spelling mistakes,
`docs/developing.rst`'s "intall", the Kubernetes caption spelling, the public
server "interfere" typo, and several whitespace issues. That overlap causes the
README conflict and means the original 11-file patch no longer represents a
clean set of outstanding corrections.

## Review discussion

The only prior maintainer review was a commented review from Matthias. The
backtick-consistency discussion was answered in follow-up commits, but the
result still leaves new undefined single-backtick references elsewhere in
`docs/containers.rst`. The request to separate `tox` was acknowledged but not
implemented.

## CI and tests

This is documentation-only apart from `dev-requirements.txt`, so dedicated unit
tests are not expected. The old head's docs lint and runtime test matrix passed,
but MyPy failed. Those checks ran on May 8 against the pre-rebase branch and are
not sufficient evidence for current merge readiness; a rebased branch needs a
fresh docs build and standard CI. The malformed link and prose defects above
also show that the passing docs job did not provide semantic copy-edit coverage.

## Suggested path

Start from current `master`, retain only corrections that are still applicable,
drop the `tox` change, preserve the contributor's authorship, and run
`git diff --check` plus the docs build. The remaining patch should be
substantially smaller than the current 87-addition/89-deletion diff.
