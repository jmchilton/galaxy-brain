Run via Opus 5.5 at medium effort.

**Recommendation: expand modestly.** Keep the fix as implemented and add two small pieces: a pgcleanup guard that keeps a metadata file while another unpurged row names its uuid, and a change so that setting metadata on an already-affected output gives it its own file. Together with the fix, these cover all three items in the issue's Direction. As implemented, new outputs are safe, but outputs created before the fix can still destroy their input's index, either through a routine pgcleanup run or a re-detect. Don't add a bulk repair, the `store_by: id` problem, or `make_copy` cleanup.

**Correction that affects scope.** The debriefs say the bug "dates from 26.1". It's narrower than that. `807c53fc441` reached `release_26.1` through #23388 on 2026-09-14, and it isn't in `v26.1.0` or `v26.1.1`. The first tag containing it is `v26.1.2` (2026-10-25). So affected rows can only come from installs tracking `release_26.1` or `dev` since mid-September, or running `v26.1.2`. That window is why a bulk repair isn't worth it. The guard and the re-detect change are still worth having, because they're small and affected rows can't be told apart from healthy ones until they do damage.

## Possible Decompositions

The branch adds 231 lines, about 30 of them in `lib/`. Current commits:

| Commit | Contents | Size |
|---|---|---|
| `5fb51d0c180` | Baseline tests, test tool, tool conf entry | +177 |
| `52f07e6f188` | `make_copy` refactor | +4/-4 |
| `f4c24536c96` | Fix, `_shares_dataset`, extended and mixed test classes | +56/-3 |
| `b0de86460d8` | Test config cleanup | +5/-10 |

- **One PR.** All four commits land together. `b0de86460d8` could be folded into the earlier commits first, since it only cleans up test code the branch adds.
- **Two PRs.** First, the baseline tests (`5fb51d0c180`). They pass on the base, and the directory class pins the behaviour extended should match. Second, the refactor, fix and test cleanup.

If the recommended pieces are added, each could also go in its own PR after the fix, in either order: the pgcleanup guard and its test, then the re-detect change and its test. The guard doesn't depend on the fix at all, so it could also land first.

## Scopes considered

### As implemented

`make_copy` returns `None` for an id-less `MetadataFile` owned by a different `Dataset`, so `set_meta` generates the output's own file, as under `directory`. Existing rows and files are left as they are.

| Pros | Cons |
|---|---|
| <ul><li>Smallest change, confined to `make_copy` and one helper</li><li>Hardened and mutation-tested</li><li>Fixes the root cause for all new outputs</li></ul> | <ul><li>A pgcleanup purge can still delete a live dataset's index through an existing duplicate row</li><li>Re-detecting an affected output still overwrites its input's index</li><li>The issue's stated repair path, re-detecting metadata, doesn't work yet</li></ul> |

### Recommended: fix, pgcleanup guard, and own file on re-detect

As implemented, plus two changes. `RemovesMetadataFiles` skips removing a file while another unpurged row has the same uuid. Exporting metadata for a set metadata job omits a `MetadataFile` owned by a different `Dataset`, so `set_meta` generates a new file with a new uuid.

| Pros | Cons |
|---|---|
| <ul><li>Stops both remaining ways an old row can damage a live dataset</li><li>Makes re-detect the repair the issue describes, per dataset and on demand</li><li>The guard already exists as an 11-line pgcleanup change with a test on `pr_24745_review_0`, and #24745 is shelved, so it isn't landing soon by that route</li><li>The guard also protects #24745 and its `full_delete()` work once that returns</li></ul> | <ul><li>Touches `pgcleanup.py` and model serialization, outside the original fix</li><li>Adds one `SELECT` per metadata file removed under `store_by: uuid`</li><li>The re-detect change hasn't been written or run</li><li>The pgcleanup test needs Postgres</li><li>#24745's branch will need the pgcleanup hunk dropped on rebase</li></ul> |

<details><summary>Details</summary>

**Why the guard.** `full_delete()` on 26.1 doesn't remove metadata files (it still has a `TODO`), so pgcleanup is the only removal path here, and it runs unattended. Six actions use `RemovesMetadataFiles`. Purging either the input or the output removes the shared file while the other still needs it. The guard is an unmerged commit, `48be02af2d9`, on the #24745 review branch, based on `dev`. Take only its `pgcleanup.py` hunk and `test_scripts_pgcleanup.py` test: its `lib/galaxy/model/__init__.py` and `test_metadata_file_purge.py` changes build on #24745's `full_delete()` work, which isn't on this base. `pgcleanup.py` on this base already imports `uuid` and `text` and has the `conn` the hunk needs. The test was red and then green on the review branch, but it hasn't been run on `release_26.1`.

