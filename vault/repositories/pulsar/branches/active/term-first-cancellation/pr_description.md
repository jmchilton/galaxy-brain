Toward 🎯 #541 — give cancelled jobs time to run their EXIT cleanup before forcing termination.

**This changes cancellation through managers using `kill_pid`, including unqueued and `queued_python` jobs.** That path currently kills a Docker-backed job's wrapper immediately, skipping the EXIT trap that stops its container. A shell regression with a fake Docker client reproduces the missing cleanup marker on master and writes it with this change. **This proves the shell cleanup mechanism; a real Docker/InteractiveTool cancellation has not been exercised.**

Cancellation sends TERM to the captured process tree, waits up to five seconds by default, then kills survivors, including descendants started during cleanup while their captured ancestor remains alive. **The grace period is a `kill_pid` API argument, not a new manager configuration option.** The stock POSIX path shares that setting. **Windows keeps its forceful termination behavior.**

## Risks

This is reversible code, but cancellation now permits a job to continue running during a bounded cleanup interval.

<details><summary>Risk Details</summary>

- Busy or stalled cleanup is killed after the grace period; Docker cleanup may still fail or take longer.
- Descendants that detach and lose their captured ancestors during cleanup may evade discovery.
- No Docker daemon or Windows runtime validation was performed.

</details>

<details><summary>Risk Review Advice</summary>

Check cancellation responsiveness and real Docker/InteractiveTool cleanup before relying on this operationally. Ancestors receive TERM before descendants so child termination cannot start an EXIT trap that a later TERM interrupts.

</details>

## Context

Addresses the cancellation helper in Pulsar #541. **This PR is independently functional; no Galaxy companion change is required.** Galaxy's matching helper can be updated at the next sync: it has no callers in the checked Galaxy tree, and the local runner uses `kill_pg`. **The independent trap-composition issue #542 is outside this branch.**

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No blocking structural findings; grace-period validation was added.</summary>

Normal review also identified and reproduced cleanup subprocesses escaping the original snapshot; escalation now refreshes surviving descendants. Focused cancellation and manager tests: 20 passed. [Fork Pulsar CI](https://github.com/jmchilton/pulsar/actions/runs/40449379279) passes, including the test matrix, lint, and type checks. The broader local suite has 11 missing-dependency failures (pycurl, kombu, pykube); 453 passed and 136 skipped. The separate [framework run](https://github.com/jmchilton/pulsar/actions/runs/40449379326) fails collecting Galaxy master tests because `pulsar.client` does not export `build_client_manager`; this branch changes only the cancellation helper and its tests.

</details>
