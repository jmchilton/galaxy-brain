# galaxy-tool-util-ts#193 — tests.schema.json predates galaxy#23554

Issue: https://github.com/jmchilton/galaxy-tool-util-ts/issues/193
Branch: `issue_193_nested_collection_count` (`da4aca61`), worktree `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_193_nested_collection_count/`.
PR description: [pr_description.md](pr_description.md). PR not opened yet.

## What was done (2026-10-19)

- Red: added positive fixture `collection_nested_element_count.yml` (issue repro + nested `min`/`max`); failed against the vendored schema.
- `make sync-test-format-schema` from Galaxy `origin/dev` `0de6cc2d7fe` (lib exported via `git archive` to scratch; any Galaxy venv with pydantic works as `GALAXY_PYTHON`). Prettier the generated `.ts` afterward or the diff is ~10k lines of churn.
- Drift picked up: `count`/`min`/`max` on `TestCollectionCollectionElementAssertions` (galaxy#23554, 26.1) and `visible` on `TestDataOutputAssertions` / `TestCollectionDatasetElementAssertions` (galaxy `1d19ff1744c`, release_26.2+ only). Added `output_visible.yml` fixture.
- Changeset: patch for `@galaxy-tool-util/schema` and `/cli`.
- Schema suite (5047), CLI suite, format, lint, typecheck green.

## Open

- `visible` is accepted though 26.1 Galaxy rejects it — schema tracks dev, so this is the usual lean; flag in PR.
- Release after merge (changesets release PR).
