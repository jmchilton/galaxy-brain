Narrowly scoped alternative to #23484.

`csv-parse` 7.0.2 picks up the [GHSA-8cw4-87c7-c6xx](https://github.com/adaltas/node-csv/security/advisories/GHSA-8cw4-87c7-c6xx) prototype-replacement fix. Upstream states 7.0.0 was published by mistake and carries no breaking changes, and the 6.0 renames do not touch anything Galaxy uses — our single consumer, `client/src/components/Dataset/Tabular/TabularChunkedView.vue`, calls `parse(input, { delimiter, relax_quotes })` and already uses the post-rename option spelling. The package has no transitive dependencies.

Two differences from #23484:

**Lockfile is scoped to `csv-parse`.** That PR's lockfile also advanced `body-parser`/`qs`, `engine.io`, `postcss`, `rolldown` and its platform bindings, `@inquirer/*`, `@types/node` and others, none of which are `csv-parse` dependencies. Here the only lockfile changes are the importer entry plus the `csv-parse@7.0.2` package and snapshot records — 5 lines. `pnpm install --frozen-lockfile` passes.

**The parser is actually exercised by tests.** `TabularChunkedView.test.ts` previously mocked an empty first chunk, so neither `parse()` call was ever reached — the green client-unit job proved the module loaded, not that preview behavior survived. The added cases use non-empty chunks and assert the rendered `GTable` items for:

- a comma inside a quoted CSV cell;
- a tab inside a quoted tabular cell;
- the per-line fallback taken when a ragged chunk raises `CSV_RECORD_INCONSISTENT_FIELDS_LENGTH`.

The tests are committed ahead of the bump and were verified green against **both** 5.5.2 and 7.0.2, so they document the upgrade as behavior-neutral rather than merely passing after the fact.

## How to test the changes?
(Select all options that apply)
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
