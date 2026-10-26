Keep the implemented scope: the combined preview/import coverage and both TRS launch-link fixes already include the useful adjacent generalizations; no scope change is recommended.

## Possible Decompositions

The branch could decompose into two independent themes: (1) public-workflow preview → Run → Import baseline coverage and the tab-aware preview helper, with the owned-preview consumer; (2) both TRS launch regressions, exact version/redirect assertions, compatibility baseline, and manual wizard waits. Either theme can land first, each retaining its own baseline-first history. This describes a possible decomposition for John; the requested deliverable remains one combined `release_26.2` branch.

## As implemented

The branch extracts the latest batch's non-gxui Galaxy behavior into seven files, with public and owned preview consumers, automatic list/run destinations, both registry URL forms, both version-query spellings, and exact imported-ID/version assertions. Hardening also removes manual-import sleeps through the existing navigation abstraction and preserves already-working behavior in the first baseline commit.

| Pros | Cons |
| --- | --- |
| • Resolves both launch symptoms together and retains the missing-test framing. | • Combines two independently reviewable UI paths. |
| • Includes reusable navigation and adjacent compatibility coverage rather than a single narrow reproducer. | • Live registry tests depend on remote availability. |

## Expand the registry/version-spelling matrix

Add WorkflowHub run-form cases for both `trs_version` and `trs_version_id`, beyond the current registry-URL run cases and legacy-ID list case. This is a plausible modest expansion, but it does not exercise a distinct query-parser or redirect branch: both spelling cases run through the same client mapping already covered against Dockstore, while WorkflowHub selection/import is independently exercised.

| Pros | Cons |
| --- | --- |
| • Makes the registry/spelling matrix visibly symmetric. | • Adds external requests and runtime without a newly identified behavior gap. |
| • Could isolate a future registry-specific version interpretation failure. | • Current URL and ID cases already assert the actual stored version. |

Retain the present representative matrix; no review identified a separate WorkflowHub run/spelling defect.

## Expand into a controlled local TRS fixture

A local registry fixture could make launch regression tests independent of live service latency and provide workflows whose tools are installed locally. That is a separate test-infrastructure change involving registry discovery/version/file responses; it should not be inferred as required from this batch's local worker setup or remote-service slowness.

| Pros | Cons |
| --- | --- |
| • Offers predictable data and faster failure diagnosis. | • Adds a new registry-fixture model and maintenance obligation. |
| • Could support later invalid-version and error-path coverage. | • Does not replace interoperability checks against the two live registries. |

The current integration suite intentionally exercises those services with established availability skips. No fixture change is required to cover the two identified regressions.

## Contract to preview tests, or split TRS fixes onto 26.1

Either option would make the branch smaller, but would remove part of the user's explicit choice to keep this batch and its required fixes together on `release_26.2`. There is no review finding or validation result requiring that contraction.

| Pros | Cons |
| --- | --- |
| • Smaller individual changes. | • Conflicts with the agreed combined deliverable. |
| • TRS fixes could separately reach an older affected release. | • Defers one of the requested launch regressions and its strengthened tests. |

## Basis and limits

Considered the initial implementation, normal review, test challenges, E2E polish, strict quality review, baseline correction, and original batch report. Earlier findings requested stronger ID/version assertions and correct baseline placement, all incorporated; none called for another implementation area. gxui CLI changes, GTN content findings, and earlier FAQ batches remain outside the user's chosen extraction.

Compared `0501935d4c4e` to merge-base `7a7c1576f94c`; the shared upstream ref has since advanced, so unrelated jobs/model changes in a direct two-tip diff were excluded. Browser validation remains in progress and may reveal a concrete blocker; this scope recommendation does not claim that final tests or screenshots are complete.
