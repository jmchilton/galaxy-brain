# galaxy-tool-util-ts#201 — `--version` always prints 1.0.0

Issue: https://github.com/jmchilton/galaxy-tool-util-ts/issues/201
Branch: `issue_201_cli_version` (PR [#206](https://github.com/jmchilton/galaxy-tool-util-ts/pull/206)), worktree `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_201_cli_version/`. Branch record: [index](../../../branches/active/issue_201_cli_version/index.md).

## Triage (2026-10-25)

- Root cause confirmed on `origin/main` `539c16c9` (1.14.0): `build-program.ts` calls `.version(spec.version)`; `spec/gxwf.json` and `spec/galaxy-tool-cache.json` hard-code `"version": "1.0.0"`. `meta` exports carried the same stale value.
- Right repo; no open PR or branch for it.
