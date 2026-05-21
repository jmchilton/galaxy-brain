# Galaxy Notebooks (PR #22361): post-merge follow-up tracking

Umbrella tracking issue for work deferred out of galaxyproject/galaxy#22361 ("Galaxy Notebooks: Persistent Narrative for Human-AI Collaborative Science in Galaxy"). Companion PRs already merged: galaxyproject/galaxy#21942 (shared agent-operations layer), galaxyproject/galaxy#22625 (user-defined-tool agent operations).

Architecture reference: [HISTORY_MARKDOWN_ARCHITECTURE.md](../HISTORY_MARKDOWN_ARCHITECTURE.md).

mvdbeek's review approved the PR with the caveat that some review threads are explicitly follow-up scope ("There are a lot more comments in there, some of that could be followup work."). This issue tracks those + polish items we ourselves want to chase.

> **SHA caveat:** commit SHAs cited below (and inside [TEST_AGENT_TOOLS_ISSUE.md](./TEST_AGENT_TOOLS_ISSUE.md)) are from the pre-final-rebase `history_pages` branch. After merge to `dev` they will only resolve via the PR's GitHub merge commit, not on `dev` directly — refresh against the merge commit when filing the GH issue, or just link to the PR.

---

## Sub-issues with full write-ups (in this folder)

- [TEST_AGENT_TOOLS_ISSUE.md](./TEST_AGENT_TOOLS_ISSUE.md) — **aiocop regression guard for agent tool dispatch.** Drives the real `PageAssistantAgent` against a real DB via `pydantic_ai.models.test.TestModel` so the next sync-on-event-loop regression cannot slip past the test suite. Closes the gap mvdbeek flagged on the `history_tools.py` sync/async thread (`discussion_r3268670909`). Companion to jmchilton/galaxy-architecture#20.
- [CHAT_DIRECTIVE_PREVIEW_POLISH.md](./CHAT_DIRECTIVE_PREVIEW_POLISH.md) — **chat panel renders raw ` ```galaxy ` directives as plain code.** Behavior is correct (chat must not hydrate), presentation is unpolished. Recommend `STYLED_CHIPS_AND_FENCE_PILL` — small MarkdownIt post-process, no hydration, no new fetches.
## Bullet-only follow-ups (no doc needed yet)

- **Split-pane editor vs Window Manager.** mvdbeek asked whether the chat split view should use the window manager primitive instead of a hand-rolled split: <https://github.com/galaxyproject/galaxy/pull/22361#discussion_r3268509099>. Current PR refactored to `Common/SplitView.vue` via `DraggableSeparator` — answer for *now* is "split is correct for the inline two-pane editor, WM stays the right shape for detachable floating windows" — but worth revisiting after @ahmedhamidawan's UI polish pass. (Window-manager chat is on arch doc §14's long-term list and is partly integrated already.)
- **Agent displays markdown in chat instead of directly editing.** Recurring UX paper-cut: assistant narrates the proposed markdown in chat prose rather than emitting a `SectionPatchEdit` / `FullReplacementEdit`. Already iteratively softened/sharpened in `f866f7f7c9`, `e74becc73f`, `5d277375cd`, `dff03eb5a0`. Not fully solved by prompt tweaks — likely needs a structured-output rebalance or a programmatic "if you wrote >N markdown lines in `response`, emit a patch instead" check. Flag, do not fix yet.
- **Beta labeling decision** (Ahmed + jmchilton on the PR conversation tab): **Notebooks themselves are NOT beta** — they are a long-planned thin model on top of Galaxy Markdown. **Chat interface IS a candidate for beta** across notebooks *and* reports. **Pages → Reports language change is likely NOT beta** — guerler accepted the rename in the same thread ("`Galaxy Notebooks` as the primary editable document and `Galaxy Reports` as invocation-generated starting points"). Ahmed's suggestion to relocate the notebook button to the history options dropdown only makes sense if we mark *chat* beta, not notebooks — and the button still belongs at the counter level. Decision owner: jmchilton + @ahmedhamidawan, before/just-after merge.
- **Rename `isChromeFree` to a Galaxy-idiomatic term** (`PageView.vue:92`, thread `discussion_r3268492913`). jmchilton committed to a follow-up rename — "chrome" is industry-standard UI lingo but not Galaxy-ish. Trivial.
- **Delete dead `APPLY_PAGE_EDIT` / `INSERT_PAGE_SECTION` enum values** (`client/src/composables/agentActions.ts:23-24`, `:225-226`, `client/src/components/ChatGXY/ActionCard.vue:62-63`). The arch doc called these "not fully wired" — verified: `handleAction` switch (`agentActions.ts:66`) has no case for them and they fall through to `default → handleContactSupport()`. Page-edit flow uses structured output (`FullReplacementEdit` / `SectionPatchEdit`) rendered by `ProposalDiffView` / `SectionPatchView`, not action cards. These enum values are dead from an earlier design — delete, don't wire.
- **Revive skipped `test_router_with_test_model`** (`test/unit/app/test_agents.py:286`) — pydantic-ai API drift; small, adjacent to TEST_AGENT_TOOLS_ISSUE Q3.

## Considered and not tracked

Items from the architecture doc §14 "Remaining Work" — kept in §14 as the long-term vision but not tracked under this umbrella because they predate the implementation and remain speculative:

- Window Manager chat (chat already integrated into the editor in some form).
- CodeMirror 6 migration.
- Streaming agent responses.
- Orchestrator integration.

Other items considered and dropped: **concurrent edit protection** (too speculative — no collision incidents to date on pages); **stale chat exchanges after page soft-delete** (reviewer-subagent inference, never observed, not verified in code).

## Anything from the review *not* listed above?

guerler caught the one outright *bug* in the review ([`discussion_r3032429339`](https://github.com/galaxyproject/galaxy/pull/22361#discussion_r3032429339)) — chat API was reaching `Page` directly without an access check. Shipped in `88e66d6a5b` ("access-check page in chat manager", `get_accessible_page` in `chat.py`). Worth a sentence in the GH issue narrative.

All 20 unresolved mvdbeek review threads have replies and have been substantively addressed in code (typed pages client `83a3a0dc09`, `useWindowAwareNavigation` `0433dbcbd0` + `3ebd44f695`, `Common/SplitView.vue` refactor `0433dbcbd0`, threadpool-offload `c8b77adfde`, manager-delegation + SQL pagination + implicit-conversion HID fix `d4d12d30b9`, `element_count` + `nice_size` reuse `392b130270`, in-method import hoists `ad0013a413`, `for_workflows` tool tweaks reverted in `a9773c0764` / `3608bf9e21`). They are left "unresolved" in the GitHub UI only because mvdbeek has not clicked Resolve yet — there is no outstanding code work hidden in them.

Two threads point at known-followup work captured above:
- `discussion_r3268492913` → `isChromeFree` rename (bullet above).
- `discussion_r3268509099` → split-pane vs WM (bullet above).

Post-review user-facing polish that shipped during screencast prep (not from a reviewer, included so the GH issue narrative covers it): `e1d519014e` "fix empty-content save for notebooks and reports", `b513e3d4b9` "Default new history-attached page title to 'Untitled Notebook'", `65c69991b6` "Restore editor textarea full height in chat split view", `8ec67b415b` "Hide markdown toolbox when chat panel is open".

## Draft tracking-issue body (for filing on galaxyproject/galaxy)

```markdown
# Follow-up work for Galaxy Notebooks (#22361)

