# Polish chat-preview rendering of raw Galaxy markdown directives

## Summary
Agent chat replies that inline Galaxy directives (e.g. ` ```galaxy\nhistory_dataset_display(history_dataset_id=42)\n``` `) render as raw text in the chat panel — because chat uses a vanilla MarkdownIt engine, not the directive-hydrating renderer used by the page preview. Behavior is correct (chat should not hydrate directives), but the unstyled raw text is unpolished. Goal: keep chat non-hydrating, but present directive blocks/inline refs as readable chips/code with light affordances.

## Current behavior
- Chat panel renders assistant content via `props.renderMarkdown(props.message.content)` and injects HTML with `v-html` — `client/src/components/ChatGXY/ChatMessageCell.vue:51`.
- `renderMarkdown` comes from `useMarkdown({ openLinksInNewPage: true, removeNewlinesAfterList: true })` in `client/src/components/PageEditor/PageChatPanel.vue:47`.
- `useMarkdown` is plain MarkdownIt with link/heading/list rules only — no `galaxy` fence handling — see `client/src/composables/markdown.ts:158`.
- The page preview path is different: `Markdown.vue` calls `parseMarkdown` which splits ` ```galaxy ` fences into directive sections and dispatches them through `SectionWrapper` — `client/src/components/Markdown/Markdown.vue:74`, `client/src/components/Markdown/parse.ts:47`.
- Result: a ` ```galaxy ` block in a chat message is rendered by MarkdownIt as a generic `<pre><code>` with literal `history_dataset_display(...)` inside, and inline `${galaxy history_dataset_name(...)}` shows up unmodified as text.
- Diff renderers are unaffected and intentional: `ProposalDiffView.vue:64` and `SectionPatchView.vue:127` already use raw `<pre>` for diff lines — diffs of markdown should show the source.

## Why this is fine but unpolished
Hydrating directives inside chat would re-trigger dataset fetches per message, drag in heavy components for content the user has not asked to embed, and make scrollback re-render the world. The chat is correctly a transcript, not a published page. The problem is purely cosmetic: raw ` ```galaxy ` and `${galaxy ...}` look like leaked internals, and embed-heavy proposals copy-pasted into prose can bloat exchanges. Polish, don't hydrate.

## Proposed direction (recommended)
**STYLED_CHIPS_AND_FENCE_PILL**: keep a non-hydrating MarkdownIt path, but add small post-processing so directive surfaces read as first-class UI:

- For ` ```galaxy ` fences: render a labeled code block — pill header "Galaxy directive" + directive name extracted from the first non-blank line, plus the existing monospace body. Optional collapse toggle if body > N lines.
- For inline `${galaxy history_dataset_name(history_dataset_id=ID)}`: render as a compact chip showing "directive_name (hid=…)" using existing inline `<code>` styling already present in `ChatMessageCell.vue:193`.
- Use `EMBED_CAPABLE_DIRECTIVES` / `VALID_ARGUMENTS` from `lib/galaxy/managers/markdown_parse.py` as the recognition set (mirror in TS, or generate). Unknown directive names render unchanged so we don't accidentally hide malformed agent output the user needs to see.
- Add a per-block "Insert into page" affordance only if cheap — otherwise punt to a follow-up. Primary goal is legibility.

Rationale: reuses the existing `parse.ts` directive-extraction logic conceptually without depending on its Vue hydration chain; keeps chat fast; matches the agent's intent ("here is the directive I'd embed") without lying about live rendering.

## Alternatives considered

