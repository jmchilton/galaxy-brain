jest_tests.yml lists the tests to review. Each entry has a file and a count of its reviews as a selected originator: `iterated: 1` after the first, and so on.

Pick N (default to 1) tests from jest_tests.yml that haven't been iterated on by this process or already changed by a later lane (`storified`, `storybook_play` or `real_api_calls` set to `true`) - and have subagents review the selected tests against the best practices in client/README.md#client-side-unit-testing and try to:
- Make sure the tests match best practices.
- Make the tests more readable.
- Reuse existing abstractions where they improve readability; identify concrete consumers before proposing new shared abstractions.
- Follow useful shared abstractions into concrete consumers and implement them across tests where they improve readability; the selected tests are starting points, not a file limit. Keep supporting edits focused on the abstraction and validate all affected suites. Don't edit tests that a later lane in [PIPELINE_BRANCHES.md](PIPELINE_BRANCHES.md) has already changed.
- Report back changes to the best practices they would like to see.
- Ask agents to identify what existing guidance misses and provide evidence. A successful iteration needn’t add anything to the README.

Follow through on concrete reuse opportunities from earlier iterations as part of the loop.

The driver agent should collect the advice and decide how to act on it - not all advice should be incorporated back. We've spent a good amount of effort on developing the best practices.
- Assume frontier models are being used and basic test structuring advice isn't needed.
- Advice reads well for humans and agents.
- Marginal advice we want to capture advice about can go in ./MARGINAL_ADVICE.md
	- Save worthwhile unresolved ideas with their originating examples and reasons for deferral. Discard obvious advice rather than accumulating it elsewhere.

Update jest_tests.yml only for the selected originating tests: add `iterated: 1`, or increment an existing value. Record supporting tests in the iteration report without changing their counters; they remain eligible for their own full review.

Reuse the `vitest_readability` branch and worktree for every loop. Commit each shared helper, together with the supporting tests adopting it, before the originating test, and give each originating test its own commit. Every commit carries `Test-File: <path>` trailers for the tests it changes and a `Readability-Iteration: NN` trailer.
