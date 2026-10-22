# foundry#675 — nested sub-collection arity not assertable

Issue: https://github.com/galaxyproject/foundry/issues/675 (scottcain, AI-posted, `needs-triage`)
Branch: `issue-675-nested-count-docs` on `origin`, worktree `~/projects/worktrees/foundry/branch/issue-675`, commit `275cc43f` on `89c7b9ef`. PR: https://github.com/galaxyproject/foundry/pull/697 (opened 2026-10-21; body from [pr_description.md](pr_description.md))
Issue comment posted 2026-10-21: https://github.com/galaxyproject/foundry/issues/675#issuecomment-6328805936

## Triage (2026-10-21)

Status overrides the label: the schema and runtime gaps are already fixed; only a docs gap remains.

- Schema: fixed. Foundry `origin/main` @ `89c7b9ef` vendors tests-format at gxwf 1.14 (`dd2fd857`), whose
  `TestCollectionCollectionElementAssertions` has `count`, `min`, `max`. Came from Galaxy
  [#23554](https://github.com/galaxyproject/galaxy/pull/23554) (release_26.1, merged 2026-09-18), which fixed
  galaxyproject/galaxy#23544 and widened only the model.
- Runtime: never broken. `verify_collection` in released galaxy-tool-util 26.1.1 (`interactor.py`, tag
  `v26.1.1`) already checks `count`/`min`/`max` on nested elements; planemo doesn't validate the test file
  against the model first. So planemo 0.75.47 enforces nested `count` today.
- Nested `collection_type`: not supported upstream; low value, since the parent's `collection_type`
  fixes every rank. Don't pursue.
- Remaining gap (Scott's item 2): `content/research/planemo-asserts-idioms/index.md:81` says to use
  `element_tests:` at each level and that "`attributes:` or `element_count:` can check shape" — doesn't say
  the nested key is `count` (not `element_count`), nor that `min`/`max` exist there.
  Foundry#679 / PR #695 already lists `count` (nested sub-collections) as a test-plan `family`.

## Proposed fix

Edit idioms line 81: top level uses `element_count:`; a nested sub-collection under `element_tests:`
uses `count:` (or `min:`/`max:`) for exact arity. Maybe add `count: 1` under the unpaired sample in
the existing YAML example. Bump revision, recast (`make casts`), regenerate Dashboard. No changeset (no
package change). Comment on #675 that item 1 is fixed upstream (needs John's OK to post).

## Done (2026-10-21)

Idioms line 81 edited (nested `count`/`min`/`max`, `count: 1` unpaired example, no nested `collection_type`); 8 casts + Dashboard regenerated. Vendored-schema check: nested `count: 1` valid, nested `collection_type` rejected.

## Closed (2026-10-21)

PR #697 merged (`e7e35239`); issue closed with a note pointing at #697 and the earlier comment.
Follow-up: another session pushed `d07b03be` (drop `elements:` alias and `attributes:` from section 5)
to the old branch after #697 merged, so it never reached main. Cherry-picked onto `issue-675-idioms-trim`
(`9ebbcbc2`, note revision 9): PR https://github.com/galaxyproject/foundry/pull/698.
That session also added a line to merged #697's body describing the trim; it's only true once #698 merges.
Stale `issue-675-nested-count-docs` (local + origin) not yet deleted (auto-mode denied); worktree now on `issue-675-idioms-trim`.
