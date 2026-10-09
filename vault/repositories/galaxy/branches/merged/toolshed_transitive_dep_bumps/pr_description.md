Supersedes #22738 and follows up the closed #22735.

## What

Lockfile-only bump of three transitive dev dependencies in the Tool Shed frontend:

- `js-cookie` 3.0.5 → 3.0.8 (CVE-2026-46625)
- `@tootallnate/once` 2.0.0 → 2.0.1 (promise hang on aborted `AbortSignal`)
- `@ungap/structured-clone` 1.3.0 → 1.4.0 (1.3.0 is deprecated upstream: "Potential CWE-502")

All three stay within their parents' declared ranges. `package.json` is unchanged. No other lockfile lines move.

## Why 3.0.8 and not #22735's 3.0.7

#22735 was closed in favor of 3.0.8 because 3.0.7 broke ES5 compatibility and raised the `engines` requirement to `node >= 20`. Upstream 3.0.8 reverts both. The advisory names 3.0.7 as the patched version, so dependabot won't propose 3.0.8 on its own.

## Exposure

Close to none. All three are dev-only and none of them reach the shipped bundle:

- `js-cookie` ← `js-beautify` ← `@vue/test-utils`. Nothing imports it; the app's cookie handling uses Quasar's `Cookies`.
- `@tootallnate/once` ← `http-proxy-agent@5` ← `jsdom@22`.
- `@ungap/structured-clone` ← `eslint@8`.

This PR mainly clears the alerts. It also gives the next Tool Shed lockfile change (#23672, #23666) a clean base, instead of each of them conflicting with #22738.

## Verified

With the pinned `packageManager` (pnpm 10.26.1):

- `pnpm install --frozen-lockfile` is clean.
- `pnpm build` is clean.
- `vitest run`: 95 passed, 8 files.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
