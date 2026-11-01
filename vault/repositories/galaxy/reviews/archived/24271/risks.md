Profile gx_risk_assessment, claude-opus-5-5 at low effort, reviewed commit 2959dfdd4dce4a85e69c6a5b6a2b0c181981eb28.

The one lasting commitment is `JobConfiguration.set_dynamic_destination_tags(source, tags)`: a new public hook that TPV and other dynamic rules will call, so its name, signature, and replace-per-source semantics become hard to change once a TPV release depends on it. The rest is cheap to roll back.

<details><summary>Risk Details</summary>

- New public extension point (`set_dynamic_destination_tags` / `get_destination_ids_for_tag`) is effectively an API contract with TPV; changing it later means coordinating releases across both projects.
- Admin-visible behavior change: `destination_user_concurrent_jobs` tag limits are now also enforced atomically in `queue_with_limit`, not only in the handler's in-memory pass. Deployments with these limits configured may see jobs held that were previously let through under races.
- Tag limits now count jobs in runtime-created destination IDs once registered, so existing tag limits can start throttling more jobs on sites that adopt a TPV version calling the hook.
- Registrations are in-memory per process and are replaced wholesale with `{None: ...}` whenever the job config is parsed; each handler process has to register its own, and the caller has to register again after any re-parse.
- Accounting goes by `destination_id`: if a dynamic rule reuses or renames IDs, jobs can be over- or under-counted. Stale registrations stay until the source clears them.
- Docs and sample config describe the behavior only in terms of TPV.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should focus on the shape of `set_dynamic_destination_tags`: is a source-keyed, full-replace mapping of tag to destination IDs the interface TPV maintainers want long term, and is a matching TPV change ready so the hook isn't speculative? Agree on it with TPV before merge, since it's the part that's hard to walk back.

Also confirm that enforcing user tag limits in `queue_with_limit` is the intended change for existing deployments (worth a release note), and check what happens across job config re-parse and multiple handler processes, where dynamic registrations aren't shared.

</details>
