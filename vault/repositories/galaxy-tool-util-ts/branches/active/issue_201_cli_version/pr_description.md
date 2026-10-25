Fix 🎯 #201 - `gxwf --version` and `galaxy-tool-cache --version` always printed `1.0.0`.

Both programs took their version from `spec/*.json`, which hard-coded `"version": "1.0.0"`. `src/meta/specs.ts` now stamps the version from `packages/cli/package.json`, and the stale field is dropped from the spec JSON. Commander and the browser-safe `meta` exports (`gxwfCliMeta`, `galaxyToolCacheCliMeta`) both read the stamped spec, so they report the same version.

**The version comes from `package.json`, not a hard-coded string.** The built `dist/meta/specs.js` still imports `../../package.json`, so a published package reports the version that changesets bumped it to. With this branch built, both binaries print `1.14.0`.

`test/program-version.test.ts` fails on `main` (`1.0.0` vs `1.14.0`) and passes here. The meta boundary test now allows importing exactly `package.json`, and the parity test applies the same version when it loads the raw spec.

## Risks

- Anyone reading `spec/*.json` directly loses the `version` key, which always said `1.0.0`. **No known consumer reads it: Foundry, gxwf-web and galaxy-workflows-vscode were checked.**
- `package.json` (~1.5 KB) gets inlined into browser bundles of `@galaxy-tool-util/cli/meta`.

## Context

The hard-coded version came in with the spec-as-source-of-truth change (#87). Foundry's `meta-parity.test.ts` already checks its own CLI version against `package.json`; this brings the gxwf CLIs in line.

## Agentic Checks

### ✅ Second Frontier Model Review

<details><summary>Codex review found no defects.</summary>

Read-only Codex review of the diff and surrounding version wiring found nothing. Its typecheck and focused tests passed, and both built CLIs printed `1.14.0`.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
