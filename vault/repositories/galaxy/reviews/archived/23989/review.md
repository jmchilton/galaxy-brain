# galaxy#23989 - Add NVIDIA L4 GPU support to the GCP Batch job runner

- Author: ksuderman
- Reviewed head: `8e5b3d5a4629a45dcd6579333ea8a425e6974ad8` (diffed against merge-base `e4732fcca72` with origin/dev)
- Size: +553/-13, 5 files (`gcp_batch.py`, `util/gcp_batch/{__init__,helpers}.py`, `container_script.sh`, unit tests)
- Prior review: author-posted Codex review on `79daa13` (explicit G2 machine type didn't get `--gpus all`; `gpus: 0` resource param didn't override destination). Both fixed in `8e5b3d5` with tests.
- Tests: `test/unit/app/jobs/test_gcp_batch_runner.py` - 245 passed locally (GCP Batch SDK `google-cloud-batch 0.22.4` installed in the main galaxy venv). Not run against real GCP.

## Verdict

Approve with suggestions. The change is small and self-contained, lives inside a runner the author maintains, and the config names (`gpus`, `install_gpu_drivers`) are generic and line up with TPV's `gpus` field. The suggestions concern a TPV interpolation failure mode, a silent under-provisioning case, and making the L4 table extensible to other accelerators. None of them block.

## Findings

1. **`gpus: "{gpus}"` fails CPU jobs on a shared destination.** TPV's `gpus` defaults to `None`, and TPV evaluates params as f-strings, so a tool with no GPU request renders `"None"`. `resolve_gpu_count("None")` raises `Invalid GPU request 'None'` and the job fails (verified). The PR example avoids this only because the destination `require`s the `gpu` tag. Admins will copy that example onto a general-purpose gcp_batch destination. Either treat `"None"` as 0 (pragmatic, since it's exactly what TPV emits) or document `gpus: "{gpus or 0}"`.
2. **A pinned G2 `machine_type` silently overrides a larger GPU request.** With `machine_type: g2-standard-4` and `gpus: 4`, the runner uses g2-standard-4, which has 1 L4, and the job gets 1 GPU without any warning. `gpu_count_for_machine_type()` already exists, so the fix is a cheap check: if `gpus > gpu_count_for_machine_type(configured)`, raise (or log loudly). Similarly, an explicit `gpus: 0` resource param can't opt out of a pinned G2 type, because it falls through to `gpu_count_for_machine_type`. That may be intended, but it isn't tested or stated.
3. **`machine_type` semantics now depend on the prefix.** Before this PR, the `machine_type` param (default `n2-standard-4`) was ignored entirely and `compute_machine_type()` always picked the type. Now it is honored only when it starts with `g2-`. An admin who pins `a2-highgpu-1g` or `n1-standard-8` + T4 gets a computed n2 shape and no `--gpus`. This sibling divergence inside one param should at least be stated in the param comment. Better, state it in a sample config (see 5).
4. **The L4 table could be the seed of a reusable abstraction rather than an L4-only one.** `L4_GPU_MACHINE_TYPES` is a list of positional tuples indexed by `entry[2]`, and `gpu_count_for_machine_type` hardcodes the `g2-` prefix. GCP bundles GPUs into machine types in the same way for A2/A3 (A100/H100), and N1 uses `InstancePolicy.accelerators`. A small `NamedTuple` (`GpuMachineShape(machine_type, vcpu, memory_mib, gpu_count)`) keyed by accelerator type (`{"nvidia-l4": [...]}`) would make a future `gpu_type` param (default `nvidia-l4`) a data-only addition, and it would replace the `entry[2]` indexing with named fields. Not required for this PR, but the rename now is cheap and prevents the next accelerator from forking the code path.
5. **The config surface is undocumented outside code comments.** `job_conf.sample.yml` and `job_conf.xml.sample_advanced` have no `gcp_batch` runner entry at all (pre-existing gap; only Pulsar's GCP Batch is shown). The AWS Batch GPU destination is documented there (`gpu`), as is HTCondor's (`request_gpus`). Adding a short gcp_batch block with `gpus`, `install_gpu_drivers`, `machine_type` and `custom_vm_image` would pin down the semantics admins will depend on. Name divergence is a fact to note rather than fix: AWS Batch `gpu`, HTCondor `request_gpus`, gcp_batch `gpus`. Of these, `gpus` matches TPV, which is the right choice.
6. **Was the default-image path verified?** The tested path in the PR body is `install_gpu_drivers: false` + a custom image. `docker run --gpus all` from a script runnable requires the NVIDIA container toolkit on the host, not just drivers. It's worth confirming that the default Batch image with `install_gpu_drivers: true` actually supports `--gpus` (or saying the default image isn't supported for GPU jobs).
7. **Comment volume.** Several rationale blocks are repeated three times: "resolved once so they agree", the explanation of the `string_as_bool` vs `bool` mapping, and the claim that G2 bundles its GPUs. Some comments restate the next line, such as `# Compute appropriate machine type based on resource requirements` and the `_create_direct_execution_script` docstring addition. Trimming to one statement each would read better. Minor.

Fine as is:
- Imports are at module top (`math`, `string_as_bool`), consistent with the runner's unguarded top-level google imports.
- No hardcoded zones, regions or driver versions were added. `zone` is still unused by the runner, which is pre-existing.
- Precedence (resource param > destination) matches `cores`/`mem`.
- `compute_gpu_machine_type` raises legibly, and `queue_job` turns that into a job failure.
- Tests are meaningful. The `TestCreateBatchJobSpecGpu`/`TestInstallGpuDrivers` cases build a real `batch_v1.Job` spec through `_create_batch_job_spec` and assert on machine type, driver flag and rendered script. They are not trivial mocks. Some helper-level parametrization overlaps with the spec-level tests but is cheap.

