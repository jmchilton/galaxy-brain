# Review — Galaxy #23991

Reviewed 2026-10-11. HEAD `cff0496be74306386719684c0ba0df86fee7d221`; pre-PR merge base `c35feb587eb8738a2d94cfb91769d0fbd14839bf` (`dev`). Recommendation: **approve**. No actionable findings. Delivery: unposted.

## Behavior and abstractions

The conversion preserves normal startup, user/configuration retry handling, theme selection/fallback, window restoration, the history/interactive-tool/notification watcher gates, embedded-mode short-circuit, confirmation propagation to the router, route-change clearing, and tour startup. The iframe detection retains both normal and cross-origin branches. The beforeunload callback reads current refs/stores rather than captured startup values. Admin route declarations are behaviorally identical; library page coercion via `Number` is equivalent to the previous unary `+`. Home retains tool/workflow routing priority, upload handling, decoding with literal-plus preservation, workflow preferences, and the queued-import notification/query cleanup.

The existing composables and Pinia stores remain the abstraction boundaries. `ConfirmableRouter` narrowly models the existing custom router property, and the route modules now use the shared `RouteRecordRaw` contract. No new parallel configuration or user state is introduced.

The query handling differences are explicit in the PR description: malformed/valueless `hide_masthead` no longer throws, and repeated Home query parameters are ignored rather than passed as arrays. The inactivity warning now reads the captured Galaxy instance rather than an Options API instance property assigned during mounting. That improves the synthetic inactive-user case; it does not fix the existing empty legacy user data on real startup. Dannon explicitly identifies a user-store follow-up. That existing limitation is not a blocker for this conversion.

## Validation

An isolated copy of this PR's complete `client/` tree was created at `/private/tmp/galaxy-pr23991-review/client`; no shared source/dependency tree was changed. Dependencies came from the existing offline pnpm cache, using the PR's exact lockfile. Versions: Node `v25.6.1`, pnpm `10.26.1`, Vitest `4.1.11`, Vue/compat `3.5.43`, Vue Router `5.3.1`.

```sh
pnpm install --offline --frozen-lockfile --ignore-scripts
pnpm --filter @galaxyproject/galaxy-api-client run build
env NODE_OPTIONS=--no-experimental-webstorage pnpm exec vitest run \
  src/entry/analysis/App.test.ts \
  src/entry/analysis/modules/Home.test.ts \
  src/entry/analysis/routes/admin-routes.test.ts \
  src/entry/analysis/routes/library-routes.test.ts \
  src/entry/analysis/router-push.test.js \
  src/composables/confirmDialog.test.ts \
  src/composables/upload/useUploadStaging.test.ts \
  src/stores/windowManagerStore.test.ts --maxWorkers=2
```

**8 suites / 44 tests passed**, including all four changed suites (22 tests), router scratchbook behavior, confirmation dialog, upload staging, and window persistence/restore. These test real Vue refs and router navigation; startup service actions and heavy child components remain mocked. The first attempt without `NODE_OPTIONS` failed because Node 25's experimental localStorage object shadowed happy-dom's storage API. Disabling that Node feature corrected the environment without changing Galaxy code. Existing Vue compatibility compiler warnings were non-fatal.

For an independent parity check, the four production modules in the temporary tree were replaced with the exact pre-PR merge-base versions (old `.js` route contents copied to the test imports' `.ts` filenames), keeping the PR's tests. **21 of 22 tests passed**. The sole failure was the inactivity-banner assertion, consistent with the intended correction above; no normal routing/startup parity test regressed. A preliminary App-only-parent comparison had the same result. Temporary test source and dependencies were removed after review; [validation evidence](validation.txt) preserves the compact results.

Final GitHub read: same HEAD, open, not draft, no comments/reviews; **23 checks successful**, including client unit/lint/build, startup, Selenium and all three Playwright jobs. The coordinator's CI cache reports eight successful workflows; it contains metadata and no downloaded test artifacts/logs, so no additional CI test-count claim is made. Worktree remains clean. No source edits or GitHub posts.

## Integration-test assessment

The component tests already exercise startup plus Vue Router navigation with the real component under controlled stores, which is a clean boundary for this refactor. Existing Selenium/Playwright jobs add browser coverage for app loading and navigation, and they are green. A new end-to-end test is not necessary for this mostly mechanical conversion. If the iframe branch is extended later, the existing scratchbook browser tests are the appropriate place to check that popped-out pages do not start duplicate watcher traffic. A user-store inactivity-banner follow-up should verify real user loading and the visible banner rather than relying only on a legacy-user mock. No browser run was performed locally for this review.

## Risks

Risks are minimal: this is a reversible component and typing refactor, with no persisted-data, API, tool, or workflow contract change (a two-way door).

<details><summary>Risk Details</summary>

- The analysis shell mounts across normal and embedded pages, so a startup/lifecycle mistake would have broad UI impact; the targeted startup tests and green browser/startup CI reduce that concern.
- Malformed and repeated query parameters now have explicitly different handling. Normal scalar tool/workflow URLs retain their behavior.
- The legacy-user inactivity warning remains an acknowledged follow-up, with no demonstrated regression for real users from this PR.
- Local validation used happy-dom and mocked heavyweight children/service actions; browser-level evidence is the existing CI result.

</details>

<details><summary>Risk Review Advice</summary>

Humans reviewing the change should concentrate on the timing of shell startup side effects and the translation of instance properties to refs. The parity check supports the ordinary routing/startup behavior; no further pre-merge test or design change is requested.

</details>
