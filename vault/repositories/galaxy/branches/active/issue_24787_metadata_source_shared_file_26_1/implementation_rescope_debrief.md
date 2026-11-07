# Re-scope debrief

The first scope evaluation recommended expanding, because outputs created before the fix could still destroy their input's index. Original scope: `alts/original_scope.md`.

**Added**

- `FileParameter.from_external_value` gives a dataset its own file when its metadata resolves to a file another Dataset owns.
- `pgcleanup.py` and `cleanup_datasets.py` keep a file while another live row names its uuid.

**Differences from the recommendation**

- It proposed filtering the metadata export. That test stayed red: set metadata jobs use the Portable generator, and the overwrite happens on the handler in `from_external_value`.
- It proposed porting #24745's guard hunk. That checks only `purged`, but on this base pgcleanup sets only `deleted`, so a shared file would never be released. The guard checks both.
- It called pgcleanup the only removal path. `cleanup_datasets.py` also removes these files, found in review.

Each guard and the `from_external_value` check has a test that fails when it's removed. The pgcleanup test ran on Postgres in a local container.
