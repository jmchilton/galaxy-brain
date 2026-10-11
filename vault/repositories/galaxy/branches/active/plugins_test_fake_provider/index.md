# plugins_test_fake_provider

Status: `branches_ready_for_final_review`. Base: `dev` (`3347e84bc5e9`). Head: `688840f83b60d812c2a958f07a3b313908bfd269` on `jmchilton/plugins_test_fake_provider` (4 commits). No PR; no final approval recorded. Polished 2026-10-11; new-head fork CI queued/pending.

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Checklist review](checklist_review.md) · [Strengthening review](strengthening_review.md) · [Implementation debrief](implementation_debrief.md)

Replaces AI mocks and patches in integration tests with local HTTP servers:

- `test/integration/test_plugins.py` (from merged 🔀 #24032): proxy tests run through the real OpenAI SDK against shared `FakeAIProvider` in `app_unittest_utils`.
- `test/integration/test_agents.py`: TRS descriptor served locally, opt-in live tests bypass the static backend, and one real error-analysis agent uses the fake provider.
- Polish fixes: exception-safe provider/TRS shutdown, TRS state isolation, and live chat assertions rejecting API errors and agent fallback responses.

John requested this on 2026-10-11 after disliking the mocks in #24032, then asked for the fake to live in `app_unittest_utils` and for its use in `test_agents.py`. The remaining streaming close spy delegates to the real method; the choice to retain it is left for the human read-through.

## Review and CI evidence

Fresh checklist review plus re-review pass; the human-read item remains unchecked. One description-strengthening round completed, with its coverage clarification applied. Deterministic integration tests: 40 passed, 6 skipped. Cleanup fault controls: 4 passed after reproducing 4 failures. Unreachable-provider control: all five inference tests fail, history-only passes. Lint/format pass; targeted helper typing passes with imported-module diagnostics suppressed. Full local import-following mypy reports errors only in unchanged imports; see the debrief for limits.

[Integration CI](https://github.com/jmchilton/galaxy/actions/runs/38152628142) and [Python lint CI](https://github.com/jmchilton/galaxy/actions/runs/38152628131) were queued/pending on the polished SHA when queried. No failed checks were reported. Old-head CI had no failures when polish began. The branch is pushed and its worktree is clean.
