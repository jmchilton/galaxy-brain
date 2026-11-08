Run via Opus 5.5 at medium effort.

**Recommendation: expand slightly, by two very small pieces, and don't contract.** Keep everything on the branch and add: (1) a call in the Celery `set_metadata` task so an affected output gets its own file before `set_meta` runs, because that route still overwrites the input's index, and (2) a fix to `_delete_dataset`'s last log line, which recreates every metadata file the script has just removed. Together that's about 3 lines of production code plus tests. The branch's production diff is modest (+90/-16), and each part stops a demonstrated way of damaging a live dataset's index. Contracting would leave the affected 26.1 rows exposed to unattended purges. Report the job-cache shared-row bug as its own issue rather than folding it in: it's a real and probably wider data-loss bug, but it has a different mechanism and no settled design. If John would rather not reopen the branch for these, as implemented is a sound fallback with the Celery route listed as a known limit.

Under the workhorse process, this second evaluation recommending any change parks the branch for John's decision. The rest of the branch doesn't depend on the answer.

## Possible Decompositions

The branch is +404/-16 at `8c9d6135164`: production +90/-16 (of which about 9 lines each way are `_delete_dataset`'s re-indent), tests and test tool +314. Dependencies:

- The refactor and fix need the baseline tests first.
- The repair (`a47a14988ce`) needs `_shares_dataset` from the fix.
- The guards need nothing else on the branch. Their tests build duplicate rows by hand.

| Piece | Commits | Net size |
|---|---|---|
| Baseline | `5fb51d0c180` | +177 |
| Fix | `52f07e6f188`, `f4c24536c96`, `b0de86460d8`, `b6d91bbfa8c` | about +65/-17 |
| Repair | `a47a14988ce`, `7f16b0d9fbd` | about +35/-3 |
| Guards | `68438838e68`, `badfe530121`, `8c9d6135164` | +146/-9 net, one guard built over three commits |
| Mixed test cleanup | `6953cb52a99` | touches both fix and guard tests, needs splitting for any split below |

- **One PR.** All of it, after squashing the guard commits and test cleanups, as `baseline_refactor.md` suggests. Reads as one story: one shared file, and everything that can still damage it.
- **Two PRs, guards separate.** Baseline, fix and repair in one; guards in the other, landing in either order. Guards first would close the unattended path soonest.
- **Two PRs, new rows then old rows.** Baseline and fix first, which `issue_24787_metadata_source_shared_file_26_1_alt_original_scope` at `b0de86460d8` already is. Then repair and guards.
- **Three PRs.** Baseline alone, fix and repair, then guards.

If the recommended additions go in, the Celery call goes with the repair and the log line with the guards.

## Scopes considered

### Recommended: as implemented, plus the Celery route and the log line

Add `dataset_instance.init_meta(copy_from=dataset_instance)` before `set_meta` in the `set_metadata` task (`lib/galaxy/celery/tasks.py`). Stop calling `get_file_name()` in `_delete_dataset`'s trailing `log.info`, and tighten the test that currently allows for the empty file.

| Pros | Cons |
|---|---|
| <ul><li>Makes "setting metadata on an affected output gives it its own file" true on every route found</li><li>Same damage as the route the branch already fixes, for about one line</li><li>The log line is in the block this branch re-indents, and its own test has a comment working around it</li></ul> | <ul><li>Affected rows are few, and this route also needs a user action on one of them</li><li>Overwritten indexes can be recovered by re-detecting the input, so this isn't permanent loss</li><li>The Celery route needs a test at a layer not worked out yet</li><li>Parks the branch for a decision</li></ul> |

<details><summary>Details</summary>

**The gap.** `from_external_value` only covers set metadata *jobs*. History's bulk "Change data type" operation, whose modal defaults to Auto-detect, goes through `_change_item_datatype` to the `change_datatype` task. For a BAM that sniffs as BAM, `registry.change_datatype` does nothing because the extension is unchanged. The task then calls `set_metadata`, where `overwrite_metadata` skips `bam_index` because its spec has no default, and `Bam.set_meta` indexes straight into `dataset.metadata.bam_index`, which resolves to the input's row. No `MetadataTempFile` or `from_external_value` is involved.

**What I ran.** A scratch script on the unit test mock app with `store_by="uuid"`, real BAMs and the affected state as the integration fixture builds it. It calls the task's `set_meta` step directly, not the whole Celery bulk operation.

| | Input's index changed | Output's row afterwards |
|---|---|---|
| `set_meta` as the task calls it now | yes | input's row |
| `init_meta(copy_from=self)` first | no | new row, new uuid |

A dataset owning its row keeps that row under the same call, since `make_copy` returns it as is. The reachability through `change_datatype` is from reading the code. A real datatype change (say to another extension) already separates the output, because `registry.change_datatype` runs `init_meta(copy_from=data)`. That's also from reading.

**Other direct `set_meta` callers.** None of these can hit an affected output: the expression tool path uses `copy_from(include_metadata=False)` or `init_meta()` first; `output_collect` calls `init_meta()` first; `retry_internally` handles new outputs of a finishing job; the model store path handles fresh imports; deferred materialization calls `init_meta()` first.

**CRAM.** Neither route repairs it, because `CRAM.set_meta` skips indexing when a file is set, so the own file holds the input's bytes. See the coverage scope below.

**The log line.** `log.info(metadata_file.get_file_name())` runs after the unlink, and `get_file_name()` creates a missing file. So each file this script removes comes back as a 0-byte file. The thermo-nuclear review set this aside as unrelated and not for a release branch, but neither is a reason to stay narrow here. Logging `metadata_file.id` fixes it, and `test_cleanup_keeps_metadata_file_a_live_row_names` can then assert the file is gone.

</details>

### As implemented

`make_copy` stops handing a discovered output the input's file. `from_external_value` separates an affected output during a set metadata job. `pgcleanup.py` and `cleanup_datasets.py` keep a file while another live row names its uuid.

| Pros | Cons |
|---|---|
| <ul><li>Covers all three items in the issue's Direction</li><li>Hardened, reviewed and mutation-tested</li><li>No further review or test round</li></ul> | <ul><li>Bulk auto-detect on an affected BAM output still overwrites the input's index</li><li>`cleanup_datasets.py` keeps leaving 0-byte files behind</li></ul> |

This is an acceptable result. The Celery gap is narrow, recoverable and easy to state as a known limit in the PR description.

### Contract: back to the original scope

Only the `make_copy` fix, as on the `_alt_original_scope` branch.

| Pros | Cons |
|---|---|
| <ul><li>Smallest diff, one file of production code</li><li>Exposure is narrow: rows can only come from `v26.1.2` (2026-10-25) or from tracking `release_26.1` since about 2026-09-14, under extended metadata, `store_by: uuid`, and a tool with `metadata_source` on a discovered collection</li><li>The only such tool in `test/functional/tools` is this branch's own. Tool Shed tools weren't checked</li></ul> | <ul><li>A routine purge of either dataset still deletes the other's index, silently and unattended, with an empty file recreated on next read</li><li>Affected rows look healthy until they do damage</li><li>The issue's stated repair, re-detect, makes things worse</li></ul> |

Not recommended. The short window is why a bulk repair isn't worth it, but a silent loss from an unattended job is worth about 90 lines to prevent.

### Contract: drop the guards, or leave them to #24745

Keep the fix and the repair, and let #24745's review branch bring the guards.

| Pros | Cons |
|---|---|
| <ul><li>Leaves two cleanup scripts out of a metadata fix</li><li>Avoids a query per removal batch on every uuid-store instance, for a small population</li></ul> | <ul><li>#24745 targets `dev`, so affected `release_26.1` rows stay unguarded</li><li>#24745 is shelved until #24787 closes, so it can't deliver them first</li><li>Its guard checks only `purged`, and on this base pgcleanup sets only `deleted`</li><li>The purge is the worst remaining failure</li></ul> |

Not recommended. The batch query was measured as cheap, with no transaction open during deletes. A one-off production query for one uuid across different datasets would give this option more weight if it finds nothing, and John would be the one to run it.

### Contract: drop only the `cleanup_datasets.py` guard

| Pros | Cons |
|---|---|
| <ul><li>About 37 lines of production diff, half of it re-indent</li><li>Same rule stated twice</li></ul> | <ul><li>Same data loss through a script that still ships with wrappers (`purge_datasets.sh` and others)</li><li>Reintroduces the failure the rescope review rated MEDIUM-HIGH</li></ul> |

Not recommended.

### Contract: drop `_shares_dataset`'s id comparison

Remove the clause that treats a clone with the same Dataset id as the owner, along with `test_metadata_from_sessionless_import_keeps_new_metadata_file`. `ExtendedDirectoryMetadataGenerator.load_metadata` is the only way there, and its comment confirms it's kept for unit tests: `finish` uses `perform_import`.

| Pros | Cons |
|---|---|
| <ul><li>Two lines and a test go, and the helper gets simpler</li><li>Test challenge confirmed only that test notices</li></ul> | <ul><li>`load_metadata` is still on the interface, and the test calls real import code</li><li>A misjudged clone would lose its file</li></ul> |

Optional, and not a scope question worth a round on its own.

### Expand: job-cache shared metadata rows

`HDA.copy_from(include_metadata=True)` copies `_metadata`, so a cached output references the source HDA's `metadata_file` row. pgcleanup selects rows by `hda_id`, so purging the source removes the file the live copy reads. There's only one row, so the uuid guard can't see it.

| Pros | Cons |
|---|---|
| <ul><li>Same symptom in the class this branch touches: pgcleanup removes a file a live dataset reads</li><li>Not limited to extended metadata or `store_by: uuid`, so likely many more datasets than this bug</li></ul> | <ul><li>Different mechanism, in `copy_from` and its callers</li><li>No settled design: copy rows on `copy_from`, or teach the guard about copies, where a SQL check on `copied_from` wouldn't reach every case</li><li>Not reproduced on this base: the #24745 review reproduced it on `dev`, and I only read the same code here</li></ul> |

Not recommended on this branch, but worth reporting. No issue exists for it as far as I found. It should go through `GX_QUEUING_ISSUE_CREATION.md`, and it's the most valuable thing this evaluation turned up.

### Expand: bulk repair of existing rows, or a unique uuid

A script or migration that finds rows sharing a uuid across Datasets, gives each output its own file and re-detects. Once uuids are unique, both guards can go.

| Pros | Cons |
|---|---|
| <ul><li>Only way to fix damage nobody notices</li><li>Would eventually delete both guards</li></ul> | <ul><li>Short exposure window, and production row counts are unknown</li><li>Needs job submission or primary data access at scale</li><li>A constraint or migration is `dev` work</li></ul> |

Not recommended. Revisit if a production query finds rows.

### Expand: coverage and CRAM repair

Add `extended_celery`, a CRAM case, an LDDA separation test, and tests for the gaps listed in `test_challenges_debrief.md`. Separately, make re-detect reindex CRAM.

| Pros | Cons |
|---|---|
| <ul><li>`extended_celery` and other datatypes are on the issue's "not verified" list</li><li>CRAM's behaviour does change: it now indexes each discovered output</li></ul> | <ul><li>`get_metadata_compute_strategy` treats `extended_celery` the same way, so little new risk</li><li>Each new config adds a server start</li><li>Re-detect not reindexing CRAM holds for every CRAM, so it's a separate bug</li></ul> |

Not recommended as scope. A CRAM test is the most useful of these if John wants one. The PR description must not say re-detect repairs CRAM.

### Expand: release stale rows and other leaks

Mark an output's stale row deleted on separation, and handle rows left by API-purged HDAs, as the rescope review noted.

| Pros | Cons |
|---|---|
| <ul><li>Tidier tables, fewer files waiting on a later purge</li></ul> | <ul><li>Nothing is lost, which is the right way for the guard to fail</li><li>A stale row is what later releases the shared file, so pgcleanup and `cleanup_datasets.py` already clean this up in ordinary order</li></ul> |

Not recommended.

### One shared guard

Put the rule in `galaxy.model` and call it from both scripts.

| Pros | Cons |
|---|---|
| <ul><li>Removes a possible drift between two statements of the rule</li></ul> | <ul><li>New public symbol on a release branch to share one `WHERE` clause</li><li>Removes about as many lines as it adds, and doesn't fit `_update`, per the thermo-nuclear review</li></ul> |

Not recommended.

### `make_copy` cleanup, the id-less heuristic, and `store_by: id` under extended

The `except AssertionError` branch, `value.id` on a `MetadataTempFile` and the unreachable `target is None`; replacing the "no id means new" convention; and the no-index upload the issue flags.

| Pros | Cons |
|---|---|
| <ul><li>All sit near this code, and the heuristic is where the bug came from</li></ul> | <ul><li>No known failure from the cleanups</li><li>The heuristic is a much larger change, better on `dev`</li><li>`store_by: id` is a separate mechanism that wasn't investigated here</li></ul> |

Not recommended. The earlier evaluation's advice stands: `store_by: id` deserves its own issue if John wants it filed.

## Claims checked against the code

| Claim | Result |
|---|---|
| Set metadata jobs use the Portable generator, so the overwrite happens in `from_external_value` | True for jobs, confirmed in `get_metadata_compute_strategy`. Not the only route, see the Celery gap |
| `807c53fc441` first reached a tag in `v26.1.2` | Confirmed, it's the only tag containing it |
| `full_delete()` removes no metadata files on this base | Confirmed, the `TODO` is still there |
| Six actions use `RemovesMetadataFiles`, and they set only `deleted` | Confirmed. `PurgeHDAsOfPurgedHistories` and `PurgeDeletedHistories` don't use it |
| `pgcleanup.py` and `cleanup_datasets.py` are the only metadata file removal paths | Nothing else found in `lib` or `scripts`. `object_store` deletes of `_metadata_files` occur only in pgcleanup |
| `ExtendedDirectoryMetadataGenerator.load_metadata` is test-only | Confirmed by its comment, and `finish` uses `perform_import` |
| #24745 is shelved until #24787 closes | Confirmed in its review record. The PR is open against `dev` with no reviews. It also adds `DeleteLibraryDatasets(RemovesMetadataFiles)`, which inherits this guard after a forward merge. Its `full_delete()` removal would still need its own guard |
| The base is current | `release_26.1` has no commits past the merge base as of this evaluation |
