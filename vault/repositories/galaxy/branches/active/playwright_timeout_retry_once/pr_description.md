Partly revert `2825bb09e42` ("Try to fix transiently failing test?") — keep one retry for Playwright timeouts during transitions, while stopping repeated full-timeout waits.

A Playwright timeout has already exhausted the action's own waiting and retrying. With the default transition retry budget, a stuck action currently runs twelve times before failing. This change limits it to two calls while retaining a chance to recover from a transition.

| Error from the callback | Before | After |
| --- | --- | --- |
| Playwright timeout | Up to 12 calls | Up to 2 calls |
| Stale element | Up to 12 calls | Up to 12 calls |

At a 30-second action timeout, that reduces timeout waiting alone from six minutes to one minute for a repeatedly failing callback.

***This changes Galaxy's browser-test infrastructure; it changes no production UI or workflow execution behavior.***

***The limit applies to every caller of `retry_call_during_transitions`, including Galaxy `wait_for_*` timeouts on the Playwright backend, per helper invocation.***

<details><summary>Scope and behavior</summary>

The helper counts accepted Playwright timeouts and re-raises the original exception on the second occurrence. The existing overall attempt limit and custom exception predicates still apply. Stale-element, not-clickable, and intercepted-click retries retain their existing budget.

The cap is per helper invocation, not a global deadline: nested retry helpers can still multiply attempts. This leaves the existing overall-budget off-by-one, exception imports, and Selenium timeout handling unchanged.

</details>

## Risks

This is easy to revert and introduces no persistent data or compatibility commitments. Browser tests that relied on more than one retry after a full Playwright timeout will now fail sooner; the change reaches the shared helper's callers, rather than a single failing test.

<details><summary>Risk Review Advice</summary>

Review whether one extra full timeout is enough transition tolerance for the callers you maintain. The cap includes Galaxy's wait helpers because the Playwright backend re-raises their failures as Playwright timeouts. The unit tests pin both the surviving timeout retry and the unchanged stale-element budget.

</details>

## Context

Pulled from the standing [galaxy_ui_driver branch](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver). The 2026-03-22 commit `2825bb09e42` made Playwright timeouts retryable; this keeps one retry from that change. Its original CI evidence is no longer available, so the case here is the reproducible callback count and the cost of repeatedly exhausting an action timeout.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>The change keeps the retry cap separate from other retry and import behavior.</summary>

The existing off-by-one, import cleanup, Selenium timeout retries, and a full revert were considered and kept outside this change. A full revert would remove the one remaining recovery attempt.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>The timeout test fails at the callback-count assertion on the base implementation.</summary>

The timeout case observes two calls and rejects both twelve calls and zero retries. The stale-element case retains twelve calls and rejects capping all transition errors. The recorded base run gives one failed timeout test and one passing stale-element test. No E2E timing test was added; the callback contract can be checked without waiting through full browser timeouts.

</details>

### ✅ Second Frontier Model Review

<details><summary>The review covered the complete diff and retry plumbing without reporting findings.</summary>

The review inspected the driver backends, proxy, elements, wait helpers, unit tests, and package boundaries. It did not execute tests; test execution is recorded separately.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? The browser-test runner receives the original Playwright timeout after its second occurrence in one helper invocation.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes; they check callback counts and propagated exception types.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc. — what purpose do they serve? The test comment explains the failure delays motivating the cap.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Validation</summary>

Run `pytest test/unit/selenium/test_retry_during_transitions.py`. Both tests pass on the rebased branch. A fresh isolated run with the current `dev` helper fails at `assert 12 == 2`, while the stale-element test passes. The shared-driver/retry run passed 390 tests with one skipped. Black, isort and whitespace checks passed. All checks that ran on the previous head passed; fresh fork CI after the clean rebase has no failures so far and remains queued/in progress.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
