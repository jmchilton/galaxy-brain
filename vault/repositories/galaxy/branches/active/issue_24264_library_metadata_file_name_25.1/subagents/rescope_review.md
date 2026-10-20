# Re-scope review

The review of `817906cc75a` (the extra-files guard) found no blockers and no security issues. I acted on the main finding: the unit test had no positive control, so I added an assertion that the helper returns the real `extra_files_path` before the backend is removed. That change is squashed into `9a1313d67d2`.

Not acted on:

- The serializer line has no direct test, because a manager-level test on a distributed store is too much setup for this PR. `test_HDAManager.py` covers the happy path. I'll note this in the PR.
- The helpers differ on purpose. The metadata one catches the raised error; the extra-files one checks first, so `get_extra_files_path` write paths stay unchanged. I'll note this in the PR.
- Hierarchical store with a missing file: before this change, `extra_files_path` came back as a made-up directory; now it's `None`. One rare regression remains: a `Dataset` constructed with an explicit `_extra_files_path` in that situation now gets `None`. Not worth handling.
- The invalid-id case logs two warnings (the store logs too). Same pattern already accepted for metadata.

<details>
<summary>Full review</summary>

1. Low: `test_galaxy_mapping.py:250` has no positive control. Add `assert helper() == extra_files_path` before setting the backend to `removed_backend`. **Done.**
2. Low: `datasets.py:303` the serializer change isn't exercised by any test.
3. Info: the two helpers are deliberately asymmetric. Naming, return type and logging are consistent. Returning `None` instead of `skip()` is the better choice.
4. Info: hierarchical stores now behave better. The `_extra_files_path` constructor-arg edge case is very rare.
5. Info: double warning, plus one extra `get_store_by` call on an admin/`expose_dataset_path` path.

Verified fine:

- The predicate exactly matches when distributed `_construct_path` hits a `KeyError`.
- `external_extra_files_path` is read with `getattr`.
- The red check is right: the same setup raises `KeyError('removed_backend')` and `KeyError(None)`.
- Tests pass: 41 passed in `test_galaxy_mapping` + `test_HDAManager`.
- Merge-forward to dev adds no new conflicts.
- The whole branch follows one rule: read paths degrade to `None`, write paths fail with a typed error. About 65 lines.

</details>
