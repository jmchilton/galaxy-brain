- `kind/bug`
- `area/database` - the fix is in the model layer (`copy_from`, `FileParameter.make_copy`, deferred materialization).
- `area/jobs` - job cache hits are the main path affected.
- `area/datatype-framework` - metadata file copying lives in the metadata framework.

The labeler would also add `area/objectstore` (one line in `_caching_base.py`, part of the cache-sync commit) and `area/testing`, `area/testing/integration`; left out as not central.