## Risks

The new admin-facing destination params `gpus` and `install_gpu_drivers` (and the rule that a `g2-*` `machine_type` is honored) become job_conf/TPV config that admins will write, so their names and semantics are mildly sticky; everything else is runner-internal and easy to change.

<details><summary>Risk Details</summary>

- `gpus` is defined as "number of whole L4 GPUs, fractions rounded up". Adding other accelerator types later needs a new param (e.g. `gpu_type`) defaulting to L4 to stay backward compatible.
- `install_gpu_drivers` defaults to true. Changing the default later would change the boot behavior and cost of existing GPU destinations.
- `machine_type` is now honored only for `g2-*` values and ignored otherwise. Admins may come to rely on that asymmetry.
- `gpus: "{gpus}"` interpolation of an unset TPV value (`"None"`) fails jobs rather than meaning 0.
- A pinned G2 type smaller than the requested GPU count under-provisions silently.
- The CPU path is unchanged except for an empty `${docker_gpu_flag}` in `docker run`. CPU-job regression risk is low and covered by tests.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether `gpus` + `install_gpu_drivers` are the param names Galaxy wants long-term for cloud GPU destinations, given that AWS Batch uses `gpu` and HTCondor uses `request_gpus`, and whether a `gpu_type` hook should exist now. They should also decide how `machine_type` should behave for non-G2 values.

Operationally, check the TPV example: an unset `gpus` should not fail CPU jobs on a shared destination. Also check that `--gpus all` works on the default Batch VM image, not only on the custom image the author tested.

</details>

## Draft review body

> Posted by Claude (AI assistant) on behalf of jmchilton - not authored by jmchilton personally.

Thanks, this is a nicely contained addition, and the spec-level tests (building a real `batch_v1.Job` and asserting on machine type, driver flag and the rendered `docker run`) are a good model. I think this is close. A few suggestions, none blocking:

1. **TPV `"{gpus}"` with no GPU request.** TPV's `gpus` defaults to `None` and params are rendered as f-strings, so a CPU tool landing on a destination with `gpus: "{gpus}"` gets `"None"`, and `resolve_gpu_count("None")` fails the job. Your example avoids it via `require: gpu`, but people will copy it onto a shared destination. Treating `"None"` as 0, or documenting `gpus: "{gpus or 0}"`, would avoid a confusing failure.
2. **Pinned G2 type vs. requested count.** With `machine_type: g2-standard-4` and `gpus: 4`, the pinned type wins and the job silently gets 1 L4. Since `gpu_count_for_machine_type()` is already there, raising (or at least warning) when `gpus` exceeds the pinned shape's count seems cheap.
3. **`machine_type` semantics.** `machine_type` used to be ignored entirely. Now it's honored only for `g2-*`, so e.g. `a2-highgpu-1g` is still silently replaced by a computed n2 shape. Could the param comment (or a sample config) say that?
4. **Room for the next accelerator.** Would you consider making the shape table a small `NamedTuple` keyed by accelerator type (e.g. `{"nvidia-l4": [GpuMachineShape(...), ...]}`) instead of positional tuples indexed by `entry[2]` plus a hardcoded `g2-` prefix? Then A100/H100 (A2/A3, also bundled) or a future `gpu_type` param would be data-only additions. Not needed for this PR, but the shape is cheap to set now.
5. **Docs.** `job_conf.sample.yml` has no `gcp_batch` runner block at all (pre-existing), while AWS Batch and HTCondor GPU params are shown there. A short gcp_batch example with `gpus`, `install_gpu_drivers`, `machine_type` and `custom_vm_image` would help admins and pin down the semantics.
6. **Default image.** The manual test used a custom image with drivers baked in. Has `install_gpu_drivers: true` on the default Batch image been checked with `docker run --gpus all`? That needs the NVIDIA container toolkit on the host, not just the drivers.
7. Small: several rationale comments are repeated in two or three places (resolve-once, `string_as_bool` vs `bool`, G2 bundling). One copy of each would read better.

## Risks

The new admin-facing destination params `gpus` and `install_gpu_drivers` (and the rule that a `g2-*` `machine_type` is honored) become job_conf/TPV config that admins will write, so their names and semantics are mildly sticky; everything else is runner-internal and easy to change.

<details><summary>Risk Details</summary>

- `gpus` means "whole L4 GPUs, fractions rounded up". Other accelerators will need an additional param defaulting to L4 to stay compatible.
- The `install_gpu_drivers` default (true) sets boot behavior and cost for existing GPU destinations.
- `machine_type` is honored only for `g2-*` values.
- An unset TPV `gpus` interpolated as `"None"` fails jobs.
- A pinned G2 type smaller than the request under-provisions silently.

</details>

<details><summary>Risk Review Advice</summary>

Check that `gpus`/`install_gpu_drivers` are the names wanted long-term for cloud GPU destinations (AWS Batch uses `gpu`, HTCondor uses `request_gpus`), and decide whether `machine_type` should be honored more generally. Operationally, confirm the TPV example doesn't fail CPU jobs on shared destinations, and that `--gpus all` works on the default Batch image.

</details>
