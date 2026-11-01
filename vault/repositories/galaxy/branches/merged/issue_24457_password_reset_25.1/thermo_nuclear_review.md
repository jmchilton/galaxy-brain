# Thermo-nuclear code quality review

Reviewed the full diff against `origin/release_25.1` at `b88e76ad2ca`; no high-confidence maintainability findings require changes. No implementation edits were made.

Items considered but not recommended:

- Splitting the existing navigation modules: both were already above 1,000 lines. This change adds 24 lines beside related login methods and 12 lines beside related navigation targets. A broad module split would increase release-backport scope without simplifying these flows.
- Replacing full navigation with client state synchronization: that would introduce session/user/token orchestration for a flow already solved consistently by ordinary login's full navigation. The branch instead removes the unused router dependency and uses the existing URL-prefix utility.
- Removing the two-action reset-link helper: it names a reusable user operation, composes the shared password form operation, has a caller, and provides a clear entry point for future reset flows. It carries no hidden state or policy; deleting it would save little while moving page orchestration into callers.
- New fixture abstractions or typed mail models: one captured email has three directly inspected fields. A new parsing/model layer would add concepts without materially improving this short integration fixture.

<details>
<summary>Full review</summary>

## Structural simplification and ownership

The production fix is already the smaller framing: refresh the page after the server establishes the session. It deletes the ChangePassword component's router import and router instance. The alternative of refreshing client identity and token stores in place would spread authentication concerns across more layers. The explanatory comment documents that session boundary rather than restating the navigation statement.

The expired-password change replaces only the destination of an existing branch. It neither adds a mode nor changes branch ordering. `/login/start` is the canonical route that already reads the expired-user query, so this reduces reliance on the legacy redirect rather than adding another special case.

Stable DOM attributes and centralized navigation selectors keep browser implementation details out of the test body. The shared navigation layer already owns login and registration operations; placing password-request and password-form operations alongside them preserves that ownership.

## Helpers and branching

`change_password` owns the repeated password fields, submit, and resulting form transition. Its single optional current-password argument directly represents the two existing forms rather than introducing a speculative version/mode flag. The conditional is local to the input that varies. All three new public navigation operations have concrete test callers.

The integration test's shared session assertion checks both server and visible UI state, then tests logout/login with the saved password. The two test bodies retain distinct setup because token reset and expired login reach the shared component through different real application paths. A generalized parameterized scenario would add conditionals and obscure those differences.

No new client-version detection is introduced. The separate 26.2 FAQ helper must be reconciled when the branches meet, against the newer reset page; speculative cross-release behavior would make this release's helper less direct.

## Fixture and boundary quality

The email transport is configured once for the integration class using the existing mock-email transport and a driver-owned temporary directory. `ClassVar[str]` correctly identifies the class fixture rather than leaving an untyped dynamically assigned attribute. Random accounts and sequential tests avoid mail-recipient ambiguity. The subject and recipient assertions make the captured mail's role explicit before its link is followed.

The small URL normalization handles the actual schemeless 25.1 template and documented HTTP(S) form; it does not introduce a generic URL-repair utility or silent arbitrary fallback. The token is not synthesized by the test. Password age is fixture state established through the integration database; the tested login/save paths remain real UI/server behavior.

No new `any`, casts, buried imports, public loosely-shaped payload API, or feature-specific branches in unrelated paths appear. The component's existing catch typing and controller payload shape are unchanged and do not justify broadening this release fix.

## Size, orchestration, and verification

No file crosses from below 1,000 lines to above it. ChangePassword is 77 lines; LoginForm is 289; the new test is 92. `NavigatesGalaxy` grows from 2,848 to 2,872 and navigation YAML from 1,379 to 1,391; both additions stay in their existing authentication sections.

The browser steps are necessarily sequential: request mail before reading it, save before checking session, logout before logging in with the new password. No independent work is unnecessarily serialized, and no new partially applied server update is introduced. The existing password controller remains responsible for changing the password and establishing the session.

This review freshly inspected the complete final diff, surrounding login abstractions, file sizes, and fixture structure. The Galaxy worktree was clean. Existing behavioral validation is documented in the initial implementation debrief and test-challenge report; this maintainability-only review did not rerun tests.

</details>
