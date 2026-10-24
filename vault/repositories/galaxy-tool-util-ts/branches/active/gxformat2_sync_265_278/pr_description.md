Sync gxformat2 schema sources, fixtures, expectations and schema rules through gxformat2 `main` (`b81cb14`), then port the two upstream behaviors the sync turns red.

TS `main` had drifted: `make check-sync` against gxformat2 `main` reported 4 missing fixtures and 5 diverged files. Syncing turned 9 tests red, all from two upstream PRs:

- **Text input regex validators** (galaxyproject/gxformat2#265). Format2 text inputs carry regex `validators`. These convert to native `tool_state.validators` and back; non-regex native validators are dropped; validators on non-text inputs are rejected.
- **`class: GalaxyWorkflow` required** (galaxyproject/gxformat2#278). A Format2 root without `class` now fails validation (`Format2MissingClass`). Inline `run:` subworkflows may still omit it. The new `withDecodeClass(data, format)` injects `class` for native documents and Format2 inline runs only. The validators, strict checks and `gxwf validate` (Effect and JSON Schema modes) all use it.

After this branch, `check-sync` against gxformat2 `main` is clean and the full suite passes.

<details><summary>Notes</summary>

- The raw schemas were regenerated with `PYTHONHASHSEED=0`. `schema-salad-plus-pydantic` orders declarations by hash seed, and no seed reproduced the committed files, so part of the `raw/` diff is reordering only.
- New CLI test: `gxwf validate --json` on a classless Format2 workflow reports a structure error. It was red before the fix.
- Changesets: `minor` for `@galaxy-tool-util/schema`; `minor` for `@galaxy-tool-util/cli` (new rejection).

</details>

## Risks

`gxwf validate` and the library validators now reject Format2 documents without `class: GalaxyWorkflow` that they used to accept, matching gxformat2. Inline subworkflows are unaffected.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
