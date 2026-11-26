Run via gpt-6-sol at medium effort.

# Codex review (re-harden, `817454ed1e8..0ff5cb77dc8`)

Nothing to act on. Codex reported one finding, and it is refuted as a defect of this branch. It does point at a gap the store already had.

**Not acted on**
- **P1, "an imported macro change leaves the stored review stale"** (`populator.py:891`): **refuted for this branch.**
  - The carry-forward hashes only the tool file, and the watcher's `_reprocess_macro_dependents` calls `populate_store_inline` with its default `incremental=True`. Both claims are accurate.
  - A macro-only edit therefore leaves the stored expanded source stale as well. That gap is in `dev` and in `tool_patches`.
  - The cached toolbox runs that stored source, and the review is of that same source. The refusal matches what jobs actually run, so nothing gets through unreviewed.
  - When the source is eventually re-expanded (any change to the tool file, or `prune`), its review is redone with it. Worth an issue against the store's macro handling, outside this branch.

<details><summary>Codex output</summary>

- Coverage: every changed Python file; the two docs files were not reviewed; tests were read, not run.
- Finding P1 (correctness, confidence certain): "The incremental carry-forward check hashes only the tool file and accepts a review whose version matches. It does not check imported macro files. The watcher's macro-change path also calls the populator with its default incremental mode, so it does not force a new review of dependent tools." Scenario: change only an imported `macros.xml` so the expanded command gains a high finding; an incremental populate keeps the old empty review, and the tool's jobs are not refused.

</details>
