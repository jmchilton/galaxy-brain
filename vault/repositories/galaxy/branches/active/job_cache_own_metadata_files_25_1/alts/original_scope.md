# Alt: original scope

Branch: `job_cache_own_metadata_files_25_1_alt_original_scope` on the `jmchilton` fork, at `da18684880d`.

This is the branch as first hardened, before the re-scope. It gives job cache outputs their own metadata files at both cache entry points (the submission search in `DefaultToolAction` and `HDA.copy_from(include_metadata=True)`) and makes `FileParameter.make_copy` flush each new row instead of committing under `store_by: id`. It includes the tests from the first hardening round.

How it differs from the parent: it leaves the `elif replacement_dataset:` branch of in-place deferred materialization (`lib/galaxy/model/deferred.py`) assigning the replacement HDA's `_metadata` raw. The parent copies it through the `metadata` setter and adds `test_in_place_materialization_from_replacement_owns_metadata_files`. The first scope evaluation recommended that addition (`earlier_drafts/1/scope_evaluation.md`).
