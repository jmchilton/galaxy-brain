Recommend a modest expansion: retain the implemented fixes and complete the runtime `new_user` skip guard for Selenium registration in the `galaxy_test` framework layer. No contraction is recommended.

## As implemented

The branch repairs all four defects listed under the research note's “Bugs worth filing upstream,” enables both deployment skip layers, excludes publishing, and covers the selected API tests' previously unguarded admin helpers. This is a useful, tested repair set, but its runtime policy remains asymmetric: direct browser registration and the `login()` fallback can still bypass `GALAXY_TEST_SKIP_IF_REQUIRES_NEW_USER` when a caller lacks the decorator.

| Pros | Cons |
| --- | --- |
| • Addresses the explicit bug list and the deployment runner's immediate API failures. | • Leaves the note's other explicitly identified missing runtime hook open. |
| • Existing validation covers framework outcomes, collection, and runner configuration without deployment side effects. | • Protection against browser account creation still depends on complete annotations and supplied credentials. |

## Recommended expansion: browser registration requirement

Add a `new_user` runtime requirement at the test-framework registration boundary, so both direct `self.register(...)` calls and `TestWithSeleniumMixin.login()`'s fallback respect the same restriction. Keep this in `lib/galaxy_test/selenium/framework.py` through an appropriate override that preserves registration arguments and normal behavior; the reusable `galaxy.selenium` navigation module should not acquire a dependency on `galaxy_test`.

| Pros | Cons |
| --- | --- |
| • Completes the source note's paired missing-hook audit alongside the API user-switch guard already added. | • Adds one browser-framework helper boundary to review. |
| • Generalizes the runtime restriction to unannotated callers and future deployment selections. | • Requires focused skip-before-browser-action and unrestricted delegation checks. |
| • Uses the existing requirement mechanism without changing deployment account policy or UI behavior. | • Existing passing checks do not by themselves validate this added path. |

<details>
<summary>Why expand despite the current Selenium selection</summary>

The research note reports that all current deployment Selenium classes use supplied-account login and that the two account-creating selected tests are statically excluded. That makes the current selection suitable; it does not make the runtime `NEW_USER` setting effective at the unannotated registration boundary. The branch already expands beyond one-off decorator and shell repairs to make runtime helper checks reliable for named API users. Applying the same contract to browser registration is a small, directly related completion rather than a browser-backend project.

The existing decorator, history propagation, API admin-guard, and runner checks still apply after this expansion. Add an offline check that the enabled new-user restriction skips before any browser action, and one that disabled/unset restrictions preserve normal delegation and arguments. No new live deployment run is required to establish that guard contract.

</details>

## History lifecycle and configured-history reuse

A larger alternative would align the two `_test_history` implementations' `require_new` behavior and add explicit ownership-aware cleanup of deployment-created API histories and jobs. These are real audit gaps, but their semantics involve configured reusable histories, success versus failure retention, debugging, and remote job cancellation; retain the current propagation fix without silently changing that lifecycle in this repair set.

| Pros | Cons |
| --- | --- |
| • Would reduce persistent deployment artifacts and clarify reuse semantics. | • Requires a distinct ownership and retention contract across API and browser populators. |
| • Addresses additional research observations in the touched history area. | • Incorrect cleanup could delete or cancel resources deliberately supplied by a test operator. |

## API timeout multiplier

Another expansion would apply deployment timeout scaling to API waits as well as browser waits. The note identifies inconsistent behavior, but a useful fix needs an inventory of API/populator/interactor wait paths and a consistent scaling boundary so nested waits are not multiplied repeatedly; this is larger than completing one missing capability guard.

| Pros | Cons |
| --- | --- |
| • Improves runs against slow deployment queues. | • Requires a cross-helper timeout contract and representative wait validation. |
| • Makes the workflow's multiplier more intuitive. | • A partial fix could leave inconsistent waits or conceal queue failures for excessive periods. |

## Backend, target, coverage, and configuration modernization

A broad alternative would migrate the deployment workflow to Playwright, add targets or configurable accounts, expand the frozen test rotation, audit missing tool requirements, and reconcile unused configuration variables such as the documented admin-key mapping. These are worthwhile maintenance directions, but each changes the operational test matrix or a separate configuration contract; they are not prerequisites for the four concrete repairs and the recommended capability-guard completion.

| Pros | Cons |
| --- | --- |
| • Would bring deployment testing closer to current CI and broaden useful coverage. | • Needs browser setup, credentials, tool-panel capability checks, and deployment-specific validation beyond this branch. |
| • Could reduce duplicated target configuration and remaining documentation drift. | • Combining those changes would obscure the independently reproducible framework and bootstrap fixes. |

## Contracted alternative: only the four listed bugs

A contraction could remove the runtime exports, publishing exclusion, and API admin-helper guards, leaving just the missing return, exception propagation, bootstrap flags, and URL mapping. This would leave the runner's already documented capability-policy failures in place even though the branch touches the relevant helper boundaries; the existing broader repair set is justified.

| Pros | Cons |
| --- | --- |
| • Produces the smallest literal interpretation of the final bug list. | • Leaves selected tests failing on unsupported admin operations and permits publishing through unannotated helpers. |
| • Separates runner policy from mechanical repairs. | • Discards already reviewed, useful fixes central to the research note's deployment diagnosis. |
