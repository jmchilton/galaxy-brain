# Normal review debrief

Verdict approve, no bugs. Acted on nothing; nits below left as-is.

- `as ProgramSpec` cast vs `satisfies` — JSON literal widening likely breaks `satisfies`; cast kept.
- spec-parity `loadSpec` repeats the stamping — test reads raw files deliberately, independent of `specs.ts`.

<details><summary>Full review</summary>

- Published layout: `dist/meta/specs.js` keeps `../../package.json`, resolves to the shipped `packages/cli/package.json`; same depth as existing `../../spec/*.json` imports.
- Browser bundlers inline the JSON import (~1.5 KB package.json in meta bundle). Foundry gets its version from `readInstalledPackageVersion`, not this field.
- Release: version read at bundle/run time; changesets bumps package.json before build+publish.
- Raw JSON consumers (foundry, gxwf-web, galaxy-workflows-vscode, this repo): none read `version`; only `extract-spec.ts:23`, fed the stamped spec.
- Foundry `meta-parity.test.ts:90` already asserts `foundryCliMeta.version === pkg.version`; this aligns.
- No security issues.

</details>