| Option | One-liner | Why rejected |
| --- | --- | --- |
| STYLED_CHIPS_AND_FENCE_PILL | Post-process MarkdownIt output to chip directives, no hydration. | Recommended. |
| FULL_HYDRATION_IN_CHAT | Run chat content through `Markdown.vue` / `SectionWrapper`. | Triggers per-message dataset/job fetches; heavy DOM in transcript; defeats purpose of chat-as-log; risks reactive loops if message list rerenders. |
| PROMPT_ONLY_FIX | Tell agent in `page_assistant.md` never to emit directives in chat prose, only in `replace_entire_document` / `patch_section`. | Necessary-but-not-sufficient — prompt is already strict (`lib/galaxy/agents/prompts/page_assistant.md:31`, `:55`) and agent will still cite directives when explaining ("here's the directive I used: ..."). Pair this with STYLED_CHIPS rather than rely on it alone. Worth a small tweak (see Implementation). |
| STRIP_DIRECTIVES_FROM_CHAT | Pre-process to remove ` ```galaxy ` blocks from chat content before render. | Hides information from the user; breaks "how does directive X work?" Q&A use case explicitly called out in prompt (`:33`). |
| HYDRATE_ONLY_NAME_DIRECTIVES | Hydrate only cheap inline directives (`history_dataset_name`). | Inconsistent surface; still triggers small fetches per chat scroll; not worth complexity over chips. |

## Implementation plan

1. Add a TS module `client/src/components/ChatGXY/galaxyDirectivePreview.ts` (or under `Markdown/`) exposing:
   - `KNOWN_DIRECTIVES: Set<string>` mirroring `VALID_ARGUMENTS` keys.
   - `formatDirectiveBlock(raw: string): { name, args, body }` — reuses logic shape from `client/src/components/Markdown/parse.ts:151` (`FUNCTION_CALL_LINE_TEMPLATE`) without depending on Vue/SectionWrapper.
2. Extend `useMarkdown` in `client/src/composables/markdown.ts` with an opt-in flag `galaxyDirectivePreview: boolean` that registers a MarkdownIt rule replacing `fence` rendering for `info === "galaxy"` and a text rule (or post-render walk) for inline `${galaxy …}`. Output static HTML with classes like `chat-galaxy-directive`, `chat-galaxy-inline-directive`. (Note: `parse.ts:5` defines `FUNCTION_CALL_LINE_TEMPLATE`; `parse.ts:151` is the usage site — both worth glancing at.)
3. Set that flag at the `useMarkdown` call site: `client/src/components/PageEditor/PageChatPanel.vue:47`.
4. Add scoped styles for the new classes in `client/src/components/ChatGXY/ChatMessageCell.vue` (pill header, collapse, inline chip) — these go in the existing `<style scoped>` deep-selectors block (`:deep(pre)` neighborhood at lines 201–213).
5. Minor prompt nudge in `lib/galaxy/agents/prompts/page_assistant.md`: in the chat-vs-proposal section (~`:31`–`:33`), explicitly say "when answering questions about directives, name the directive inline (`history_dataset_display`) rather than pasting a full fenced block unless illustrating syntax". Keeps the existing strict embed-in-proposal guidance.
6. Tests:
   - Extend `client/src/components/ChatGXY/ChatMessageCell.test.ts` with cases: known ` ```galaxy ` fence renders pill + body, unknown fence info-string renders as plain pre, inline `${galaxy history_dataset_name(...)}` renders chip, malformed directive falls through to unchanged.
   - Add a `client/src/composables/markdown.test.js` case for the new `galaxyDirectivePreview` flag.
   - `PageChatPanel.test.ts` only needs a smoke assertion that the flag is on; no integration churn expected.
   - No backend tests — directive parser is unchanged.
7. No new fixtures required; reuse strings already present in chat tests / `parse.ts` test inputs.

## Open questions
- Should the chip carry a "copy directive" button, or rely on text-select?
- Generate the TS `KNOWN_DIRECTIVES` set from `markdown_parse.py` (build step) or hand-mirror with a CI drift test?

(Implementation-time decisions deferred: collapse threshold, chip-arg detail, resolved-HID vs encoded-ID in chip header.)

## References
- galaxyproject/galaxy#22361
- `client/src/components/ChatGXY/ChatMessageCell.vue:51` — chat `v-html` injection point
- `client/src/components/PageEditor/PageChatPanel.vue:47` — `useMarkdown` call site for chat
- `client/src/composables/markdown.ts:158` — vanilla MarkdownIt, no galaxy fence handling
- `client/src/components/Markdown/Markdown.vue:74` — preview uses `parseMarkdown` + `SectionWrapper`
- `client/src/components/Markdown/parse.ts:47` — ` ```galaxy ` fence extraction logic to mirror
- `client/src/components/PageEditor/ProposalDiffView.vue:64`, `SectionPatchView.vue:127` — diff views, intentionally raw, out of scope
- `lib/galaxy/agents/prompts/page_assistant.md:31`, `:55` — existing chat-vs-proposal guidance + embedding rules
- `lib/galaxy/managers/markdown_parse.py:26`, `:71` — `VALID_ARGUMENTS`, `EMBED_CAPABLE_DIRECTIVES` source of truth
- Recent prompt-tuning commits: `e74becc73f`, `f866f7f7c9`, `5d277375cd`, `4afd63a9a9`
