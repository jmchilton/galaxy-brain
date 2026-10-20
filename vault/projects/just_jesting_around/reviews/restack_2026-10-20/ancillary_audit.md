# Ancillary dependent-layer restack audit — 2026-10-20

Read-only review of the old published layer boundaries, branch records, and relevant source diffs. The reviewer did not mutate Galaxy branches or sources and did not run tests. Target readability is `1358d37887996e552e0fac6467c8738865618d9a`.

## Layer boundaries

- `vitest_readability_with_churn`: replay **76 commits only**, from `e06bbc4c70271aacfe27a88e315c882b5270ecaa` to `488693a2611de20c50ec5f990311a6d676c0c989`, directly onto the published readability target. This intentionally preserves the optional marginal-change version; do not put it beneath stories/play or contaminate the cleaned readability branch.
- `vitest_real_api_calls`: replay **3 commits only**, from `f0659f1cf0d69a8e17011bc3b4ef5489b02c3891` to `3076db79898e5db847fe05dd521e48b80034ef72`, directly onto readability. Its historical own layer is 17 files; it is not currently based on the latest story/play lane despite the conceptual pipeline ordering.
- `vitest_story_a11y`: replay **2 commits only**, from `81c4987360debdff86678e038e8035c31213a410` to `c246eb4fde308f62f817018b5ce5f41fbfba7407`, onto the newly published play tip. Do not replay its inherited old stories/play/readability history.

## Churn integration risks

Only three of its 76 own paths overlap changes between the old and fresh readability bases:

- `FormInputCollection.test.ts`: preserve the new null collection-type regression, including JSON round-trip and `collection_type: null`. Adapt it to per-test mounts and any typed helper signature; the old shared `wrapper` no longer exists in the optional layer. Keep the real FormCollectionType child for this test.
- `NodeInvocationText.test.ts`: retain upstream's newly imported real `mount` and hex-color swatch test (`#ff0000`). Merge them with the optional layer's sanitizer mock reset and auto-unmount lifecycle, rather than choosing one import block.
- `CuratedWorkflowCard.test.ts`: retain upstream `nth`, configuration mocking/reset, optional `mountCard` props (`gridView`, `installationRequested`), secondary actions in `actionIds`, updated footer badge placement, and installation-request regressions. Apply the optional layer's owned Pinia/router cleanup, stronger element access and deferred-response checks around that current behavior. Its older `requiredBadgeById`/badge assumptions and two-argument mount helper can conflict semantically even after a text merge.

Recommended checks: all 76 changed test files (client and Tool Shed), client/Tool Shed types, lint and formatting of touched paths, and no missing upstream test cases in those three overlaps. Ensure the three modified paths' old cases still exist too. Preserve each own commit's body/trailers and the 76-commit layer boundary.

## Real API integration risks

Own changes overlap fresh-base edits in five paths: `.github/workflows/integration.yaml`, `.github/workflows/unit.yaml`, `Makefile`, `client/README.md`, and `DiskUsageSummary.test.ts`. Keep current upstream workflow jobs and tooling, adding the fixture inclusions immediately after the broad `!client/**` exclusions so fixture-only changes still trigger backend coverage. Preserve `GALAXY_TEST_CLIENT_FIXTURES: check` and the `update-client-api-fixtures` Make target without replacing newer unrelated targets or docs.

DiskUsageSummary must keep the current readable mount/lifecycle setup while serving recorded `under_quota`, `per_quota_source`, and `after_second_upload` responses. Preserve the exact default/distributed quota labels, **6 b → 18 b** refresh assertions and task-monitor refresh behavior. The shared history factory should still load and clone the recorded `summary_extended` response, applying explicit caller overrides last; do not replace fresh shared test helpers with their historical versions. The factory path itself has no new-base overlap from its historical API boundary.

Recommended checks: fixture contract/loader tests, DiskUsageSummary, all consumers of `getFakeHistorySummaryExtended`, client types/lint/format, and backend `test/unit/test_base/test_client_fixtures.py`. A live capture in **check** mode is valuable when available; the previous 70 backend passes and 56 client passes belong to the historical head and must not be presented as fresh evidence. No need to regenerate fixture JSON merely because the base changed: retain the committed responses unless a check establishes a real response/schema drift. Distinguish unavailable live-Galaxy verification from a failing comparator.

## Accessibility prototype integration risks and scope

The two own commits add addon-a11y at the same Storybook version, strict global `a11y.test: error`, body-level axe context, WCAG defaults plus 2.2 AA/best-practice checks, Galaxy viewport presets, and narrowly annotated historical story exceptions. Retain inherited modern play functions, request handlers, and controlled-input feedback during story conflicts. Merge package/lockfile changes consistently with the published stories infrastructure; do not use an old lockfile wholesale.

Recent upstream accessibility repairs may make old exceptions redundant. Such stale exceptions are a review observation, not a reason to add blanket exclusions or remove strict global checks. A rebase should preserve the two-commit intent and report fresh failures; broad accessibility repair/exception pruning is follow-up work unless individually justified by a passing strict probe.

