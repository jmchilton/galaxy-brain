Keep the implemented scope: change-aware selection of explicitly marked expensive integration families, with conservative shared-dependency coverage and full runs when selection is unavailable. No scope change or `_alt` branch is recommended. Infrastructure separation and timing measurements should be follow-up work; the present change can reduce per-test container setup, but cannot yet establish a wall-clock saving or eliminate shared infrastructure startup.

## As implemented: expensive-family selection

A changed-path script emits the plumbing flags suggested by the user and an explicit family selection; pytest applies that selection before fixtures and sharding. Direct plugin edits select their dependent families, shared plumbing selects all families, and general integration/API coverage, scheduled/manual runs, and unknown or malformed selection retain coverage.

| Pros | Cons |
| --- | --- |
| • Directly implements the user's proposed approach.<br>• Keeps general, disk, and fake-HTCondor cases running.<br>• Avoids starting deselected families' test fixtures.<br>• Leaves unclassified tests enabled. | • Dependency mappings and marks need maintenance.<br>• Broad shared-path rules limit savings on core backend changes.<br>• Shared Minikube, services, Apptainer, and cache setup still run.<br>• Full history is fetched in each shard. |

<details>
<summary>Evidence and scope boundaries</summary>

Reported real-suite collection is 1,745 tests for a full run and 1,467 retained with 278 deselected for an unrelated change: about 16% fewer collected tests, not a 16% runtime saving. The reported four-shard union contains the retained suite without duplicates or omissions. Correctness and challenge reviews already cover implementation behavior; this evaluation does not repeat those checks.

Review added shared dataset, download, tool-execution, and S3/cloud dependency coverage. Those additions address the stated requirement to run families when their plumbing changes; they do not enlarge the feature into general integration filtering. The reviewer did not identify an unmet requirement to expand the project beyond that boundary.

The distinction between selecting tests and selecting workflow setup matters here. Minikube currently hosts PostgreSQL and RabbitMQ used by unconditional suites, and unconditional tests still need container tooling. Removing that setup using family flags would require changing those dependencies. CI timings should record preparation and test execution separately before claiming savings or deciding the next intervention.
</details>

## Alternative: plumbing flags with coarse all-plugin selection

Keep only broad util/jobs/objectstore flags and run all expensive families whenever their shared subsystem or any plugin changes. This is closer to the simplest version of the user's suggestion, but discards the implemented family-level benefit for isolated plugin changes.

| Pros | Cons |
| --- | --- |
| • Simpler classification policy.<br>• Easier to explain and maintain.<br>• Still skips expensive families for unrelated changes. | • A single plugin edit starts unrelated plugin suites.<br>• Gives up useful precision already implemented.<br>• Keeps the same shared infrastructure costs. |

## Alternative: narrower initial dependency masks

Select only directly edited plugins and a smaller util/jobs/objectstore core, removing the additional shared dataset, download, and execution paths. This would contract the implementation, but would undercut the dependency coverage identified during review.

| Pros | Cons |
| --- | --- |
| • More changes would skip expensive families.<br>• A smaller path list is easier to inspect. | • Shared code can change plugin behavior without touching a plugin file.<br>• API tests do not fully substitute for remote-store or runner integration.<br>• Reverses justified review fixes without evidence that the dependencies are unnecessary. |

## Alternative: gate infrastructure and separate shared services

Extend the branch to move PostgreSQL/RabbitMQ setup out of Minikube where practical, then conditionally install/start Kubernetes and other infrastructure from the family selection. This targets the user's container-fetch/startup concern more directly, but is a separate workflow and service-layout change.

| Pros | Cons |
| --- | --- |
| • Could avoid expensive preparation as well as test fixtures.<br>• Makes infrastructure costs and dependencies explicit. | • Requires migrating services used by unconditional tests.<br>• Creates a larger CI reliability and execution-environment change.<br>• Needs measured timings and full runtime validation to justify the design. |

## Alternative: one detection job and shared outputs

Compute selection once in a preparation job, pass validated outputs to all shards, and retain shallow checkout for test jobs. This preserves the selection scope while changing its workflow integration to avoid four full-history fetches.

| Pros | Cons |
| --- | --- |
| • Removes repeated history retrieval and classification.<br>• Gives shards one shared selection decision. | • Adds job-output propagation and failure handling.<br>• May add scheduling latency.<br>• Benefit depends on checkout cost relative to test/setup time. |

Treat this as an independent optimization after observing CI overhead, rather than a prerequisite for the current feature.

## Alternative: filter the wider integration suite

Extend change-aware selection to ordinary integration tests, or skip integration broadly while relying on API job coverage. This would pursue a larger reduction than the user proposed.

| Pros | Cons |
| --- | --- |
| • Potentially removes much more test execution.<br>• Could eventually support explicit ownership for the full suite. | • Requires a substantially wider dependency model.<br>• Risks losing application/configuration scenarios covered only by integration.<br>• Replaces the deliberate safety boundary of leaving general tests enabled. |

The implemented boundary is the appropriate first step. After CI execution provides setup and family timings, prioritize infrastructure separation if fixed preparation dominates, or refine family dependencies if test execution dominates.
