# Histories API readability review — batch 55

Reused `getFakeHistorySummary` for complete schema-checked fixtures, retaining the scenario's IDs, names, timestamp and username. The small `createMyHistory` adapter adds the listing's username field. Replaced the `unknown as MyHistory` fixture assertion and the interceptor's `unknown[]`/`any` response with typed `MyHistory[]` responses.

All eight cases and eleven original assertion calls remain. Query assertions retain every original expected key and value through `expect.objectContaining`, and now compare the whole captured-request array to a single matching element. This additionally rejects duplicate index calls while preserving the original allowance for extra query parameters. History return values, total headers, default and explicit visibility flags, pagination, search, sorting, and the archived endpoint remain covered.

Baseline and rewritten suite: 8 cases passed with shuffled seed 550101, one worker. V8's Istanbul-format JSON comparison: 142 files, 365 covered statement/function/branch-arm locations before and after; zero lost or added locations. Evidence: `/private/tmp/readability55-histories-before/coverage-final.json`, `/private/tmp/readability55-histories-after/coverage-final.json`, `/private/tmp/readability55-histories-final.log`.

The shared factory is already documented in the client README. No new abstraction, supporting edits, production edits, or README/marginal advice changes are warranted. Existing API mocks own their server lifecycle and reset request handlers after each case; this suite creates no mounted component or reactive effects.

Required formatting/lint/pre-commit checks passed. Full-client `vue-tsc --noEmit --pretty false` passed (exit 0); evidence is recorded in `/private/tmp/readability55-histories-typecheck.log`.
