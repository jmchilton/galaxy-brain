# PR 472 — Support a custom VM boot disk image and size for GCP Batch

PR: https://github.com/galaxyproject/pulsar/pull/472

Reviewed current head `4b676010b9148dd78012995e1cd6d6e942bb0190` on 2026-09-04.

## Recommendation

The core implementation is correct and consistent with Galaxy's native GCP Batch
runner: when a custom image is configured, both paths assign it to
`AllocationPolicy.InstancePolicy.boot_disk.image`, and both can set
`boot_disk.size_gb`. Existing Pulsar destinations remain unchanged when the new
parameters are absent.

I would ask for one small test/validation follow-up before merging. There is no
architectural blocker, and the change should merge before PR #493 to make that PR's
minor field-list conflict straightforward to resolve.

## Findings

### Tests do not exercise either new field

The PR changes only `pulsar/client/container_job_config.py`; it does not add a test.
The existing `test_gcp_job_template` checks only that one task volume exists, so the
full suite can remain green if the custom image or size is no longer attached to the
instance policy.

Add focused assertions for at least:

- `custom_vm_image` becomes
  `job.allocation_policy.instances[0].policy.boot_disk.image`;
- `boot_disk_size_gb` becomes the boot disk's `size_gb` when an image is set; and
- omitting both fields preserves the existing unset/default boot-disk behavior.

The existing focused test file passes (`4 passed`), but none of those tests covers
the PR.

### Non-positive boot-disk sizes are accepted and sent to Batch

`boot_disk_size_gb` is an unconstrained `Optional[int]`. Zero is silently ignored by
the truthiness check, while a negative value is serialized into the Batch request.
Both are invalid configurations and should fail while parsing the destination rather
than at GCP submission time. A positive constraint and an explicit `is not None`
check would make the contract unambiguous. This is small enough to include with the
tests, although Galaxy's native runner currently has the same loose validation.

## Galaxy consistency

Galaxy PR #23068 is merged. It adds `custom_vm_image` to `PULSAR_PARAM_SPECS` and
copies a runner-level value into the destination unless the destination already has
one. That matches this PR's field name and provides the expected destination-wins
precedence.

There is one known integration gap: Galaxy's `PASSTHROUGH_PARAMS` contains only
`custom_vm_image`, not `boot_disk_size_gb`. Consequently:

- both values work when supplied directly in a Pulsar/TPV destination;
- a runner-level custom image reaches Pulsar; but
- a runner-level boot disk size does not, so installations using an image larger
  than the provider default must repeat the size in destinations.

The Galaxy companion PR explicitly recorded adding `boot_disk_size_gb` as later work,
so this does not block the Pulsar implementation. It should be followed up in Galaxy.
Galaxy's native runner also sets `boot_disk.type_` and always provides a boot-disk
size (default 100 GB), whereas Pulsar leaves provider defaults in effect unless the
new fields are supplied. That is an intentional/default-policy difference, not an API
incompatibility.

## Relationship to the Pulsar series

- PR #467 concerns output-collection error handling and does not overlap.
- PR #493 changes the adjacent `machine_type`/resource fields in `GcpJobParams` and
  the same template function. A three-way merge shows a textual conflict only in the
  model's field list; the boot-disk template block itself merges cleanly. Merge #472
  first, then rebase #493 and retain `custom_vm_image` and `boot_disk_size_gb` beside
  the resource fields.
- PR #473 is the older combined resource/lifecycle branch now being superseded by
  smaller PRs; it adds no competing custom-image contract.

## Checks

- GitHub reports the PR mergeable.
- All current Pulsar checks are successful.
- `git diff --check` passes.
- `pytest -q test/container_job_config_test.py` at the PR head: 4 passed (with two
  unrelated dependency deprecation warnings).
