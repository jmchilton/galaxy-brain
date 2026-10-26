Fix deployment test collection, failure reporting, and capability restrictions when testing an existing Galaxy server.

A test decorated with `@requires_new_published_objects` currently becomes `None`, so pytest never collects it. Separately, an assertion or skip inside the base history context can be swallowed after cleanup. This restores the decorated callable and lets pytest report the original outcome.

***These changes repair the deployment test harness; they do not change Galaxy application behavior or certify a live deployment.***

The deployment runner now uses the supported bootstrap options, passes debug arguments correctly, excludes publishing, and exports runtime restrictions alongside its marker filter. Admin-only API helpers and browser registration honor those restrictions even when a caller lacks a requirement decorator. Existing-user browser login remains available. The URL configuration documentation now names `GALAXY_TEST_EXTERNAL`.

***This completes the targeted framework repairs; history retention, API timeout scaling, browser-backend migration, and deployment coverage expansion remain separate work.***

## Risks

This is a reversible test-framework change with no schema or application API changes. Previously hidden test failures and newly enforced skips can change deployment test results.

<details><summary>Risk Review Advice</summary>

Review exception propagation after history cleanup and the runtime guards at API-helper and browser-registration boundaries. Offline checks cover these contracts; no live deployment or browser was exercised.

</details>

## Context

Alternative kept on 🌿[deployment_test_fixes_26_2_alt_original_scope](https://github.com/jmchilton/galaxy/tree/deployment_test_fixes_26_2_alt_original_scope): preserves the fixes before the browser-registration runtime guard was added. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>The targeted repair scope is complete.</summary>

The browser guard completes the runtime new-user restriction. Lifecycle, timeout, backend, and deployment-matrix changes remain separate projects.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No actionable maintainability defects remained.</summary>

The registration override keeps test policy in the test framework and preserves all six navigation arguments. The other changes directly restore existing contracts.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Baseline and regression checks distinguish the broken and repaired behavior.</summary>

The 24 test-base tests pass. Leading baseline tests pass on the release base; the expanded suite fails three publishing cases there at the callable assertion. A scratch publishing test collects zero tests on the base and one after the fix. Offline checks cover history failures/skips and cleanup, admin guards, nine runner configurations, direct/fallback registration, existing-user login, and unrestricted argument forwarding.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>No preparatory refactoring was needed.</summary>

Baseline tests remain in their own leading commit; the fixes restore existing contracts without prerequisite restructuring.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? Pytest reports the original failure or explicit requirement skip.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes; callable, result, and independent skip behavior.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Local validation</summary>

Run `PYTHONPATH=lib .venv/bin/python -m pytest test/unit/test_base -q`. Offline reproduction details are recorded in the branch's test-challenge debrief. Actual deployment execution remains unverified.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
