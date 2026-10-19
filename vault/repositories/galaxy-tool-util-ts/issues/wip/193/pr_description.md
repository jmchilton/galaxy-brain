Resync `tests.schema.json` from Galaxy `dev` (`0de6cc2d7fe`) so `gxwf validate-tests` accepts nested collection `count`/`min`/`max`.

- galaxy#23554 (26.1) added `count`, `min`, `max` to `TestCollectionCollectionElementAssertions`; the vendored schema rejected them on nested elements.
- Also picks up `visible` on output and dataset element assertions (Galaxy 26.2+). Since the schema tracks `dev`, files using it validate here but a 26.1 server would reject them.
- New positive fixtures: `collection_nested_element_count.yml` (the issue's repro plus `min`/`max`) and `output_visible.yml`. The first one fails against the old schema.
- Changeset: patch for `@galaxy-tool-util/schema` and `@galaxy-tool-util/cli`.

Fixes #193

🤖 Generated with [Claude Code](https://claude.com/claude-code)
