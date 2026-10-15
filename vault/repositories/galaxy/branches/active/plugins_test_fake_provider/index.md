# plugins_test_fake_provider

Status: `branches_ready_for_final_review`. Base: `dev`.

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Checklist review](checklist_review.md) · [Strengthening review](strengthening_review.md) · [Implementation debrief](implementation_debrief.md)

Replaces AI mocks and patches in integration tests with local HTTP servers:

- `test/integration/test_plugins.py` (from merged 🔀 #24032): proxy tests run through the real OpenAI SDK against shared `FakeAIProvider` in `app_unittest_utils`.
- `test/integration/test_agents.py`: TRS descriptor served locally, opt-in live tests bypass the static backend, and one real error-analysis agent uses the fake provider.
- Polish fixes: exception-safe provider/TRS shutdown, TRS state isolation, and live chat assertions rejecting API errors and agent fallback responses.

John requested this on 2026-10-11 after disliking the mocks in #24032, then asked for the fake to live in `app_unittest_utils` and for its use in `test_agents.py`. The remaining streaming close spy delegates to the real method; the choice to retain it is left for the human read-through.

## Review and CI evidence

Fresh checklist review plus re-review pass; the published description preserves the supplied human-read checkbox state. One description-strengthening round completed, with its coverage clarification applied. Deterministic integration tests: 40 passed, 6 skipped. Cleanup fault controls: 4 passed after reproducing 4 failures. Unreachable-provider control: all five inference tests fail, history-only passes. Lint/format pass; targeted helper typing passes with imported-module diagnostics suppressed. Full local import-following mypy reports errors only in unchanged imports; see the debrief for limits.

[Integration CI](https://github.com/jmchilton/galaxy/actions/runs/38152628142) and [Python lint CI](https://github.com/jmchilton/galaxy/actions/runs/38152628131) were queued/pending on the polished SHA when queried. No failed checks were reported. Old-head CI had no failures when polish began. The branch is pushed and its worktree is clean.

## Draft publication — 2026-10-11

John explicitly requested a draft PR titled **Exercise plugin and agent integration tests through real HTTP**. Publication was authorized for `688840f83b60d812c2a958f07a3b313908bfd269` as a draft; this does not authorize taking it out of draft. The prepared `pr_description.md` was published verbatim, including its supplied checkbox state. No branch code changed or rebase was needed: the actual base is still `3347e84bc5e9`.

Verified [#24051](https://github.com/galaxyproject/galaxy/pull/24051) is open, draft, mergeable, targets `dev`, has the requested title and the exact prepared body, and uses the authorized head. Fork CI has no failures but remains queued/running; upstream PR CI has started with no failures reported. Moved the queue entry to `ci_wait`.

## TICK — 2026-10-12

All upstream checks have settled. Integration shards 0 and 1 fail in this branch’s changed tests: `test_plugin_specific_config_used` and `TestAgentsApiFakeProvider::test_error_analysis_endpoint` trigger aiocop high-severity blocking-I/O assertions (os.stat while requests run through the real SDK/agent). [Failed run](https://github.com/galaxyproject/galaxy/actions/runs/38153953198). These are relevant failures, not diagnosed infrastructure reds. Keep draft and move to author work. The explicit draft-publication instruction also withholds undraft authorization; no implementation fix or undraft inferred.

## Implementation fix — 2026-10-12

John requested diagnosis and repair of the implementation behind #24051's CI failures. Confirmed the tests exposed production blocking I/O rather than a fake-provider defect: plugin requests lazily imported OpenAI chat resources on the event loop; agent construction read model-capability YAML and prompts, initialized provider clients, and loaded model metadata there.

Pushed `cc3fe81fbc50a216cb4c1b3e9859f791526728e0` to `jmchilton/plugins_test_fake_provider`. Plugin SDK construction and chat-resource resolution now run through AnyIO workers. Agent construction, including the fallback router and nested router/tool/orchestrator handoffs, also runs in workers; async inference stays on the serving loop. Existing tests and assertions are unchanged. No rebase or force-push was needed.

Verification used the shared Galaxy Python 3.13 environment with `GALAXY_TEST_AIOCOP=1` and backend-test skill defaults. Before the fix: **1 failed, 39 passed, 6 skipped** across the plugin/agent integration suites; the real error-analysis endpoint reproduced the capability/prompt/import blocking violation. The plugin CI failure was confirmed in upstream logs; it did not reproduce in the local combined run (SDK imports were already warm). After the fix, running the real error-analysis provider test first plus all plugin tests in a fresh process: **23 passed**. Agent unit suite: **135 passed, 15 skipped**. Pinned ruff, black, flake8 and commit hooks pass; diff check passes. Local logs: `/private/tmp/pr24051-before.log`, `/private/tmp/pr24051-after.log`, `/private/tmp/pr24051-unit.log`; HTML: `/private/tmp/pr24051-after.html`.

Verified the PR has the new head and remains draft. [New upstream integration CI](https://github.com/galaxyproject/galaxy/actions/runs/38330158506) and [fork Python lint CI](https://github.com/jmchilton/galaxy/actions/runs/38330154618) are queued. Moved back to `ci_wait`; the earlier explicit instruction withholding undraft authorization remains in force. The description now records the production initialization fix and its validation.

Tracking sync is pending: repository-wide `make validate` fails on the pre-existing untracked `vault/reviews/Untitled.md` (missing frontmatter). The vault instructions make validation errors a commit blocker. No unrelated file was changed or staged; these tracking/description edits remain local, and the prior human-read checkbox edit is preserved. Galaxy code and the GitHub PR description are already published.

## GOOD_MORNING — 2026-10-13

Current head `cc3fe81fbc50` has settled upstream CI: Integration passes, including the repaired fake-provider tests; no relevant failures remain. Package collection alone fails importing removed `pulsar.client.build_client_manager`, outside this change. Classified draft-ready; retain the explicit instruction withholding undraft authorization.

## GOOD_MORNING — 2026-10-13

Requested failed-job reruns for diagnosed unrelated failures: [run 38330158218](https://github.com/galaxyproject/galaxy/actions/runs/38330158218). All requests accepted; reruns are pending, not passing coverage.

## TICK — 2026-10-13 evening

GitHub now reports OPEN, non-draft and mergeable at `cc3fe81fbc50`; this TICK did not change draft status. Relevant Integration coverage passes. The only failed workflow is the previously diagnosed unrelated Pulsar package-import failure. Reclassified to `ready`.

## TICK — 2026-10-14

Live PR #24051 conflicts with dev in api/plugins.py and test_plugins.py. Upstream adds configurable inference settings and new mocked tests; reconciling them with the real-provider tests requires behavioral adaptation beyond a mechanical rebase. Left branch intact and moved to attention. Remaining package-import reds are the recorded unrelated Pulsar failure.

## Requested rebase and repair — 2026-10-14

[Rebase/repair evidence](rebase_2026-10-14.md). Pushed `bb84aeee05a345d00219d5688d5a9349491b3aa2` to the jmchilton fork after successful targeted validation. Status: `branches_ready_for_final_review`; new-head CI pending. Conflicted rebase requires fresh review of the adapted inference tests.
