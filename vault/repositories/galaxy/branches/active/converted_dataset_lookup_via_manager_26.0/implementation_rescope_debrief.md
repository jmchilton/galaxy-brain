# Re-scope debrief

Scope evaluation recommended a modest expansion. Original kept as `converted_dataset_lookup_via_manager_26.0_alt_original_scope` (see alts/original_scope.md).

Done:
- `visualization/data_providers/registry.py`: named-provider conversions go through `hda_manager.get_accessible_converted`.
- `api/users.py` pending-`len` 400: added, then dropped after review (unreachable; no converter deps for len/linecount).

Not done (deviation from scope eval):
- `managers/dbkeys.py`, `visualization/genomes.py`: read the build's stored fasta/len ids, which are checked when the build is saved (`add_custom_builds`). They have no manager wired in and `dbkeys` also runs in job context; plumbing a manager through is churn for a release backport. `genomes.py`'s lookup of another owner's dbkey is a separate design question.

No new tests: no provider/test tool exercises the registry conversion path or a pending `len` cheaply. Existing custom-build and `raw_data` provider tests re-run.