**Why the re-detect change.** This comes from reading the code. An affected output's `bam_index` value is a uuid, and `wrap` resolves it to the oldest row, the input's. `_prepare_metadata_for_serialization` then exports that uuid, the job imports a file under the same path, and `Bam.set_meta` indexes into it because a file is already set. On the handler, `replace_metadata_file` sees that the oldest row belongs to another dataset and inserts yet another duplicate. The branch's `test_set_metadata_on_output_keeps_input_index` doesn't cover this, because its outputs are created after the fix and so already have their own uuid.

**Suggested shape.** Have the export skip a `MetadataFile` when `value.dataset` isn't the exported instance's `Dataset`, which is the same question `_shares_dataset` answers. Files shared by copies, including `HDA.copy_from`, share the `Dataset` and are unaffected. The export is also used outside set metadata jobs, so the implementer needs to confirm which callers pass `strip_metadata_files=False`, and may prefer a narrower place. A test can build the affected state by inserting a row with the input's uuid, then re-detect and check the input's file is unchanged and the output has a new uuid.

**What this leaves.** The stale row stays after a re-detect, still naming the input's uuid. Purging the output later would remove the input's file without the guard, so the two changes depend on each other. `replace_metadata_file`'s insert also stays, for the reason `b37de64b702` gave.

</details>

### Guard only

As implemented, plus the pgcleanup guard, without the re-detect change.

| Pros | Cons |
|---|---|
| <ul><li>Covers the unattended path, which is the more likely one</li><li>Uses code that already has a test</li></ul> | <ul><li>Re-detecting an affected output still corrupts the input, and adds another duplicate row</li><li>Leaves the issue's repair path unusable</li></ul> |

This is the fallback if the re-detect change turns out larger than expected.

### Bulk repair of existing rows

A script or migration finds rows sharing a uuid across different `Dataset`s, gives each output its own file, and re-detects metadata.

| Pros | Cons |
|---|---|
| <ul><li>Cleans up affected data without anyone asking per dataset</li><li>Only way to fix damaged indexes nobody notices</li></ul> | <ul><li>Exposure is about eight weeks, on a narrow configuration, and the only in-repo tool using this is this branch's test tool</li><li>Needs job submission or primary data access at scale</li><li>Production row counts are unknown</li><li>Too much for a release branch fix</li></ul> |

Better handled as a follow-up if a query on a production database finds rows. The query is simple: `metadata_file` rows with one uuid across different datasets.

### Extended coverage: `extended_celery` and CRAM

Add a test class for `extended_celery`, and a CRAM case alongside the BAM one.

| Pros | Cons |
|---|---|
| <ul><li>Both are on the issue's "not verified" list</li><li>CRAM is the one datatype whose behaviour changes: it used to skip indexing when it inherited a file, and now indexes each output</li></ul> | <ul><li>Same job-side path per the normal review, so little new risk is expected</li><li>No existing test uses `extended_celery`, so there's no pattern to copy</li><li>Needs a second test tool or a parameterized one, and adds a server start</li></ul> |

Optional. The CRAM case is the more useful of the two, and adding it wouldn't change what the PR is about.

### `make_copy` cleanup

Address the thermo-nuclear review's "Noted, not done" items: the `except AssertionError` branch calling `session(target_context.parent)`, `value.id` on a `MetadataTempFile`, and the unreachable `target is None` check.

| Pros | Cons |
|---|---|
| <ul><li>Same method this branch touches</li><li>The `except` branch looks broken</li></ul> | <ul><li>No known user-visible failure. `get_file_name` now flushes id-less rows itself, so the `except` looks unreachable, from reading only</li><li>Adds review surface without fixing a bug anyone can hit</li></ul> |

Not recommended. If a real path to either failure turns up, it should be fixed then.

### Remove the id-less heuristic or `load_metadata`

Stop using a missing id to mean "new or sessionless", or remove `ExtendedDirectoryMetadataGenerator.load_metadata`, which has no production caller, along with `_shares_dataset`'s id comparison.

| Pros | Cons |
|---|---|
| <ul><li>Removes the underlying smell the bug came from</li><li>Removing the method simplifies the helper</li></ul> | <ul><li>Changes how sessionless contexts mark imported rows, which is a much bigger change than this bug needs</li><li>`load_metadata` is an interface method that `test_metadata.py` calls</li></ul> |

Not recommended here. Better as separate work on `dev`.

### `store_by: id` under `extended`

Fix the case the issue flags, where a BAM upload gets no index because `MetadataFile.get_file_name` fails and the dataset still ends in `ok`.

| Pros | Cons |
|---|---|
| <ul><li>Also affects metadata files under `extended`</li><li>Could affect far more datasets than this bug</li></ul> | <ul><li>Different mechanism, in code this branch doesn't touch</li><li>Not investigated beyond the issue's note</li></ul> |

Not recommended here. It deserves its own issue: a search of open issues found none, and it should be queued per `GX_QUEUING_ISSUE_CREATION.md` if John wants it filed.

### Contract

No review suggested a smaller scope, and I didn't find one. The mixed `store_by` test class is the only piece that might look optional, but it pins the regression the first version of this fix had.
