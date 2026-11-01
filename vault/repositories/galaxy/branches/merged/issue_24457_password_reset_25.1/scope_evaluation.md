Retain the scope as implemented: refresh the session after both token and expired-password saves, and repair the expired-login route needed to reach the shared form.

## Possible Decompositions

The branch adds 147 non-generated lines across production code, navigation support, and tests. These are possible logical PR boundaries for John's consideration, not a recommendation to split:

1. **Baseline browser coverage and hooks:** land `0e56f4e9a3a` independently, covering the existing emailed-token and directly opened expired-password forms with mock mail, DOM targets, and reset-request navigation.
2. **Password-save session refresh:** land the shared ChangePassword reload and emailed-reset save/session regression on that baseline. Keep the common save helper and resulting session assertions here.
3. **Expired-login route and complete expiration flow:** land the LoginForm destination correction and extend the expired test through actual login, warning, save, and subsequent logout/login. This benefits from the shared save/session support in the previous piece.

The current baseline-first, then combined-fix history already provides the first separation; pieces 2 and 3 are together in one cohesive fix commit.

## As implemented: both shared password-change flows

The branch covers the original emailed-reset symptom and the same save/session defect in the expired-password form. It also repairs the expired-login redirect that otherwise drops the account query before that form can be shown, and provides shared navigation helpers plus complete browser coverage for both paths.

| Pros | Cons |
| --- | --- |
| • Fixes both consumers of the shared component.<br>• Includes the related touched-path defect discovered during testing.<br>• Leaves reusable form navigation and real user-flow evidence. | • Includes a second production edit beyond the issue's originally reproduced symptom.<br>• Requires a custom-config browser fixture for both mail and expiration. |

This is the recommended modest generalization. Keeping the redirect correction is justified by the expired account's actual route into the same password component, rather than by release conservatism or a desire to confine work to the exact issue steps.

## Contract to emailed reset only

Keep only the shared component reload and emailed-reset regression; remove the expired-login correction and complete expiration scenario. This would still incidentally change saves from directly opened expired-password forms, but would leave the real expired-login entry point broken.

| Pros | Cons |
| --- | --- |
| • Smaller final diff and shorter browser suite.<br>• Maps directly to the original reproduction. | • Leaves a discovered related bug in the touched authentication flow.<br>• Does not establish that both supported component inputs reach a working result. |

Do not contract. The issue itself identified the expired form as a likely second consumer, and the implemented expansion confirms and fixes that flow.

## Expand to password-form failure cases

Add real browser scenarios for mismatched passwords, invalid/expired tokens, and incorrect current passwords, including confirmation that users can recover and submit again. These would broaden password-management coverage beyond successful session transitions.

| Pros | Cons |
| --- | --- |
| • Adds useful user-facing failure and recovery coverage.<br>• Could find adjacent validation bugs. | • No review or implementation evidence links those paths to this session mismatch.<br>• A failed password change does not establish the new authenticated session whose client synchronization is being fixed.<br>• Adds scenarios without improving coverage of the diagnosed boundary. |

Do not expand to a separate form-validation project here. Both affected successful transitions are already covered, and reviewers identified no additional concrete failure needing correction.

## Expand to an authentication/session synchronization abstraction

Introduce one shared client operation for establishing identity and refreshed session state, then route login and password changes through it; potentially preserve the SPA instead of reloading. This would generalize across authentication entry points rather than relying on the existing full-navigation convention.

| Pros | Cons |
| --- | --- |
| • Could centralize a future authentication lifecycle policy.<br>• Might avoid a full page load if all state boundaries were modeled. | • Existing login already performs the required full navigation successfully.<br>• Introduces store/token orchestration and more affected paths without a second broken synchronization mechanism.<br>• No issue-thread requirement or reviewed reusable abstraction calls for it. |

Do not expand in this direction. The current change already adopts the canonical working behavior and removes a dependency; a new synchronization layer would enlarge the conceptual scope without solving an additional demonstrated use case.

## Expand to the newer dedicated reset page and FAQ flows

Bring the newer reset-page interaction and 26.2 FAQ coverage into this branch, or add runtime branching to support both release layouts in one helper. The separate FAQ branch already supplies a reset-request helper for its newer page.

| Pros | Cons |
| --- | --- |
| • Could reduce later helper reconciliation work.<br>• Would cover newer user documentation paths. | • Changes the 25.1 product flow rather than fixing its existing reset behavior.<br>• Version-specific runtime branches would complicate a helper that currently matches its own release.<br>• The newer page and FAQ flows have their own implementation work. |

Retain the explicit forward-merge integration note instead: reconcile the helper with the newer UI when combining those branches. Both normal and strict reviews raised this as integration context, not a missing fix in the present scope.

No scope change is recommended, and no source, test, or history changes were made by this evaluation. The thermo-nuclear review already follows the shared debrief convention: disposition and considered alternatives above, full review under a `details` section.
