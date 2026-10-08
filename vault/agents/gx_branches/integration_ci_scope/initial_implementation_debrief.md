# Initial implementation: change-aware integration CI

Implemented 2026-10-08 in `/Users/jxc755/projects/worktrees/galaxy/branch/integration_ci_scope`, independently based on dev `65421d5f420`; not stacked on the earlier workflow-routing branch.

User request: avoid repeatedly booting odd job runners and remote objectstores for changes outside their plumbing/plugins, using changed-file environment flags while retaining broad API job coverage.

The standard-library `scripts/select_integration_tests.py` reads the Actions event and Git history, classifies a PR merge-base/head or push before/after diff (old and new rename paths included), and writes a versioned `GALAXY_TEST_CI_SELECTION` plus utilities/job/objectstore plumbing flags to GITHUB_ENV. Shared infrastructure/dependency/util/model/config/tool/metadata/datatype/job/objectstore code conservatively selects all expensive families; direct known plugin changes select their families. Missing/invalid comparison history, scheduled/manual events, absent/malformed selection, unmarked/unknown test families retain full coverage.

The integration pytest hook applies explicit `ci_integration_family` module/class/function marks before fixtures and before whole-group duration sharding. Kubernetes, container/real-HTCondor, all embedded Pulsar variants, and remote S3/cloud/Azure/Onedata/Rucio/iRODS suites are marked. Generated test_tools inherit module marks; mixed iRODS/disk upload functions and real/fake HTCondor tests are marked individually, preserving general and local-disk tests. Any valid inherited family is sufficient to retain a test; malformed/unknown marks retain it unconditionally.

Root review caught generated test_tools escaping class-only registration and pytest inherited class markers taking precedence over the presumed subclass override. The implementation switched to explicit module marks and OR across inherited dependencies, with subprocess regressions. Test edits that change shared containerized-job helpers also select Kubernetes/Pulsar callers.

Initial validation: 38 focused tests passed (30 selector tests exercising real Git and pytest subprocesses; 8 existing shard tests). Formatting, diff whitespace, and actionlint passed with two verified baseline SC2086 shell diagnostics excluded. Root real-suite collection: full1745; unrelated selection1467 with278 deselected; S3 selection1516; corrected cloud collection being checked. Application/container execution has not been benchmarked, so no wall-clock savings claim.

Infrastructure remains unchanged: Minikube hosts PostgreSQL/RabbitMQ needed by general suites; unconditional suites still use containers/Apptainer. This pass does not gate infrastructure preparation or migrate shared services. A follow-up can decouple that setup once the selection policy is measured in CI.

Next: independent correctness/clarity review and required test challenge, scope evaluation, final implementation debrief, commit/push and branch-manager handoff. No PR opening by the implementation agent.
