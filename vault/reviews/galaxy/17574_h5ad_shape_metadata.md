# 17574 — Update h5ad datatype (shape metadata)

PR: https://github.com/galaxyproject/galaxy/pull/17574 — pavanvidem, opened 2024-03-01.

Reviewed and brought up to date 2026-09-19. Worktree `~/projects/worktrees/galaxy/pr/17574`.
Head was `20cddc5c8ea` (CONFLICTING, 20627 commits behind dev); now `27ec0db7799`, MERGEABLE,
+37/-1 across 2 files.

## Verdict

Mechanical, not architectural. One-line datatype fix plus the unit test the reviewer asked for
twice. No design questions.

## The bug

`Anndata.set_meta` reads a sparse `X` matrix's dimensions from HDF5 attributes. h5py returns that
attribute as a `numpy.ndarray`, so `tuple(shape)` produces a tuple of `np.int64`, which is not JSON
serializable. Metadata setting then fails for a valid `.h5ad` file — the symptom pavanvidem
reported (upload fails in Galaxy, `anndata.read_h5ad` works fine outside it).

Verified directly rather than inferred:

```
attrs shape raw:        [3 4]  <class 'numpy.ndarray'>
tuple(attrs shape):     (np.int64(3), np.int64(4))   json -> TypeError
tuple(int(x) for x ...) (3, 4)                       json -> [3, 4]
h5py Dataset.shape:     (5, 6)  elem types ['int', 'int']  json -> OK
```

Corroboration that the diagnosis is right: dev independently adopted the same `int()` idiom twice
in this very block (the null-matrix branch and the trailing `(-1, -1)` fallback) while leaving the
line this PR targets unfixed.

## Reviewer comments — all three addressed

bernt-matthias raised three things; none had been answered since 2024.

1. **"Analogous change should be applied [to the `elif` branch]"** (asked twice). **Not needed, and
   now documented by a test.** That branch reads `anndata_file["X"].shape`, an h5py `Dataset.shape`,
   which is already a tuple of plain Python ints — unlike the attrs path. Left unchanged
   deliberately; `test_set_meta_shape_from_dense_x` pins the behaviour so the question doesn't get
   re-asked.
2. **"Can shape be something else than 2D? Then maybe use list comprehension?"** **Adopted.** The
   PR's original `(int(shape[0]), int(shape[1]))` hardcodes 2D. Changed to
   `tuple(int(dim) for dim in shape)`, which subsumes points 1 and 2 and is strictly more general.
   The `shape` MetadataElement uses `metadata.ListParameter`, so a non-2-tuple is structurally fine;
   only its `default`/`no_value` are 2-tuples.
3. **"How about adding a unit test?"** **Done** — and his hunch that test data already existed was
   right. Six committed fixtures already store a sparse `X` with the shape in attrs, so no new
   binary was needed:

   | fixture | X | encoding-type | attrs shape |
   |---|---|---|---|
   | adata_0_6_small.h5ad | Group | csr_matrix | [10, 10] |
   | adata_0_6_small2.h5ad | Group | csr_matrix | [50, 50] |
   | adata_0_7_4_small.h5ad | Group | csr_matrix | [50, 100] |
   | adata_unk.h5ad | Group | csr_matrix | [50, 100] |
   | pbmc3k_tiny.h5ad | Dataset | — | (dense, covers the `elif`) |
   | adata_noX.h5ad | Dataset | null | (covers the null branch) |

## Changes made

- `a7dc515674f` — merge `origin/dev`. The conflict was real: dev restructured the `X` shape block to
  handle null/empty matrices (snapatac fragment-only files). The original fix was re-applied inside
  dev's new "X matrix has actual data" branch, preserving the PR's intent verbatim.
- `27ec0db7799` — generalize to the comprehension form; append tests to the existing
  `test/unit/data/datatypes/test_anndata.py`.

Net diff against dev is one line of production code.

## Verification

- Red-to-green: with the fix reverted to dev's `tuple(shape)`, the 4 new sparse cases fail on the
  type assertion (the equality assertion still passes — numpy ints compare equal, so the type check
  is what catches it). With the fix, **11 passed**.
- Full `test/unit/data/datatypes/`: **275 passed, 4 failed**. The 4 (`test_bam.py` x2,
  `test_bcf.py`, `test_validation.py::test_bam_validation`) reproduce identically with our changes
  stashed — pre-existing, environment-related, not ours.
- `black --check`: clean on both changed files.
- Environment: borrowed the read-only `.venv` from the 21391 worktree (Python 3.14.3, h5py 3.16.0)
  with `PYTHONPATH` pointed at this worktree's `lib`; import resolution confirmed before running.
  No environment was modified. ruff/flake8 were not available there, so only black was checked
  locally — CI covers the rest.

## Not done / open

- **No GitHub reply posted.** bernt-matthias's three comments are addressed in code but nobody has
  told him so. A reply is needed, particularly for point 1, where the answer is "no, and here's
  why" rather than compliance.
- **Third unfixed site, out of scope.** `set_meta` also does
  `dataset.metadata.shape = anndata_file.attrs.get("shape", dataset.metadata.shape)` at the *root*
  level — same numpy hazard, and it assigns the raw ndarray rather than a tuple. The adjacent
  comment says "none of the above appear to work in any dataset tested", so it looks latent/dead.
  Flagged rather than fixed, to keep someone else's PR minimal.
- CI has not run yet on `27ec0db7799`.
