# Normal review: existing lane history reorganization

Reviewed against `../../agents/_shared/REVIEW_FOCUS.md`. Scope is the three existing lane histories, retaining their complete final source trees. This supersedes the abandoned independent-branch split design. No new CI, documentation or component source changes belong in this operation.

## Findings and resolutions

- The initial unique-story-owner assumption rejected `client/src/components/GalaxyAI.stories.ts`: both newchat and routesync tests historically owned changes. The implementation now assigns the shared story to the earliest owning conversion and records all historical owners; each unit test retains its separate final delta. This is an explicit, reviewable ownership choice.
- Readability architecture includes the final README and the helpers it newly references (`runInTestScope`, `clickModalButton`, `seedCurrentHistory`), avoiding dangling documentation references. All non-test/non-story changes are first in each lane.
- Resolved imports from architecture files at each original lane snapshot were checked against the original parent plus architecture delta. No new test/story file was required before its conversion commit. This is a static import check, not a runtime or type-check result.
- The exact GDropdownItem source remains unchanged, including existing accessibility context limitations of standalone menuitems. A history-only operation must not imply this example has newly passed strict accessibility.
- Ancillary parent rewrites must preserve raw commit messages if claiming exact preservation; the original `%B` format introduces an extra trailing newline. Resolved: ancillary cloning now extracts the raw body from `git cat-file commit`, preserving its exact bytes.

## Implementation assessment

`--prepare` writes dangling Git objects through a private temporary index. It does not update branch refs, push, check out files or change the repository index. It compares refs and worktree status before/after. Each lane has one shared architecture commit, a separate example commit, then one final delta per owning test. parseBool is the readability example; GDropdownItem is the stories/play example. Repeated historical modifications to one test are consolidated. Empty historical deltas can disappear without changing a source tree.

Each changed path is assigned exactly once, deletions and file modes are preserved, final tree IDs are required to equal the original lane trees, and every generated Test-File trailer is read back using Git trailer parsing. Test-File and Co-Authored-By remain in the same paragraph. Ancillary branches are cloned only through a linear verified parent map, preserving tree IDs.

No code-review blocker to preparing objects remains. Final manifest and independently checked resulting trees must be reviewed before updating existing branch refs. This review does not authorize changes to original refs outside the user-authorized history reorganization or claim new test execution.

## Ref application review

Reviewed `apply_refs.py`: it accepts exactly the five existing branch names, checks each current head against its pinned original SHA, checks exact tree identity and clean associated worktrees, then atomically creates recovery refs and updates existing heads using compare-and-swap old SHAs. It creates no domain/foundation branch refs. Existing recovery refs must match the original heads. The update leaves worktree file content unchanged because each replacement head has the same tree.

Independently verified all five new parent relationships, all five existing local heads remained pinned to old SHAs before application, and no `vitest_review*` or `vitest_*foundation` local refs existed. Pipeline instructions preserve complete lanes now and defer domain PR extraction until requested. Existing strict accessibility failures and historical exceptions remain baseline facts; no new green test claim is supported by this operation.

## Final independent verification — passed

All generated commits were read back independently of the builder. For each of the three lanes, verified the first commit contains only shared paths, the second is the selected example, the complete generated parent chain matches the manifest, each actual commit delta matches its allocated paths, all changed paths occur exactly once, every Test-File trailer parses, and final tree IDs equal the originals. For all 79 ancillary commits, verified raw message bytes and tree/author/committer headers remain identical; only parent links change.

| Branch | Own commits | Exact preserved tree |
| --- | ---: | --- |
| vitest_readability | 396 | 78ba2e31ca358304cd262e32abb6ca468fa4233c |
| vitest_stories | 102 | 55d5d198abed67b4a09c906ed66d5caaa0332a12 |
| vitest_story_play | 96 | 761be3416b121f9142f65c98bf459a4ae9a376ed |
| vitest_real_api_calls | 3 | 31c417f575b212e57d4cb083b5850bac34a288d1 |
| vitest_readability_with_churn | 76 | 3c9ea1d5ee836a234330eb3d0d633eddbd9810fd |

Normal review approves applying the reviewed exact-tree history replacements with pinned original SHA checks, recovery refs and explicit push leases. No findings remain open. This approval makes no fresh runtime or accessibility pass claim.

## Publication metadata and documentation review — passed

Reviewed final pipeline instructions, pitch metadata, five existing branch indexes, `history_reorganization/README.md`, and both proposed PR body updates against freshly fetched live body snapshots. PR #24038 changes only the head SHA and adds the qualification that validation ran on the identical pre-rewrite tree. PR #24300 changes only three head SHAs and the combined lane history count (one infrastructure plus 95 test commits). The user-added video URL and every other byte are retained, including its existing CRLF line endings. Both canonical local PR descriptions equal the proposed live bodies after intentional CRLF-to-LF normalization.

Counts match the reviewed manifest: 396 readability commits, 102 stories commits, 96 combined play commits, with three and 76 ancillary commits. The pitch and branch records retain strict accessibility failures, historical exceptions and missing browser CI. The new README explicitly states no fresh runtime tests were run and preserves prior validation limitations. Pipeline instructions defer extraction into roughly 5–10-test domain PRs until requested. No new domain branch, PR or Galaxy CI change is represented. No open review findings; approved PR metadata publication and the scoped vault documentation commit.
