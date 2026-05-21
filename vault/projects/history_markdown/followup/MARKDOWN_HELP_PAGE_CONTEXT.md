# MarkdownHelp: page-context awareness + backfill missing directives

## Current state
`MarkdownHelp.vue` (`client/src/components/Markdown/MarkdownHelp.vue`) is a single hand-written component with a binary `mode: DirectiveMode` prop where `DirectiveMode = "page" | "report"` (`client/src/components/Markdown/directives.ts:3`). It is mounted in exactly one place — the `GModal` inside `MarkdownEditor.vue` (`client/src/components/Markdown/MarkdownEditor.vue:38-44`) — and the title flips on the same boolean (`"Markdown Help for Pages"` vs `"Markdown Help for Invocation Reports"`). Two callers drive the prop: `PageEditorView.vue:61` hard-codes `markdownEditorMode = "page"` for both standalone *and* history-attached pages, and `Workflow/Editor/Index.vue:125` hard-codes `mode="report"`. So after the notebooks/reports unification, "history page" and "standalone page" collapse to the same `mode="page"` help — exactly the original concern. The history-page assistant context is never wired in.

The PR-era diff (`git log 4afd63a9a9 -- client/src/components/Markdown/MarkdownHelp.vue`) only changed a type import and one wording tweak ("resulting Galaxy Page" → "resulting document"). Help content is otherwise inherited unchanged from the pre-unification era and has not absorbed history-context knowledge.

## Concrete gaps
- `DirectiveMode` has only two values; there is no third "history" arm, so the help cannot say "you're editing a page attached to a history" vs "standalone page that references arbitrary histories by ID" (`directives.ts:3`, `PageEditorView.vue:48,61`).
- `MarkdownHelp.vue:51-55` tells *all* page users "These elements are referenced by object IDs used by the Galaxy API" — fine for standalone pages but misleading for history-attached pages where the assistant resolves HIDs to IDs (see `lib/galaxy/agents/prompts/page_assistant.md:7-27`); user-facing help never mentions HIDs, `resolve_hid`, or the AI chat panel.
- Help omits a large chunk of valid directives — `MarkdownHelp.vue` documents 14 directives but `VALID_ARGUMENTS` in `lib/galaxy/managers/markdown_parse.py:26-70` exposes ~30. Missing from the help: `history_dataset_embedded`, `history_dataset_index`, `history_dataset_link`, `history_dataset_name`, `history_dataset_type`, `history_link`, `invocation_inputs`, `invocation_outputs`, `visualization`, `generate_time`, `generate_galaxy_version`, and all seven `instance_*_link` directives. Most *are* documented in the rich tables in `lib/galaxy/agents/prompts/page_assistant.md:92-135` — so the AI knows about them but the human help does not.
- Inline directive syntax (`${galaxy history_dataset_name(...)}`) — promoted heavily in `lib/galaxy/agents/prompts/page_assistant.md:62,85,104,141` and gated on `EMBED_CAPABLE_DIRECTIVES` (`lib/galaxy/managers/markdown_parse.py:71-86`) — is not mentioned anywhere in `MarkdownHelp.vue` (zero matches for `${galaxy` or "inline").
- `workflow_display(workflow_id=33b43b4e7093c91f>)` at `MarkdownHelp.vue:110` has a stray `>` — typo that ships to users.
- The `directives.yml` metadata already supports per-mode strings via `directiveEntry()` in `directives.ts:25-64` and `%MODE%` substitution — but no entry uses a third "history" key because the type doesn't allow it.

## Recommended follow-up

1. **Widen `DirectiveMode` and thread real context through (S).** Files: `directives.ts`, `MarkdownHelp.vue`, `MarkdownEditor.vue`, `PageEditorView.vue`, `directives.yml`. Change `DirectiveMode` to `"page_standalone" | "page_history" | "report"` *or* keep `"page"` and add a sibling `historyAttached: boolean` prop (less churn). `PageEditorView.vue:61` already knows via `editorMode` / `isStandalone`; pass that through. `directiveEntry()` already does per-mode lookup so YAML additions are localized.
2. **Backfill missing directives in the help (S).** Files: `MarkdownHelp.vue`, `directives.yml`. Drive the `DirectiveHelpSection` directive lists from `VALID_ARGUMENTS` (or a curated subset) instead of three hand-written arrays. At minimum add inline-capable directives (`history_dataset_name`, `history_dataset_type`, `workflow_license`, `generate_time`, `generate_galaxy_version`, `instance_*`), `history_dataset_embedded`, `history_dataset_index`, `history_dataset_link`, `invocation_inputs`, `invocation_outputs`, `history_link`, `visualization`. Mark inline-capable ones with a badge fed by `EMBED_CAPABLE_DIRECTIVES`.
3. **Document inline syntax and HID/ID resolution for history pages (XS).** Files: `MarkdownHelp.vue`, `directives.yml`. Add a short "Inline references" section with a `${galaxy history_dataset_name(history_dataset_id=...)}` example, and — when context is history-attached — a short blurb that the AI chat panel can resolve HIDs and pick IDs for you. Reuse phrasing from `lib/galaxy/agents/prompts/page_assistant.md:55-68`.
4. **Single source of truth for directive metadata (M, out of scope for this issue).** Move the directive catalog (name, description, help, embed-capable, valid args) into a server-served JSON sourced from `markdown_parse.py`, so `directives.yml`, `MarkdownToolBox`, `MarkdownHelp`, and the agent prompt cannot drift. Real tech debt; punt until there's a second drift incident.

Also: fix the stray `>` typo at `MarkdownHelp.vue:110` while you're in there.

## Scope for this issue
Items 1 + 2 + 3 + typo. Probably an afternoon. Item 4 is mentioned as out-of-scope for future work.

## References
- `client/src/components/Markdown/MarkdownHelp.vue:9-15` — binary mode prop, no history-attached arm
- `client/src/components/Markdown/MarkdownHelp.vue:51-55,108-119` — page-mode wording assumes object-ID workflow; line 110 has stray `>` typo
- `client/src/components/Markdown/MarkdownHelp.vue:89-98,121-123,150-152` — hand-curated directive lists, 14 of ~30 directives
- `client/src/components/Markdown/MarkdownEditor.vue:38-44` — sole mount site, title hard-coded to two strings
- `client/src/components/Markdown/directives.ts:3,25-64` — `DirectiveMode` type and per-mode lookup machinery (extensible)
- `client/src/components/Markdown/directives.yml:55-106` — examples of per-mode overrides already present
- `client/src/components/PageEditor/PageEditorView.vue:48,61` — `editorMode` knows history vs standalone; `markdownEditorMode` hard-codes `"page"`
- `client/src/components/Workflow/Editor/Index.vue:122-125` — report side, `mode="report"` hard-coded
- `lib/galaxy/managers/markdown_parse.py:26-70` — full `VALID_ARGUMENTS` (truth)
- `lib/galaxy/managers/markdown_parse.py:71-86` — `EMBED_CAPABLE_DIRECTIVES` (truth for inline)
- `lib/galaxy/agents/prompts/page_assistant.md:55-135` — agent-side rich tables and inline syntax the user-facing help should mirror
- Branch history: `git log -- client/src/components/Markdown/MarkdownHelp.vue` shows only typing/wording tweaks in `4afd63a9a9` (notebooks unification commit); help was inherited largely unchanged
- galaxyproject/galaxy#22361
