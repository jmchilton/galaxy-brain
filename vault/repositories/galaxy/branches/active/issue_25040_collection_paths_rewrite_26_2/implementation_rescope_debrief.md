# Re-scope debrief

The first hardening round's [scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended a modest expansion. The original scope is kept as alt [`issue_25040_collection_paths_rewrite_26_2_alt_original_scope`](alts/original_scope.md) (`d525f5da834`, pushed to the fork).

## What changed

1. **Nested `include_collection_name` staging paths** (new commit `d61fed222d1`, placed right after the baseline tests so it can be split out or backported). `get_all_staging_paths` and `serialize()` prefixed the collection name at every nesting level (`input1/sample1/input1/forward.bam`). They now put it once as the top-level directory, which is what `export_remote`'s "Include the collection name as top level directory?" option promises. Flat-list output is byte-identical to base. The pre-existing identifier length allowance for the name is kept so existing layouts don't change.
2. **Metadata rewrites only for inputs** (new commit `5543883b662`). `all_metadata_files` on an output wrapper no longer asks for `input_metadata_rewrite`, which Pulsar would record as a file to stage. This matches draft #25023. `MetadataWrapper` is still unguarded, as on base and in #25023.
3. **Integration test renamed** to `test/integration/test_pulsar_embedded_rewrite_parameters_input_paths.py` (folded into the fix commit). Draft #25021 adds a file at the old path.

Head: `5543883b662` (7 commits). Base `release_26.2`.

## Overlap with mvdbeek's drafts

- **#25023**, "[26.2] Fix remote tool evaluation on Pulsar and allow it with directory metadata". Its commit `fee0cf0ff4` makes the same accessor fix inside a larger remote-tool-evaluation PR. That commit still drops elements with repeated identifiers, builds metadata for `all_paths`, and hands out the cached list, all of which this branch fixes. It also changes the `input_metadata_rewrite` signature, which this branch doesn't adopt.
- **#25021**, "[26.2] Fix Pulsar rewrite_parameters jobs whose command template reads inputs or config files". Once it lands, our integration test may pass without the fix; the unit tests would still fail without it.

The PR description should name both, so #25023 can drop `fee0cf0ff4` or the two can be reconciled. Which lands first is John's call.

## Validation

- Normal review of the re-scope: [subagents/rescope_review.md](subagents/rescope_review.md). Three of four low findings acted on.
- `test_wrappers.py` passes at every commit (38 → 42). The baseline commit's tests pass on base. The two new tests fail before their fixes.
- Integration (renamed) and related framework tests pass. `make mypy` is clean.

Earlier hardening debriefs moved to [earlier_drafts/1/](earlier_drafts/1/) for re-hardening.
