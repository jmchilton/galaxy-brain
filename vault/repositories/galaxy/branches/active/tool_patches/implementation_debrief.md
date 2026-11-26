# Implementation debrief (revision: collection_fix)

```
created .../tool_patches/differential-review/snapshots/20261126T212551Z-revision-8bb1573a319e.json
  revision @ 8bb1573a319e vs origin/dev (merge-base ce63095e7a8a)
  since 20261126T033947Z-hardening-1e92a2575484:
    commits: 25 same, 0 rebased, 0 changed, 3 new, 0 dropped
    hunks:   84 carried, 2 changed, 0 new, 0 dropped
    new     e0a94aa8566b Accept collection_fix tool patch files
    new     f531c63edc27 Pin collection_fix flag 1.0 and mixed security advisory cases
    new     8bb1573a319e Challenge collection_fix tests: valid cases join the load table
```

**STATUS: READY.** Head `8bb1573a319` is on `jmchilton/tool_patches`, with 28 commits on top of `origin/dev`. The previous debrief is in `earlier_drafts/2/`.

## Change

The patch collection added a top-level `collection_fix: true` field. It marks hand-authored security fixes that have no upstream PR. `PatchFile` had `extra="forbid"` and required a security upstream entry, so it skipped every such file. It now mirrors the collection checker (`tools/checker.py`):

- **The field.** `collection_fix: Literal[True] | None`, with a before-mode field validator. The validator rejects explicit `null`, `false`, `1`, `1.0` and strings, the same way the checker's `is not True` test does; lax `Literal[True]` would have accepted `1` and `1.0`.
- **The exemption.** With the flag set, security ops need no security upstream entry. A security advisory still needs one.
- **Its own requirements.** The flag needs `authoring: hand` and security ops, with the checker's error messages word for word. The engine already modelled `authoring`, so nothing is missing there.
- **Commit `e0a94aa8566`.** It holds the model change in `lib/galaxy/tool_util/patches/model.py` and its tests. `f531c63edc2` and `8bb1573a319` are test-only follow-ups.

## Decisions

- **The flag is not reported on `PatchState` or the API `patches` entries.**
  - It is a file-level flag, but state is reported per kind. In a file stacked on a PR, the security state covers the PR's ops and the collection's ops together, so the flag would mislabel the PR ops.
  - The collection's own docs say the ops carry no marker.
  - A file with no PR already shows an empty `upstream` on its security state.
  - A test pins that the field stays off the state.
- **Only the order of error reports differs.** The model raises its first error, while the checker collects all of them. Both accept and reject the same files.

## Validation

- **Red to green.** All 12 new cases failed on `1e92a257548` and pass after the fix. The test challenge also tried five mutations of the model, and each one turned at least one case red at its own assertion.
- **Real collection sweep, run in the scratchpad.** Every `collection_fix` file in the collection was rejected before the fix and loads after it.
  - The sweep also found a pre-existing gap outside this scope: four other files carry `script_sha256`, which the engine still refuses under `extra="forbid"`. The earlier debrief already noted this.
- **Unit tests.** 584 passed and 2 xpassed across the patches unit tests: `test_tool_patches.py`, toolbox, cached tool, `source_store`, store selection and `scripts/tool_source`. `test_tool_patches.py` alone passed 191 at head.
- **Integration.** `test/integration/test_tool_patches.py` ran alone, with no other test server running, and 12 passed at `e0a94aa8566`. The later commits change unit tests only.
- **Formatting and types.** black, isort, ruff and flake8 are clean.
  - mypy on the changed files reports one `no-any-return` in the test helper `patch_states`. That helper is unchanged, and the error already exists on the hardening head.
- **Normal review: ship, no bugs.** The reviewer checked checker/model parity on 19 cases. The test challenge debrief is `test_challenges_debrief.md`, and the review is `subagents/review_collection_fix.md`.

## Follow-ups (not done)

- **Checker parity for other boolean fields.** `UpstreamRef.subset` and `changes_requirements` accept an explicit `false`, which the checker rejects. A shared only-true type could cover them and `collection_fix`. This gap predates this revision.
- **`script_sha256`.** The engine has no support for it yet; see the earlier debrief.

## Dependent branch

`tool_patches_static_findings` carries `tool_patches`' commits. It needs `e0a94aa8566`, `f531c63edc2` and `8bb1573a319` re-picked, or a rebase onto the new head. That branch was not touched.
