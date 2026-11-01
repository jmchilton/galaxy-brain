Recommend keeping the expanded scope as implemented at `9d5f0d32df8`; no further expansion or contraction is recommended. The first scope review's browser-registration requirement is complete, and the remaining research observations require distinct lifecycle, timeout, or operational test-matrix contracts.

## As implemented — recommended

The branch repairs all four defects in the research note's final bug list: the dropped decorated callable, swallowed history-body outcomes, obsolete/incomplete runner bootstrap, and URL mapping documentation. It also makes the deployment runner's existing restrictions effective through runtime exports, publishing exclusion, API admin-helper guards, and the added `GalaxyTestSeleniumContext.register` guard for both direct browser registration and fallback login; configured existing-user login remains available.

| Pros | Cons |
| --- | --- |
| • Covers the independently reproducible bugs and completes the missing runtime-helper hooks identified by the first scope review. | • Does not claim to resolve every observation in the broader deployment research audit. |
| • Generalizes restrictions at reusable test-framework boundaries without coupling generic browser navigation to test policy. | • Actual deployment execution and server-specific capabilities remain operational validation beyond the offline checks. |
| • Fresh normal, test, maintainability, and refactor reviews cover the expansion. | • Histories can still accumulate under the pre-existing lifecycle contract. |

<details>
<summary>Fresh evaluation of the expansion</summary>

Reviewed the entire diff against `origin/release_26.2`, the original research request and note, the rescope debrief, and fresh test-challenge, maintainability, and baseline-refactor reports. The prior recommendation was one missing counterpart to runtime API-user restrictions: a browser registration call could bypass the new-user restriction if its caller lacked a decorator. The typed context override now places that check at the common registration boundary and preserves the navigation implementation's existing arguments and result.

Fresh verification covers direct registration, fallback registration, configured login, and unrestricted forwarding in addition to the original decorator, collection, history, admin-helper, and runner checks. The original implementation is retained on `deployment_test_fixes_26_2_alt_original_scope` at `6a2cdd7f982`. No new scope concern emerged from the fresh reviews. This evaluation does not rerun correctness checks or treat release-branch targeting as a reason to exclude related fixes.

</details>

## Contraction to the original scope

Returning to the retained alternative would remove the browser registration guard while preserving the four explicit bug fixes and API/runner restrictions. That would reopen the same missing runtime-hook gap that justified the first expansion, so retain the completed guard.

| Pros | Cons |
| --- | --- |
| • Slightly smaller implementation surface. | • Restores an avoidable difference between API and browser runtime restrictions. |
| • Preserved alternative makes the comparison straightforward. | • Discards the reviewed completion of the first scope recommendation. |

## History lifecycle and configured-history reuse

A broader history project could align the base and interactor `_test_history` implementations' `require_new` handling, delete deployment-owned API histories, and cancel their jobs under an explicit retention policy. These observations are related to the touched helper, but changing them requires deciding which histories are owned by the harness, which are supplied for reuse, and what survives failed tests; they do not form a small additional capability guard or exception-propagation repair.

| Pros | Cons |
| --- | --- |
| • Reduces artifact accumulation and makes reuse semantics consistent. | • Requires ownership and success/failure retention decisions across API and browser populators. |
| • Addresses real observations from the research note. | • Cleanup must distinguish test-created resources from operator-supplied resources. |

## API timeout scaling

Applying the workflow's timeout multiplier to API tests would improve slow-queue behavior, but needs a shared scaling boundary across populator and interactor waits, including nested waits. Keep it as a separately designed timeout change rather than attaching a partial multiplier to one or two call sites in this repair set.

| Pros | Cons |
| --- | --- |
| • Makes deployment API runs more tolerant of real queue delays. | • Requires an inventory of wait paths and a consistent scaling contract. |
| • Aligns API and browser operator expectations. | • Partial scaling can leave inconsistent behavior or multiply nested timeouts repeatedly. |

## Deployment backend, targets, test rotation, and configuration

Migrating the workflow to Playwright, adding targets or account configuration, expanding the frozen test rotation, auditing tool requirements, or reconciling unused configuration variables would modernize the deployment test matrix. Those changes need target-specific browser/dependency setup, credentials, capabilities, or separate configuration behavior decisions; none is required for the repaired framework contracts or completed runtime restrictions.

| Pros | Cons |
| --- | --- |
| • Broadens useful deployment coverage and brings browser setup closer to current CI. | • Changes the operational test matrix and requires validation beyond helper-level checks. |
| • Can reduce target duplication and remaining configuration drift. | • Combining these projects would obscure the now-complete set of reproducible framework and runner repairs. |

A still narrower contraction to only the four final bug-list entries would also remove already justified runner/runtime policy fixes. That would retain the documented unsupported-admin and publishing behavior, so it is less appropriate than either reviewed implementation and is not recommended.
