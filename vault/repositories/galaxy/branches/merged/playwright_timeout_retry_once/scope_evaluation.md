# playwright_timeout_retry_once — scope evaluation (2026-10-10)

**Recommendation: keep the scope as implemented.** It is a 7-line partial revert of `2825bb09e42` with one unit test, and that is the right size for a PR that changes retry timing for every caller of `retry_call_during_transitions`. Every expansion the reviews raised is pre-existing, and each one either changes timing again (the off-by-one), works against the PR's goal (retrying Selenium timeouts), or belongs in a different PR (the import tidy). A full revert would trade away a real Playwright retry case to buy backend symmetry. No scope change. One vault fix: `GALAXY_UI_DRIVER_UPSTREAM.md` says a stuck action took "11" timeouts; the debrief and the test say 12, and the PR description should use 12.

## As implemented

Count Playwright `TimeoutError`s separately inside `retry_call_during_transitions` and re-raise on the second one, so a stuck action costs 2 action timeouts, not 12. Stale, not-clickable and intercepted errors keep all their attempts.

| Pros | Cons |
|---|---|
| <ul><li>Smallest change that fixes the 5-13 minute stalls.</li><li>One choke point: every retry helper goes through this function, so nothing else needs changing.</li><li>Keeps the one retry that `2825bb09e42` was after.</li><li>Easy to review. The unit test pins both the new cap and the stale-element contrast case.</li></ul> | <ul><li>Changes timing for about 100 call sites, and also for Galaxy `wait_for_*` timeouts on the Playwright backend. The PR description has to say so.</li><li>The backends still differ: Playwright retries a timeout once, Selenium never does.</li></ul> |

## Expand: fix the `previous_attempts > attempts` off-by-one

Change `>` to `>=` so that `attempts=10` means 10 retries, not 11.

| Pros | Cons |
|---|---|
| <ul><li>The parameter would mean what its name says.</li><li>It touches the same function.</li></ul> | <ul><li>It changes timing a second time, for every transition error and every caller (the 24 decorators, about 80 assertion and index uses, `open_toolbox` with `attempts=0`). That mixes two behaviour changes into a PR that should be one clean partial revert.</li><li>It brings no reliability gain. The fix is cosmetic and slightly reduces retries.</li><li>The test would change (`10 + 2` to `10 + 1`). That is fine on its own, but it hides which part of the PR made which change.</li></ul> |

Verdict: out. If wanted, it is a tiny follow-up PR of its own. The test comment already documents the off-by-one.

## Expand: tidy `_exception_indicates_playwright_timeout`'s private import

Replace the in-function `from playwright._impl._errors import TimeoutError` (with its `ImportError` fallback) with a module-level import of the public `playwright.sync_api.TimeoutError`, which is the same class.

| Pros | Cons |
|---|---|
| <ul><li>It removes a private-API import.</li><li>John's convention is top-level imports unless a comment gives a reason, and this one has no comment.</li><li>The `ImportError` guard is effectively dead: `packages/selenium/pyproject.toml` lists `playwright` as a hard dependency, and it is pinned in the test and dev requirements.</li></ul> | <ul><li>The code is pre-existing, and this PR only calls the helper.</li><li>`navigates_galaxy.py` currently imports Playwright only under `TYPE_CHECKING`. A module-level import would make importing it pull in Playwright eagerly. That is a packaging decision, separate from this PR.</li><li>It adds a second "why" to a PR whose description is already about timing.</li></ul> |

Verdict: out. It fits better in the "`galaxy.selenium` usable outside the test suite" area PR (7k and the commits with it), which already reshapes imports and package boundaries. The reviews' claim that "the import is needed because Playwright is optional at runtime" is weaker than they assumed (see the pros above). Correct it if this cleanup is ever written up.

## Expand: retry Selenium `TimeoutException` too (backend symmetry by expansion)

Treat a Selenium `TimeoutException` as a transition error as well, capped at one retry.

| Pros | Cons |
|---|---|
| <ul><li>The two backends would behave alike.</li></ul> | <ul><li>It works against the PR's goal: Selenium failures would get slower. A stuck Selenium `wait_for_*` would cost 2 waits instead of 1.</li><li>Callers already opt in when they want this. `open_toolbox` passes an `exception_check` that adds `SeleniumTimeoutException`, and that is the existing, deliberate design.</li><li>It is a behaviour change for the established Selenium suite with no flake motivating it.</li></ul> |

Verdict: out.

## Refine: retry Playwright action timeouts once but never retry Galaxy `wait_for_*` timeouts

Tell Galaxy's re-raised wait timeouts (`has_playwright_driver.py:591-642`) apart from Playwright action timeouts, for example with a marker subclass. The Galaxy waits would then not be retried at all, matching Selenium.

| Pros | Cons |
|---|---|
| <ul><li>Waits would behave the same on both backends.</li><li>A stuck `wait_for_*` would cost one wait.</li></ul> | <ul><li>It needs a new exception type plus changes in every `_wait_on_condition_*` re-raise. That is more surface than the fix itself.</li><li>A one-wait retry is cheap next to the 12-wait status quo. The cap already removes the pathology.</li><li>It is speculative: no observed failure needs the distinction.</li></ul> |

Verdict: out. Mention in the PR description that the cap covers `wait_for_*` timeouts; don't build the distinction.

## Contract: fully revert `2825bb09e42` (never retry Playwright timeouts)

Drop `_exception_indicates_playwright_timeout` from `exception_seems_to_indicate_transition`, so a Playwright timeout fails after one action timeout, the same as Selenium.

| Pros | Cons |
|---|---|
| <ul><li>The diff gets even simpler: lines are removed and no counter is added.</li><li>The backends would be symmetric, since neither retries timeouts.</li><li>The fastest possible failure.</li><li>The original commit was explicitly tentative ("Try to fix...?"), and its CI evidence is gone.</li></ul> | <ul><li>Playwright reports covered or intercepted clicks as a `TimeoutError` after its own actionability waits, where Selenium raises `ElementClickInterceptedException`, which *is* retried. Removing the retry entirely gives Playwright less transition tolerance than Selenium has.</li><li>The flake `2825bb09e42` targeted could come back. John isn't worried about a *partial* revert, but a full one removes the safety net completely.</li><li>The cost of the one kept retry is a single extra action timeout, which is small.</li></ul> |

Verdict: out, though this is the closest alternative. Choose it only if John prefers backend symmetry over the one retry. The test already guards against it by accident: it fails at 1 call.

<details>
<summary>Notes</summary>

- `open_toolbox` (`navigates_galaxy.py:1990-1995`, `attempts=0`) is unaffected. Before and after, a Playwright timeout there gives 2 calls, because the off-by-one already allows one retry at `attempts=0`.
- The cap applies after any `exception_check`, including custom ones (`retry_index_during_transitions`, `open_toolbox`), so a caller can't widen Playwright timeout retries by passing its own check. That is the right default. No caller currently wants more.
- The count of 12 action timeouts comes from: the first call, then `previous_attempts` grows to 11 before `> 10` raises, so 12 calls in total. The test pins `10 + 2` for the stale case, which matches.

</details>
