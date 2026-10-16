# invocation_object_store_validation

Status: `ci_wait` — draft PR #24197 opened at John's explicit request on 2026-10-16; fork CI pending.

Reject invalid workflow object-store preferences with HTTP 400 before creating a target history; preserve valid single-store and split-store selections.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenge](test_challenges_debrief.md) · [Scope evaluation](scope_evaluation.md)

Independent extraction from [issue_20900_invocation_validation](../issue_20900_invocation_validation/index.md), requested 2026-10-15. Pushed to the fork, reviewed and locally validated. Original CI evidence is historical; see the current polish handoff below.

## Morning refresh — 2026-10-16

Fork head `f862f9f9f4dbb6732834591da053c42ba48afbce` has passing relevant server/API coverage. Python lint fails only isort in unchanged `test/unit/app/tools/test_expression_basics.py`; browser/startup jobs stop at Restore client cache before tests. The fork release-script test rejects historical master VERSION_MINOR = None; this branch changes no release/version code. These failures do not exercise the server-only change. Promoted to `branches_implemented` on diagnosed unrelated reds; browser cache misses are unexecuted tests, not passing browser coverage.

Requested failed-job reruns for diagnosed unrelated failures: [run 38812270827](https://github.com/jmchilton/galaxy/actions/runs/38812270827), [run 38812270878](https://github.com/jmchilton/galaxy/actions/runs/38812270878), [run 38812270805](https://github.com/jmchilton/galaxy/actions/runs/38812270805), [run 38812270720](https://github.com/jmchilton/galaxy/actions/runs/38812270720), [run 38812270932](https://github.com/jmchilton/galaxy/actions/runs/38812270932), [run 38812271028](https://github.com/jmchilton/galaxy/actions/runs/38812271028). All requests accepted; reruns are pending evidence, not passing results or recovered cache coverage.

## Polish — 2026-10-16

Base: `release_26.2` at `579ca73440d776002b7099538cef000838687d8e`. Final published head: `90ef0b0382b6614a1bcea0204300d813baa2091e`.

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Checklist evaluation](checklist_evaluation.md) · [One strengthening review](strengthening_review.md)

Conflict-free pre-polish rebase; every commit patch unchanged. Independent checklist and one strengthening round pass with no design decision or scope expansion. 3 focused API cases pass; formatting/whitespace checks pass. Valid selectable general and mapped split-store integration controls: **2 passed**. The shared virtualenv lacked pytest-xdist after the base refresh; loaded pinned pytest-xdist 3.8.0 and execnet 2.1.2 under /tmp, leaving the shared environment unchanged. Fresh fork CI is pending. Human-read item remains unchecked; no SHA approval/title choice assigned and no PR opened.

## Revised scope — 2026-10-16

Complete early storage-routing validation, including caller-supplied effective outputs. Published head `000233d81ebccaea171682cc5bdeb00b99da8ac4`; [rescope handoff](implementation_rescope_debrief.md). Fresh normal/test/quality reviews completed; the second scope evaluation recommends KEEP. Original polished scope is preserved as `invocation_object_store_validation_alt_original_scope` on the fork. New-head CI is pending; earlier polish/CI and draft PR prose above are historical and require reassessment against this changed head.

## Expanded-head polish — 2026-10-16

Head `000233d81ebccaea171682cc5bdeb00b99da8ac4`, actual base `release_26.2` at `579ca73440d776002b7099538cef000838687d8e`. Fetch/rebase confirmed already current; no code changes or branch push required. Fresh independent checklist passes and exactly one strengthening round returned nothing to add. Human-read stays unchecked. Current [description](pr_description.md), [titles](pr_titles.md), [labels](pr_tags.md), [checklist](checklist_evaluation.md), [strengthening review](strengthening_review.md) and [debrief](polish_debrief.md) supersede the original-scope polish evidence above.

Fresh negative API cases: **6 passed**. Formatting and whitespace checks pass. Vault validation: 0 errors, 15 advisory warnings. Fresh valid-routing integration verification: **8 passed**, covering four controls with normal and extended metadata. Fork CI snapshot: 19 queued, 1 pending, 2 skipped, no failures; API and integration runs are pending, not passing coverage. Recommended kind/bug plus workflow/API/objectstore areas; labeler matches testing/testing-api/workflows paths, while semantic storage/API labels remain central.

Test environment note: run_tests.sh rejected the skill-documented --skip-common-startup flag after startup updated packages in the shared virtualenv; direct pytest is used for fresh verification. No automatic rollback of shared packages was attempted. No PR, comments, reviews or labels were posted.

## Draft PR opened — 2026-10-16

John requested opening a draft PR after polishing ("Looks great!"). Opened [#24197](https://github.com/galaxyproject/galaxy/pull/24197) against `release_26.2` at head `000233d81ebccaea171682cc5bdeb00b99da8ac4`, using the first polished title: `[26.2] Reject invalid invocation storage routing before creating histories`. Used `pr_description.md` verbatim, including John's existing checked human-read item, and applied `kind/bug`, `area/workflows`, `area/API`, `area/objectstore`. No mentions added.

Fork CI on this head remains 19 queued, 1 pending, 2 skipped with no failures observed. Relevant API and integration coverage is still pending. No code changes or rebase needed. **Keep this PR draft as explicitly requested by John; do not automatically undraft on green CI without a later instruction.** Approval is for opening this draft at the recorded SHA; no merge authorization implied.
