Run via Opus 5.5 at medium effort.

No performance problem found, and no code changed. The fix adds no query, loop, flush or client request. It adds one kind of work per output, a CRAM index, and that is needed for correctness.

## What the change costs

`make_copy` runs once per file-typed metadata element per discovered output, through `init_meta(copy_from=...)`. The new helper runs only for an id-less `MetadataFile`.

Measured with a scratch script on the unit test's mock app (SQLite), counting statements through an engine listener:

| Case | Statements in `make_dict_copy` | Result |
|---|---|---|
| Other Dataset, after commit | 2 | `None` |
| Copy of same Dataset, after commit | 1 | keeps the file |
| Other Dataset, `expire_all` | 2 | `None` |
| Copy of same Dataset, `expire_all` | 2 | keeps the file |
| New target with no id | 2 | `None` |

- **Queries:** the statements are single-row refreshes of the source and target HDA or a lazy load of a `Dataset`, not scans. I didn't baseline them against the unfixed code, and some come from reaching `target.metadata` rather than from the helper.
- **Helper time:** 1.1 us per call on loaded objects.
- **Discovery in the extended strategy:** the job side uses the sessionless context, so I expect no SQL there. This comes from reading the code. I didn't count statements on that path.
- **Flushes:** none added. `new_file` only does `session.add` when a session exists.
- **Scale:** no production data or Postgres run. Bounded per-output work didn't justify one, and these numbers don't speak to a production-size database.

## Regenerating indexes

Returning `None` means `set_meta` has to produce the output's file. `set_datasets_metadata` still calls `set_meta` for each discovered dataset, so this depends on whether each datatype's `set_meta` was already doing the work:

- **BAM, BCF, VCF, interval tabix, MAF, H5 hyper_params:** these write the file whether or not one was inherited. In the extended strategy they already paid this cost, writing to the input's file, so the cost is unchanged. They now write to a new path.
- **CRAM:** `CRAM.set_meta` only indexes `if not dataset.metadata.cram_index`. An inherited index used to skip indexing, so this is new work: one `pysam.index` per discovered output, on the job side. `test-data/2.cram` (60 KB) took 4 ms. Larger files will take longer; I didn't measure any.

The CRAM cost isn't worth avoiding. The skipped index described the input's data rather than the output's, and the `directory` strategy already indexes here, per the initial debrief. This is from reading the code. I didn't run CRAM through either strategy, and no test on this branch covers CRAM.

## Pattern checklist

Nothing on the process's list applies. The change has no list queries, API fields, polling, CTEs, joins or async handlers.

## Tests

No query-count test added. With no problem found, it would pin SQLAlchemy's refresh behaviour rather than a regression risk.
