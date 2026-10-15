# issue_20657_input_processing_mode

Status: `branches_implemented_needs_ci`. Base: `dev`.

Explains tool input batching and collection mapping, and fixes collection-type matching (#20657).

[Implementation](implementation_debrief.md) · [plan](plan.md) · [Tracking history](tracking_history.md)

## TICK — 2026-10-11

Current-head client-unit red is the already diagnosed focusOrder/GPopover base failure; all six browser/startup/harness jobs fail restoring client cache before tests. The new E2E hints therefore still lack executed CI evidence; retain needs CI.

## TICK — 2026-10-12

Requested failed-job reruns for the recorded unrelated failures: [run 37667847664](https://github.com/jmchilton/galaxy/actions/runs/37667847664), [run 37667847870](https://github.com/jmchilton/galaxy/actions/runs/37667847870), [run 37667848057](https://github.com/jmchilton/galaxy/actions/runs/37667848057), [run 37667847933](https://github.com/jmchilton/galaxy/actions/runs/37667847933), [run 37667848042](https://github.com/jmchilton/galaxy/actions/runs/37667848042), [run 37667848013](https://github.com/jmchilton/galaxy/actions/runs/37667848013), [run 37667847372](https://github.com/jmchilton/galaxy/actions/runs/37667847372). All requests were accepted; this does not claim a passing rerun or recover an evicted client cache/artifact.

## GOOD_MORNING — 2026-10-13

Requested failed-job reruns for diagnosed unrelated failures: [run 37667847870](https://github.com/jmchilton/galaxy/actions/runs/37667847870), [run 37667847372](https://github.com/jmchilton/galaxy/actions/runs/37667847372), [run 37667847933](https://github.com/jmchilton/galaxy/actions/runs/37667847933), [run 37667847664](https://github.com/jmchilton/galaxy/actions/runs/37667847664), [run 37667848013](https://github.com/jmchilton/galaxy/actions/runs/37667848013), [run 37667848057](https://github.com/jmchilton/galaxy/actions/runs/37667848057), [run 37667848042](https://github.com/jmchilton/galaxy/actions/runs/37667848042). All requests accepted; reruns are pending, not passing coverage.

## TICK — 2026-10-13 evening

Requested failed-job reruns for recorded unrelated failures: [run 37667847372](https://github.com/jmchilton/galaxy/actions/runs/37667847372), [run 37667847870](https://github.com/jmchilton/galaxy/actions/runs/37667847870), [run 37667848042](https://github.com/jmchilton/galaxy/actions/runs/37667848042), [run 37667847664](https://github.com/jmchilton/galaxy/actions/runs/37667847664), [run 37667848057](https://github.com/jmchilton/galaxy/actions/runs/37667848057), [run 37667847933](https://github.com/jmchilton/galaxy/actions/runs/37667847933), [run 37667848013](https://github.com/jmchilton/galaxy/actions/runs/37667848013). All requests accepted. These reruns are pending coverage, not passing results; branch classification is unchanged.

## TICK reruns — 2026-10-15

Requested failed-job reruns for recorded unrelated failures: [run 37667848042](https://github.com/jmchilton/galaxy/actions/runs/37667848042), [run 37667848013](https://github.com/jmchilton/galaxy/actions/runs/37667848013), [run 37667848057](https://github.com/jmchilton/galaxy/actions/runs/37667848057), [run 37667847933](https://github.com/jmchilton/galaxy/actions/runs/37667847933), [run 37667847664](https://github.com/jmchilton/galaxy/actions/runs/37667847664), [run 37667847870](https://github.com/jmchilton/galaxy/actions/runs/37667847870), [run 37667847372](https://github.com/jmchilton/galaxy/actions/runs/37667847372). Requests accepted; reruns are pending evidence, not green results. Existing classification and review holds remain.
