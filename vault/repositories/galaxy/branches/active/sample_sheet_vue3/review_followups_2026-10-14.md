# Review follow-ups 2026-10-14

Addressed both inline requests from [Ali’s review](https://github.com/galaxyproject/galaxy/pull/24050#pullrequestreview-5517646707) at `88ac10202d82e5e4dc79605e748fae7b458a1e8f`, pushed to `jmchilton:sample_sheet_vue3`.

- FetchGrid’s supported-target test retains the previous `rowData` reference and asserts a fresh array after each of two replacements. The existing unsupported-target case alone did not catch an in-place refill. Temporarily substituting a splice for the fresh assignment makes the new identity assertion fail; restored source passes.
- Removed `dismissible` from the collection-load error alert. Closing the only error explanation left an empty panel because the parent continued selecting the error branch.
- Updated the live PR description and local copy in both places that claimed FetchGrid tests mounted real ag-grid. They use a grid stub and the real async wrapper; the original real-grid reproduction remains historical evidence. No public comment or thread resolution was posted.

Verification: 164 tests across Collections, Landing and RuleBuilder plus four upload-configuration tests pass (168 total). `vue-tsc --noEmit`, Prettier, diff checks and commit hooks pass. Touched-file ESLint has zero errors and the existing `@gridReady` hyphenation warning. No new browser/E2E run for this small follow-up. Worktree clean after push; GitHub head matches, mergeable against actual base `release_26.2`, with fresh checks queued. No rebase was needed.

[Migration guide](../../../../../agents/gx_branches/VUE3_COMPONENT_MIGRATION.md): concise dos and don’ts drawn from initial implementation, polish, the Marius follow-ups and this round. Covers compat and async wrappers, watcher sources, raw rows, collection identity, backend validation parity, reference propagation, error states and honest regression evidence.
