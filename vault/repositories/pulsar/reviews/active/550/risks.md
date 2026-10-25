Profile: generic_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 324522637c196af357cdffadb2f07a81e939d90c

The manager itself is opt-in, but the PR adds public contracts that are hard to walk back once Galaxy or deployments depend on them: a new REST route and client method (`PUT /jobs/{job_id}/collection`, `acknowledge_collection`), a versioned `detached_local` capability block in `system_properties`, and an on-disk manifest/record format that must still parse after upgrades because jobs outlive Pulsar restarts.

<details><summary>Risk Details</summary>

- `PUT /jobs/{job_id}/collection` and `JobClient.acknowledge_collection` become client/server API; once a Galaxy release calls them, renaming or removing them breaks mixed-version deployments.
- `system_properties()["detached_local"]` (`schema: 1`, `asynchronous_cancel`, `collection_ack`, `execution_policy`) is a capability contract Galaxy would branch on; its key names and semantics get frozen at first consumer.
- Manifest, worker, ack and clean JSON files in the staging directory are durable state read by detached workers and by a restarted Pulsar. Format changes in later releases need migration or compatibility code, since in-flight jobs span upgrades.
- Staging is deleted only after both `clean` and `acknowledge_collection`. Clients that never acknowledge (any current Galaxy) leave every job directory on disk indefinitely, so disk use grows until a client update ships.
- The per-`staging_directory` capacity file rejects a later config with different capacity (`Conflicting detached_local capacity`), so changing `num_concurrent_jobs` on an existing staging directory needs operator action.
- `StatefulManagerProxy` (shared by every stateful manager) gains new launch/cancel/status paths; they are gated on the detached capability, so other managers should be unaffected, but the gate is the only protection.
- Detached workers survive Pulsar exit and signal process groups (`os.killpg`) and Docker containers they recorded; a mistake in identity checks after PID reuse or a host change would signal unrelated processes. Rolling back the code does not stop already-detached workers.

</details>

<details><summary>Risk Review Advice</summary>

Humans should settle the public names and semantics before merge: the `collection` route and method, the `detached_local` capability keys, and whether clean-requires-ack is the intended default given that no released Galaxy sends the ack. Confirm a plan for Galaxy-side adoption and for versioning the manifest format, since those are what make this a one-way door.

Also read the `stateful.py` hunks carefully, as they touch every stateful deployment, and the process-group/container identity checks in `pulsar/managers/util/detached_worker.py` (`command_group_status`, `signal_command`, `_stop_containers`), where an error would kill the wrong process or leak running jobs past a rollback.

</details>