Historical baseline is explicitly **not green**: the first October 12 refresh had 37 passing and 15 failing story files, 260 passing and 68 failing stories (328 total), including two ListCollectionCreator text assertion failures. The second refresh at `c246eb...` had only a passing typecheck and no fresh full browser gate. The original 236/236 result predates these refreshes. Do not claim that old audit's 121 exceptions or those old failure counts describe the current base.

Recommended checks: offline frozen dependency install, client typecheck, affected-story lint/format, static Storybook build, and current browser Storybook run with its exit status and unhandled errors reported. If current failures remain, categorize them against prior known findings and changed-base behavior, retain the prototype/do-not-PR hold, and publish only with honest validation notes. The requested restack does not authorize silently weakening assertions or axe rules to achieve a green run.

## Final optional-churn candidate review

Independent read-only review approves candidate `e8d2b3f06e4b7842d6afee6f356ffcb0a3c05dd7` for publication, subject to the driver's recorded validation and exact remote lease. It has exactly **76 own commits** above readability `1358d37887996e552e0fac6467c8738865618d9a`; the first own commit's parent is that exact target. All 76 commit messages, bodies and trailers match the original manifest entries in order (normalizing only trailing newline whitespace). Its tree is `3c9ea1d5ee836a234330eb3d0d633eddbd9810fd`, matching `/private/tmp/dependents-20261020-churn-tested-tree.txt`. Whitespace diff check passes.

The own-layer changed-path set remains exactly the original 76 paths. Every one of the **73 non-overlapping paths has the identical blob** to the old optional-churn head. The three overlap resolutions preserve both changes: FormInputCollection's JSON-round-trip null-type regression uses its own mount and real FormCollectionType child; NodeInvocationText keeps the real mount and hex-color swatch assertions alongside sanitizer cleanup; CuratedWorkflowCard retains fresh-base mount props, configuration reset, secondary actions, footer/request regressions, and optional-layer owned resources/deferred cleanup. No missing upstream checks or weakened assertions found in these resolutions.

Driver-provided validation: full client run passes **646 files, 5,808 tests with 1 skipped**; client types and layer lint/format pass. These are coordinator-run results, not independent reruns by this reviewer. No review blockers remain for this candidate.

## Real-API candidate integration review

Read-only review of candidate `038b0504d6` plus its pending HistoryCounter change finds no conflict-resolution blocker. Workflow fixture includes remain after `!client/**` in both push and pull-request triggers, while current upstream exclusions and jobs remain intact. Integration retains `GALAXY_TEST_CLIENT_FIXTURES: check`; the Make target and current shared helper infrastructure survive. DiskUsageSummary retains owned Pinia and auto-unmount with all recorded default/distributed quota checks and the **6 b → 18 b** refresh assertion. The fixture loader returns `structuredClone`, and the history factory applies caller overrides last.

HistoryCounter's newly inherited accessibility case asserts `History Size (0 B)`. Replacing an implicit zero-sized synthetic history with a real six-byte recording changes that fixture precondition. Its pending `getFakeHistorySummaryExtended({ size: 0 })` correction explicitly restores the intended precondition while preserving every count/label assertion; this is an appropriate integration repair rather than assertion weakening. This review does not establish the final real-API history/tree identity or runtime gate; those remain the driver's publication checks after folding this repair.

## Final real-API candidate review and scoped test challenge

Independent read-only final proof approves `0277a85df3954d1f83856933991cc5df0b97865c` for publication with the recorded exact remote lease. It has exactly **3 own commits**, all messages/bodies/trailers matching the starting manifest in order, and the first commit's parent is readability `1358d37887996e552e0fac6467c8738865618d9a`. Tree `31c417f575b212e57d4cb083b5850bac34a288d1` matches `/private/tmp/dependents-20261020-real-api-tested-tree.txt`; whitespace diff check passes. The own path set grows from 17 to 18 solely for the explicit HistoryCounter zero-size fixture override. The final tree differs from reviewed candidate `038b0504d6` by that one line only.

Scoped test challenge: the broad client run exercised 647 files, with 646 passing and the single HistoryCounter fixture-precondition failure. The subsequent correction changes only that test's fixture input, not application code, shared factory behavior, expectations, timing, mocks or test selection. A focused rerun covers the repaired HistoryCounter suite plus DiskUsageSummary and the fixture loader: **25 tests in 3 files pass**. The original full-run failure is retained as diagnostic evidence and is not reported as an all-green final full-suite run. This combination provides appropriate coverage for the one-line repair; repeating every unchanged passing suite is unnecessary. Root also reports **67 Python recorder/comparator tests**, type checks and scoped style checks passing. No new live-server capture result is claimed by this review.

No remaining code-preservation or validation blockers found. Retain the documented CI/live-capture evidence boundaries when publishing the branch and its records. The reviewer performed no test reruns or Galaxy mutations.
