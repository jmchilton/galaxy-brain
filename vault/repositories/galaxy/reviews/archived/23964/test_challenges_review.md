# Test challenges review — galaxy#23964

- Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md)
- Model: Claude Opus 5.5, medium effort
- Reviewed commit: `9b8df5aa76e` (merge of dev `0073b5e9224` into PR head `b81b32379c4`)
- Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

Verdict: tests are well targeted. `tokens.test.ts` (8) and `tokensContract.test.ts` (2) pass locally. The drift, palette, semantic-name, dangling-reference, brand-match and WCAG contrast checks are data-contract tests at the right layer, with no mocks. One coverage regression in the rewrite. Bugs not hunted.

### P2 1: Rewrite drops the guard on non-color legacy tokens

The old `tokensContract.test.ts` pinned the package's non-palette tokens (`--background-color`, `--font-size-small/medium/large`, `--spacing`, `--spacing-1..8`, and the `--field-*` form tokens). The rewrite drops that list, and `tokens.test.ts` never names a non-color token; only the `grey` aliases are guarded. Removing or renaming `--font-size-small`, `--background-color` or any `--field-*` in `theme.css`, then regenerating, fails no test. 24 client files still use those names. The PR says "every existing token keeps working", but only the grey palette has a test for that.

Suggested fix: add a test in `tokens.test.ts` that lists the legacy and non-color names and asserts each one resolves through `resolveToken`. That way a deprecated alias that points at a removed token also fails.

```ts
const LEGACY_TOKENS = [
    "--background-color",
    "--font-size-small", "--font-size-medium", "--font-size-large",
    "--spacing", ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `--spacing-${n}`),
    ...["small", "medium", "large"].flatMap((size) =>
        ["height", "padding-x", "padding-y", "radius"].map((part) => `--field-${part}-${size}`),
    ),
];

it("keeps every legacy token declared", () => {
    for (const name of LEGACY_TOKENS) {
        expect(() => resolveToken(name)).not.toThrow();
    }
});
```

### P3 1: Two parsers for the same custom-property syntax

`parseCustomProperties` in `tokens.test.ts` and `declaredProperties` in `tokensContract.test.ts` are separate regexes for `--name: value;`. `scripts/generateTokens.mjs` already exports `readTokenSources` for the tests. Exporting a single `parseCustomProperties` beside it lets both tests use one parser.

### P3 2: Entry-import test asserts a source string

`loads galaxy-ui's tokens in the analysis entry` checks that `index.ts` contains the import line. It does catch someone deleting the import, which the build would not catch. The build already catches the alias regression this PR fixes. To check the result the user actually sees, assert on the computed value instead: `value_of_css_property("--color-primary")` on `html` in an existing Selenium smoke test. That helper works for Selenium and Playwright. Optional; keeping the string check is acceptable.
