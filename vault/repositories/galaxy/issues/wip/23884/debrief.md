# Debrief: upgrade advice structured_like profile

Source: `upgrade_advice_structured_like_profile.md`. Proposal: `proposed_upgrade_advice_structured_like_profile.md`.

## Research
- Re-checked the draft against `dev` @ `3b53c556928` (the draft cited `97142590afc`). Nothing in the files involved changed between the two.
- Confirmed the advice text, `ProfileMigration18_01` emission, the `< 26.0` gate in `execute.py`, and that #6162 added the original `< 18.09` gate.
- Confirmed via `gh` that #22432 is the PR for `43e000bd808` ("[26.0] Fix unqualified structured_like resolution, add linters"), merged 2026-04-13, fixing #22429.
- Found no duplicate issue.

## Review round (subagent)
Corrected two of my claims:
- I had written "25.x→26.0 runs only the 25.x→26.0 migrations". That's wrong: `latest_supported_version = "24.2"` and the advisor refuses anything above that. It skips migrations ending before the tool's profile, so a tool at ≥18.09 never sees the 18.01 code.
- The 26.0 break only happens in **mapped-over** runs. Unmapped runs resolve `structured_like` through `collection_prototype` over a `LegacyUnprefixedDict`, whose aliases work at any profile, one conditional or section deep. The title, opener and bullets are now scoped to mapped-over runs.

## Rewrite vs. source
- Restructured to the issue guide: one-line opener, Context, Proposed Approach, Alternatives.
- Picked the "add a 26.0 migration" option as the proposal and kept "reword only" as the alternative.
- Dropped "Not verified" and history sections. The history is now one sentence plus Context links.

## Leftovers
- No live-Galaxy reproduction. The issue is a documentation and advice mismatch, so reading the code is adequate evidence.
- The fact that unmapped and mapped runs resolve bare names differently might deserve its own bug (or a note on #23444). The issue mentions it only in a details block.
- Not checked: whether other 18.xx advice codes have drifted the same way.
