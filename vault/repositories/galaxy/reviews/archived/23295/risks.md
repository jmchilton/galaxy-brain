Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 73695fa00a6f04195e757b03ea329c16d3e67f95

The main one-way risk is the admin-facing `job_conf.yml` naming convention: `default_<param>` becomes the generic pattern for runner-level destination defaults, and the Pulsar GCP Batch knob is renamed from `custom_vm_image` to `default_custom_vm_image`. That rename is only free while #23068 stays unreleased. #23068 is on `release_26.2`, and there is no `v26.2*` tag yet, so this PR has to reach `release_26.2` before 26.2 ships.

<details><summary>Risk Details</summary>

- #23068 (merge `fb7b5ce3358`) is on `origin/release_26.2` and `dev`, and on no earlier release branch. No `v26.2*` tag exists (latest is `v26.1.1`). If this PR targets only `dev` and 26.2 ships first, 26.2 admins will configure `custom_vm_image`. After the rename, the old key is rejected as an unknown runner param, so their config breaks.
- New convention: any runner can opt in through `runner_default_destination_params` plus a `default_<name>` spec. Once admins use the `default_` prefix, changing it would be a config break.
- The native `gcp_batch.py` runner still reads `custom_vm_image` as a runner-level param, with no `default_` prefix and with the destination value winning. The two GCP runners now spell the same runner-level knob differently, and the new abstraction does not cover the native runner's existing pattern.
- Seeding now runs in `BaseJobRunner.prepare_job` for every runner. The behavior change is inert until a runner opts in, and only Pulsar GCP Batch does. Pulsar never calls `prepare_job`; it seeds once via its own hook.
- Pulsar persists seeded values (`set_job_destination` after submit), so recovery reuses them. A future runner that seeds only in `prepare_job` and never calls `set_job_destination` would lose seeded values on recovery, since `destination_params` is snapshotted at enqueue and recovery doesn't re-seed.
- The new startup `ConfigurationError` catches a runner that lists a param without its spec. This is developer-facing only.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the PR (or a backport) lands on `release_26.2` before 26.2 is tagged. Otherwise the rename becomes a breaking config change with no deprecation path. Without that, keep accepting `custom_vm_image` as a deprecated alias.

Decide whether `default_<param>` is the convention Galaxy wants to standardize. Also decide whether the native `gcp_batch` runner's runner-level `custom_vm_image` (released since `v26.0.0`) should migrate onto the same mechanism with a backward-compatible alias in a follow-up, so the two GCP runners don't diverge.

</details>
