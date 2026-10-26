# galaxy-brain follow-up from galaxy#24279

Reviewed commit `890d6f7ab98`. Profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md), Opus 5.5, medium effort.

## Stale documentation

None. No existing note under `vault/research/` covers the cached toolbox, `ToolIndex`, or tool source stores.

## Suggested new research

- **Component - Cached Toolbox and Tool Source Stores**: how `CachedToolBox` builds its panel from a merged `ToolIndex` across writable and read-only `ToolSourceStore`s, covering freshness tokens, inline populate and self-heal, on-demand materialization, and multi-process `reload_tool_source_cache` reconciliation. #24230, #24279 and #24319 have all reshaped this area with no reference note.
- **Component - Tool Index Version Selection**: the `in_panel` "configured beats newest" precedence (`_preferred_default`), the `configured_versions` view, `supersede` writes, and the repair of old indexes on load, compared with how the eager toolbox picks versions.

## Post-merge activities

- Once merged, write the first suggested note from `origin/release_26.2` or `dev`. Cite #24279 for the precedence rule, the re-index on reload, and the read-only refusal. Include the macro-only-edit gap.
