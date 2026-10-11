# Readability batch 43

Four originators, one test per commit, then one range review. No draw: all four are follow-through from batch 42. LoginForm had the same stale `GLink` TODO as LoginIndex; the other three held unresolved `vi.mock("app")` mocks. [Manifest](readability_batch_43.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| LoginForm | The stale-TODO register-link assertions are live again (text and `href`), and "hides register link when local accounts are disabled" now fails when it should. New check: `ExternalLogin` appears with OIDC on. Manual `window.location` restores are gone; `vitest-location-mock` installs a fresh location before each test. [Review](reviews/batch43/LoginForm.md). | 8 → 9 |
| JobInformation | `vi.mock("app")` removed (resolves to nothing). A matcher-less `expect(...includes(msg))` and a `toBeTruthy()` on a wrapper could never fail. They became a message count with `Job Message N:` headers, and an `exists()` check. A new case serves two object-shaped messages and checks their fields render. Two mounts run real store actions; `enableAutoUnmount` replaces explicit unmounts and keeps the provider's `unmounted` hook covered. [Review](reviews/batch43/JobInformation.md). | 6 → 7 |
| Toolshed InstalledList/Index | `vi.mock("app")` and `vi.mock("onload/loadConfig")` removed: the latter meant to stub `getAppRoot` but never took effect, and its result is never rendered, so repointing it would stub something that always ran. A `GLink: GLink` self-stub is gone. Split into three cases with checks for the loading span, the latest-version badge and the Tool Shed column. [Review](reviews/batch43/InstalledList_Index.md). | 1 → 3 |
| Tour | `vi.mock("app")` removed. Each link's text names its tour, in order; the sanitize case clears the `sanitizeHtml` spy first, so earlier mounts can't satisfy it. [Review](reviews/batch43/Tour.md). | 2 → 2 |

Each dead mock was confirmed by swapping its factory for one that throws: the suites stayed green, while the same factory under the real `@/onload/loadConfig` failed on import.

## Reuse and follow-through

Closes batch 42's LoginForm follow-up and three of its `vi.mock("app")` files. Follow-ups:
- **Follow-up implemented separately:** Object-shaped messages and rendered-field checks implemented with John’s authorization on [client_test_fixture_cleanup](../../repositories/galaxy/branches/active/client_test_fixture_cleanup/index.md), 2026-10-10; branch moved directly onto dev at John’s request on 2026-10-11. The readability lane remains unchanged.
- `Toolshed/InstalledList/Details.test.js` has the same two dead mocks, and 9 other files still contain `vi.mock("app")`. 4 of those belong to later lanes.
- `Login/NewUserConfirmation.test.ts` still restores `window.location` by hand.

Guidance: none in the README. Unmounting components that poll went to [MARGINAL_ADVICE.md](MARGINAL_ADVICE.md): one example so far.

## Validation and review

21 cases across 4 suites pass; the baseline was 17. Each commit's test passes at that commit, shuffled with seed `430101`; full client vue-tsc, ESLint, Prettier and hooks pass. Per-test coverage at the batch base and the tip: no source file lost covered lines or branches (514 compared). The [independent review](reviews/batch43/review.md) approved all four commits.

Commits: `e40c9bcf0ca` (LoginForm), `9ce186985b0` (JobInformation), `266e16dc252` (InstalledList/Index), `b77cd65c227` (Tour).
