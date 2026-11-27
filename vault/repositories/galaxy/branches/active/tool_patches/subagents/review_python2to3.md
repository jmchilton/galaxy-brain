# Review debrief: python2to3 patch kind and verbatim keys (branch 2)

The review covered the three branch 2 commits on top of `8bb1573a319` and the collection-side machinery. Below are the Galaxy findings and what was done. Every Galaxy finding was acted on except two, listed after the table. The collection-side findings were fixed in the collection repository. It is private, so they are not recorded here.

Final branch 2 commits:

- `fde25386c63` Read tool patch key segments verbatim. This includes a guard so that a key whose segments aren't path segments has no coverage.
- `8d137829f9e` Add the python2to3 tool patch kind.
- `83107e392c0` Tool patches: python2to3 review fixes.

| Finding | Action |
|---|---|
| `PYTHON2TO3_PATH` used `re.match` with `$`, so `path: "command\n"` validated | Fixed: `re.fullmatch`, plus an invalid-file case |
| `_override_usable`: in an override without security ops, a python2to3 mismatch made the whole override unusable | Fixed: python2to3 states never decide; test added |
| A python2to3 mismatch generated a `revision_mismatch` advisory ("update the repository") although nothing is wrong for an admin | Fixed: the mismatch state is recorded with no generated advisory |
| Coverage lookup built a path from key segments, safe only because only registered keys reach it | Fixed: segments that aren't path segments read no coverage. The guard sits in the verbatim commit, so that commit stays separable |
| Index schema hash re-pin | Expected, because the stored patch state's `kind` literal grew. It invalidates deployed index bundles, as the earlier level rename did |

## Not acted on

- **`test_segments_are_stored_verbatim` is trivial:** kept. It pins the verbatim contract on the segment shapes the old encoding mangled.
- **Pre-existing, not this branch:** collection lint accepts a compat file at `identical` with no `reproducibility_reason`, and Galaxy rejects it. No such file exists. Reported to the coordinator.

## Details

Verified by the reviewer:

- The verbatim change is complete: coverage path, overrides, `_local` and refused prefixes. No reference to the old encoding remains.
- Unit order is python2to3, then security, then compat.
- python2to3 units are never demoted by caps, never need `needed_from`, and never block the job cache (they report `identical`).
- `_unit_fields` and `policy_governs` are correct for mixed files with and without security ops.
- Unit tests: `test_tool_patches.py` and `test_index_versions.py` passed (235).

Cross-repo divergences found:

- A mixed security+python2to3 file with `galaxy_change` or `needed_from` passed collection lint, but Galaxy refuses it. Collection lint now refuses it too.
- A `command\n` path passed Galaxy and was refused by the collection. Galaxy now refuses it too.

After the fixes: 582 unit tests passed (patches, source store, toolbox, cached tool, store selection, populate store). black, isort, ruff and mypy are clean on the changed files.

Separate finding, not fixed (decision for John): Galaxy's `verified` flag compares `sha256(tool_source.to_string())` against the coverage `expanded_sha256`. The collection records `expanded_sha256` as a sha256 over the c14n serialisation, so real collection content always loads as "applied (unverified)". Either side could change. Galaxy reading c14n is the smaller change, but it shifts what `verified` means for existing coverage.
