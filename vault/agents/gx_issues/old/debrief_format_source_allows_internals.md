# Debrief: format_source_allows_internals

Source: `format_source_allows_internals.md`, a Claude draft written from code reading only, at `90eca92b007`. Proposal: `proposed_format_source_allows_internals.md`.

## Research

- Reproduced on a running Galaxy at `origin/dev` 537915642fa. An API test ran four scratch tools, one at a time. Every output declares `format="txt"`, so `txt` means the reference didn't resolve.
  - On a `multiple` data param, `input2` resolves to the second dataset (→ `bed`), and so does a paired collection's `input['forward']`.
  - The conversion key `input1_table` resolves to `tabular`, and the `data_collection` element key `coll2` to `bed`.
  - **New, not in the draft: a legacy-alias collision.** A multiple `input` is given `[fasta]` and `cond|input1` is given `bed`. `format_source="input1"` then resolves to `fasta`, the wrong input, because the real numbered key beats the alias in `LegacyUnprefixedDict`. This is a silent wrong answer, and it leads the pitch.
- The linter (`OutputsFormatSourceReference`, #22432/#23459) already sits on dev. It errors on the internal keys, but only because it matches names verbatim. For the collision it suggests `cond|input1`, which is not what the runtime picks. The draft's "linter change in progress" claim was dropped.
- Usage scan of tools-iuc, galaxytools and tools-devteam: 3145 tools, 502 references, 0 internal-key forms, 0 collisions.
- Line refs re-checked on dev. Two were adjusted.

## Rewrite

- The draft's prose became a table with columns for tool, reference, runtime result and linter result, plus a repro in details and a code walk in details.
- The draft's suggested direction (resolve against declared parameters, then look up the runtime key) became the Proposed Approach. Alternatives: rename the keys, rely on the linter, document the keys.

## Review (one round, subagent)

- Nothing egregious and no duplicates. #7392, #9493, #11357 and #19330 are adjacent but different. Fixes:
  - **Linter false positives.** The linter errors on every bracket selector, including Galaxy's own `output_format_collection.xml`, and skips any reference containing `|`. "The linter already rejects these" was true only by accident, so the reviewer reworded it and added a test that `output_format_collection.xml` lints clean.
  - **Selector rule.** Made it consistent: only on `data_collection` params.
  - **Profile gate.** "No profile gate needed" was a wrong inference. Published tools already have references that resolve to nothing (galaxytools `pca.xml`, tools-iuc `ncbi_fcs_gx`). The proposal now says: warn on all profiles, error at load time from the next profile.
  - **Prior art.** Added draft PR #11803 (2021), which tried renaming the keys to `input.1` and stalled over recorded job inputs. It's in Context and in the rename alternative.

## Open

- `metadata_source` with an internal key wasn't observed at runtime: the dbkey probe couldn't tell the inputs apart. It's claimed from code only, and the proposal says so. `structured_like` wasn't tested or claimed.
- Should a selector on a multiple data param be rejected? The proposal rejects it.
- Should the linter's bracket-selector false positive be filed separately (a small standalone fix) or stay here?
- File as its own issue (recommended), then add a one-line cross-link on #23444.
- The scratch API test prints rather than asserts; turn it into assertions for red-to-green. Worktree: `scratchpad/gx_fs` (tools `fs_internal_*.xml`, `lib/galaxy_test/api/test_repro_fs_internals.py`).
