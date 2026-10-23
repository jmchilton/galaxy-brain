Profile: gx_risk_assessment · Model: claude-opus-5-5 · Effort: low · Reviewed commit: 2273ae0bca5

The only one-way-ish risk is a behavior change on a release branch: a discovered output collection from an errored job that found no elements now ends `populated_state: failed` instead of populated-and-empty, which changes the downstream outcome for workflows (failed invocation instead of a "successful" empty map-over). Otherwise it's a small two-way door that's easy to revert.

<details><summary>Risk Details</summary>

- Workflows that used to "complete" after a producer step errored with no outputs (the mapped steps ran zero jobs) now fail with `collection_failed`. Users or automation relying on the old completion, for example with error-tolerant steps or reruns, will see different invocation states after a 26.1 point release.
- The check only fires when `final_job_state == "error"` and the collection is empty. If an errored job discovered even one element, the collection stays populated with no warning, so the fix covers only part of the problem and that remaining behavior is now effectively locked in.
- Collections that are legitimately allowed to be empty but come from an errored job (for example, a tool that errors but has outputs meant to be inspected) now become failed collections. That affects history display and anything that consumes failed collections, including the job/collection rerun and remap paths.
- The extended-metadata path depends on `job_context.add_dataset_collection` running after the new call so that the failed state gets serialized. It does run (it is the unconditional call after the try block), but the only test is a plain API workflow test, so nothing exercises extended metadata or Pulsar.
- The PR adds a new test tool (`collection_creates_dynamic_list_failbool`) to `sample_tool_conf.xml`. This is test-only and reversible.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether the new semantics belong in a 26.1 point release: "an errored job with an empty discovered collection fails the collection, and therefore the invocation". The precedent is the existing `MaxDiscoveredFilesExceededError`/security branches, which already mark collections failed. Check that the empty-only condition is the intended scope rather than failing on any errored job.

Also confirm that failed collections from errored jobs still behave sensibly for job rerun/remap (`remap` of dependent paused jobs) and in the history UI, and consider whether an extended-metadata test configuration should cover the serialization of the new state.

</details>
