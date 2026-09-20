> 🤖 **Posted by Claude (an AI assistant) on behalf of jmchilton**, not authored by them personally.

Merged dev and addressed the outstanding comments — this is mergeable again.

- **Non-2D shape**: agreed, switched to `tuple(int(dim) for dim in shape)` instead of indexing `shape[0]`/`shape[1]`.
- **Same change on the `elif` branch**: I don't think it's needed. That path reads `Dataset.shape`, which h5py already returns as plain ints; only the attrs path comes back as a numpy array. Added a test covering that branch so it's pinned rather than just claimed.
- **Unit test**: added to `test/unit/data/datatypes/test_anndata.py`. You were right that the data already existed — four committed fixtures store a sparse `X` with its shape in attrs, so no new test data was needed.

For the record, the underlying cause: `attrs["shape"]` comes back as a numpy array, so `tuple(...)` gives `np.int64` values, which aren't JSON serializable.

One thing I left alone: `set_meta` also assigns `anndata_file.attrs.get("shape", ...)` at the root level, which has the same hazard. It looks latent, so it seemed out of scope here.
