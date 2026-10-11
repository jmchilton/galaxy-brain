# Pulsar PR #545 — towncrier changelog

- PR: [#545 — [0.15] Introduce towncrier for CHANGELOG management](https://github.com/galaxyproject/pulsar/pull/545)
- Latest review: [2026-10-11 review](review-2026-10-11.md)
- Reviewed head: `65d45d44a5b9c97099d5c86589b53601d4003888`
- GitHub state checked 2026-10-11: open, targets `release_0.15`, no labels, no comments or reviews.
- Delivery: internal review only; not posted to GitHub. No code or label changes made.
- Status: migration requires the existing `no changelog` exception before merge; no additional ordinary code blocker established.

## Latest result

The new CHANGELOG edit guard rejects this PR's intentional creation of `CHANGELOG.md`. Applying `no changelog` skips that guard and prevents the release coverage check from flagging #545, whose orphan fragment links issue #544 only. Recheck the label-triggered CI result after applying the exception.

All 14 release-script tests passed on a temporary archive of the exact head. An isolated release creation smoke test also passed, including committed fragment deletion and a clean final tree. The local feature worktree was unchanged.
