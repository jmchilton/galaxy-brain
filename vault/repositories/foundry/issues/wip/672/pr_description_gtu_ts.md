Title: Resync UDT schema from Galaxy release_26.1: flat collection outputs

`validate-tool-source` rejected collection outputs written the way Galaxy 26.1 expects them. The bundled schema was last synced 2026-05-07, before galaxyproject/galaxy@b8db3bd2ace moved `collection_type` and `discover_datasets` to the top level of a collection output. 1.14.0 still requires the old `structure:` block and all ten `discover_datasets` fields. Found in galaxyproject/foundry#672.

- Regenerated `schema.json` / `schema.generated.ts` with `make sync-user-tool-source-schema` against Galaxy `release_26.1` (`5af1d03c929`), so it accepts what usegalaxy.org (26.1) does. Dev-only fields (`runtime_environment_variables`, the test `visible` assertion) are not included.
- Tests ported from Galaxy's `user_tool_source_validation_cases.yml` collection cases: a flat output whose discovery entry has only `pattern` is accepted (fails on the old schema), and a typo'd discovery key is rejected. The existing missing-discovery test now uses the flat shape.
- Patch changeset for `@galaxy-tool-util/schema`.

`make check` is clean. In `make test`, gxwf-web `--output-schema` (`contents.test.ts`) fails intermittently under load, with or without this change, and passes on rerun. Everything else is green.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
