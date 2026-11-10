Profile: generic_risk_assessment · Claude Opus 5.5 · effort low · reviewed `a08303706ea4b66fc46b5f03a5016b355e0e1414`

The one-way door is the new opt-in collection-acknowledgment wire protocol (`require_collection_ack` setup param, `PUT /jobs/{job_id}/collection`, the `collection_ack: {schema: 1}` system property, and on-disk `collection_*` metadata). Once released and adopted by Galaxy or other clients it must be supported across mixed client/server versions; the EngageQueue plugin itself is optional and mostly reversible.

<details><summary>Risk Details</summary>

- The new route, client command, setup flag and `system_properties()` key become public API on release; renaming or reshaping them later breaks clients that opted in.
- Clients requiring ack against an older Pulsar raise `RuntimeError` at setup. That's intentional, but it ties client rollout to server upgrades.
- `BaseManager.clean()` now silently skips deleting staging for opted-in jobs until ack. A client that opts in and never acks (crash, lost import) leaks job directories indefinitely; no reaper or timeout exists.
- On-disk metadata (`collection_ack_required`, `collection_clean_requested`, `collection_acknowledged`, `submission_started`, `submission_uncertain`) persists in existing job directories. Removing or renaming these keys later needs migration logic for in-flight jobs.
- One staging-root-wide interprocess lock (`.collection.lock`) serializes cleanup and ack for opted-in jobs across all jobs on a manager; a contention point that is hard to undo once relied on.
- `StatefulManagerProxy` launch/recovery changes are generic code paths gated on a `recoverable_submission` attribute. Nonrecoverable managers should be unaffected, but the reordering of `activate_job` under the status lock and the new `SubmissionUncertain` branch touch every stateful job's lifecycle.
- For recoverable managers, a failed recovery now marks the job preprocessed instead of failing it. Jobs can stay nonterminal indefinitely and need operator inspection.
- `shell/local.py` switches from `check_pg` to `p.poll()`. This fixes swallowed exit codes, but existing CLI job plugins (Slurm, Torque, etc. via local shell) that accidentally relied on "success" after a rejected command will now see real nonzero statuses. That's a behavior change for deployed configs, though easy to revert.
- CI/dev depend on `engagequeue==0.1.1`, a young, single-maintainer-style PyPI package, plus new macOS runner jobs that install Miniforge from a `latest` URL. Supply-chain and flakiness exposure applies to CI only, and it's reversible.
- About 1,600 added lines including a 660-line test file; the external executor's semantics (exit codes, lookup behavior) are encoded in the adapter and docs, which couples Pulsar to that tool's CLI contract.

</details>

<details><summary>Risk Review Advice</summary>

Focus human review on the acknowledgment protocol as a long-lived API: is a separate route plus setup flag the shape Galaxy would actually adopt, does it need a cleanup timeout or admin reaper for never-acked jobs, and should it ship in its own PR separate from the EngageQueue plugin (the PR body already calls it independently useful)? Also confirm the `schema: 1` capability advertisement is the versioning approach maintainers want to commit to.

Second, check the generic `stateful.py` launch/recovery edits and the `local.py` exit-status fix against existing CLI plugins and nonrecoverable managers, since those paths run for every deployment, not just EngageQueue users. The young `engagequeue` dependency is confined to dev/CI and is a two-way door.

</details>
