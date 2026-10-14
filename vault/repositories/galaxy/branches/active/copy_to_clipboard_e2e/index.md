# copy_to_clipboard_e2e

Status: `ci_wait`. Base: `release_26.2`.
PR: [#24119 — [26.2] Add browser regression coverage for API key copying](https://github.com/galaxyproject/galaxy/pull/24119), OPEN and draft at `042902f139e62194204c36cd6b404eae4fe2518e` (verified 2026-10-14).

Adds an E2E clipboard abstraction and a browser regression test for #24102 (`CopyToClipboard` did nothing after the Vue 3 migration).

[Implementation debrief](implementation_debrief.md)
- [PR description](pr_description.md)
- [Title options](pr_titles.md)
- [Polish debrief](polish_debrief.md)
- [Independent checklist](polish_checklist.md)
- [Single strengthening round](polish_strengthening.md)

## Decision

PR #24104 merged. John requested polishing this as a follow-up against `dev`; the finished description waits for final human review.

## Polish completed — 2026-10-14

Head: `042902f139e62194204c36cd6b404eae4fe2518e`, rebased cleanly onto upstream dev `8b729ff0050c32573ad0fa999e5e1b4d015dca8c` after prerequisite #24104 merged. Range-diff confirms the single E2E patch is unchanged; pushed to the fork with an exact old-head lease. Independent checklist passed; the single fresh strengthening round found nothing to add. The human-read checklist item remains unchecked.

All three focused browser cases pass under both Playwright and Selenium/Chrome; all five clipboard component tests, Ruff, Black, changed-client Prettier and diff checks pass. New-head fork CI is pending, not claimed green. Worktree is clean. See the linked debrief for scope, reproducibility and limitations. No PR or GitHub comments were posted. Tracking sync is pending because main contains unrelated outgoing commits.

## Release 26.2 draft PR — 2026-10-14

John requested rebasing onto the newly created upstream `release_26.2` and opening a draft PR using his single selected title. Fetched the new base and fork branch. `release_26.2` points to `8b729ff0050c32573ad0fa999e5e1b4d015dca8c`, exactly the already-tested base, so rebase was a no-op: head remains `042902f139e62194204c36cd6b404eae4fe2518e`, one unchanged E2E patch. Range-diff is identical, diff checks pass and worktree remains clean; prior Playwright/Selenium/component validation applies without a source change or force-push.

Opened [draft PR #24119](https://github.com/galaxyproject/galaxy/pull/24119) against `release_26.2` titled **[26.2] Add browser regression coverage for API key copying**. Published prepared description with its target and live CI evidence updated, retaining John's checked human-read item. No mentions or comments added. Draft status was explicitly requested; preserve it until John requests progression.

Fork CI on this SHA remains queued/running. [Release-script run 38538091345](https://github.com/jmchilton/galaxy/actions/runs/38538091345) fails its synthetic release exercise when validating the historical upstream `master` minor version (`VERSION_MINOR = None`); this seven-file clipboard/test diff changes no release code or version metadata. Other observed completed checks: postgres unit and mulled tests pass; Pulsar-package and CWL runs skipped. Moved tracking to `ci_wait`. Tracking commit remains local because unrelated outgoing galaxy-brain commits have not been reviewed for publication.