Umbrella issue tracking post-merge work deferred out of #22361. Approved with explicit follow-up scope ("There are a lot more comments in there, some of that could be followup work.").

## Linked sub-issues
- [ ] **Test agent tool dispatch against a real DB in an event loop (aiocop regression guard)** — closes the gap behind #22361's blocking-I/O slip. Drives the real `PageAssistantAgent` via `pydantic_ai.models.test.TestModel`. Companion to jmchilton/galaxy-architecture#20.
- [ ] **Polish chat-preview rendering of raw Galaxy markdown directives** — chat shouldn't hydrate, but raw ` ```galaxy ` blocks read as leaked internals. Small MarkdownIt post-process to pill/chip them.

## Bullets (no sub-issue yet)
- [ ] **Beta-flag decision.** Notebooks: not beta. Chat interface: candidate for beta. Pages→Reports rename: guerler accepted it on the PR, so likely not beta. Decision owners: jmchilton + @ahmedhamidawan, before/just-after merge.
- [ ] **Rename `isChromeFree`** to a Galaxy-idiomatic term (`PageView.vue:92`, [thread](https://github.com/galaxyproject/galaxy/pull/22361#discussion_r3268492913)).
- [ ] **Re-evaluate split-pane vs Window Manager** for the chat editor after @ahmedhamidawan's UI polish pass ([thread](https://github.com/galaxyproject/galaxy/pull/22361#discussion_r3268509099)).
- [ ] **Agent prefers markdown-in-chat over emitting edits.** Iteratively tuned in commits `f866f7f7c9`, `e74becc73f`, `5d277375cd`, `dff03eb5a0`; prompt-only fix likely insufficient — needs structured-output rebalance or post-hoc patch-from-prose escalation.
- [ ] **Delete dead `APPLY_PAGE_EDIT` / `INSERT_PAGE_SECTION` enum values** in `agentActions.ts`. The page-edit flow uses structured-output proposals, not action cards; these enum entries are orphaned from an earlier design.
- [ ] **Revive skipped `test_router_with_test_model`** (`test/unit/app/test_agents.py:286`).

## Status of review threads on #22361
guerler caught the one outright bug in review ([`discussion_r3032429339`](https://github.com/galaxyproject/galaxy/pull/22361#discussion_r3032429339)): chat API was reaching `Page` without an access check. Shipped in `88e66d6a5b` (`get_accessible_page` in `chat.py`). All 20 mvdbeek review threads have been substantively addressed (see PR comments). They remain unresolved in the GitHub UI only because the reviewer has not clicked Resolve. The two that hint at follow-up work are tracked as bullets above.
```
