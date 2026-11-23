Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 677cab47347c1b40acf2988bed2f8ae18507ca9e

The one-way risks are the admin-facing resubmit vocabulary: new condition names (`node_failure`, `preempted`, `runner_state`), the narrowed meaning of `unknown_error`, and the `resubmission_count`/`runner_state` wire contract with Pulsar all become things job configs and Pulsar releases depend on.

<details><summary>Risk Details</summary>

- `condition: unknown_error` no longer matches node failures or preemption; existing job confs that relied on it silently stop resubmitting those jobs unless admins add `node_failure`/`preempted`. Needs a release note.
- `cancelled` is never resubmitted, even under `any_failure` - a behaviour change for sites whose rules expected external cancellations to retry.
- New condition variables (`node_failure`, `preempted`, `runner_state == '...'`) become part of the job_conf resubmit expression language; renaming or removing them later breaks admin configs.
- Unknown runner states from a newer Pulsar are mapped onto `unknown_error = True` while also exposed as `runner_state`; this compatibility rule is hard to change once admins write rules against it.
- `resubmission_count` sent in client params and the `runner_state` / `runner_state_message` fields read from `full_status()` form a cross-project protocol with galaxyproject/pulsar#570; the shape is fixed once both sides are released.
- Resubmitting to Pulsar now calls `client.clean()` on the previous attempt before setup - a destructive step on remote job directories (failures are swallowed at debug level).
- Pulsar jobs whose tool output indicates failure now consult resubmit rules before metadata/finish; destinations with broad rules (`any_failure`) may start resubmitting tool errors that previously errored once.
- `job_pair_for_id` now overrides persisted destinations' `resubmit` with the currently configured destination's rules, so config edits affect in-flight jobs after restart.
- CLI runner OOM message wording changes; minor, user-visible only.
- Slurm `scontrol`/`sacct` code moved to a shared module mirrored with Pulsar; refactor, two-way, but drift between the copies is a maintenance risk.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should focus on the resubmit condition vocabulary in `runner_state_definitions.py` and `state_handlers/resubmit.py`: confirm the names and the narrowed `unknown_error` semantics are what admins should commit to, and that the release notes and `doc/source/admin/jobs.md` say so clearly. The unknown-reason fallback (regex-validated `runner_state` plus `unknown_error`) deserves a deliberate decision, since it is the forward-compatibility policy for future Pulsar reasons.

On the Pulsar side, check the `resubmission_count` / `full_status` contract against galaxyproject/pulsar#570 before either releases, and look at `__discard_previous_attempt` and `_resubmitted_for_tool_failure` to make sure cleanup and tool-detected resubmission cannot discard results of a job that should simply finish as errored.

</details>
