# Unposted review draft

**Resolved 2026-10-17:** The P2 below was fixed and pushed in `2cc6fd033cb`; see [fix and verification](fix.md). This document preserves the initial review and is no longer a current request for changes.

Reviewed commit: `afd897e4d4a93e2a0f1eefcf9a8dcf009d8adb1c`.

## [P2] Preserve plain searches when selecting a tag

Suggested inline location: `client/src/components/ToolsList/ToolsList.vue:295-297`.

The new tag picker is still enabled for a plain search like `fastqc` (and `#favorites`), but selecting **Quality Control** replaces the input with just `tag:"Quality Control"`. `shouldPreserveRawSearchText` only detects a query that already mixes structured filters with free text, and `setFilterValue` drops bare text when rebuilding the recognized filters. This broadens a keyword search to every tool with the tag, or loses the favorites restriction. Please preserve the existing raw condition when applying a tag, or disable this picker whenever the current nonempty search cannot round-trip through the structured editor. I reproduced both cases with mounted-component tests; the existing `owner:devteam` plus tag case still passes.

147 focused/existing consumer tests pass. Two supplemental regression cases demonstrate the search loss.

## Risks

Risks are minimal in terms of irreversible choices: this UI/store change is a two-way door, with no schema migrations or API contract changes. Search-condition preservation and shared dropdown behavior are the main correctness considerations.
