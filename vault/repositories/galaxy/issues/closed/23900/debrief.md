# Debrief: rename placeholder cursor skips tokens

Source: `rename_placeholder_cursor_skips_tokens.md`, a handoff note from polishing branch `issue_23896_rename_input_segments`. Proposal: `proposed_rename_placeholder_cursor_skips_tokens.md`.

## Research

- Ran the real `_gen_new_name` from `origin/dev` @ `3167c014a47`, using a `git archive` of `lib/` and the main Galaxy venv. Every row in the source table reproduced, and so did the re-expansion case (`abother x`) and the unclosed `#{` case.
- **Corrected the source's premise.** The source said the bug triggers when a replacement is "shorter than its placeholder" and named "short values with `basename`" as a common trigger. Probing the boundary shows a skip only when `len(replacement) + gap < 2`:
  - `#{missing}_#{input}` → `_#{input}` (fails)
  - `#{missing}__#{input}` → fine
  - `#{a}_#{b}` with a=`x` → fine
  - `#{a|basename}_#{b}` → fine

  The bug is real but narrow. In practice it needs an unresolved reference, or a one-character value, right before another placeholder.
- Duplicate search found nothing. Related issues: #23896, #19000, #15279, #11948. #23877 is a docs PR. The #23896 fix has no PR yet; its branch is pushed to the `jmchilton` fork.
- IWC has 6 rename templates, each with a single placeholder, so none is affected. The issue says plainly that this is a reproduction, not a user report.

## Rewrite

- Started with the table, then stated the precise trigger condition. Moved the code walk and the reproduction into `<details>`.
- The Context section names the source branch and #23896 (it supplies the empty-string trigger), and says the branch's API test template order works around this bug.
- Proposed approach: a single-pass `re.sub`. Alternatives: fixing the cursor arithmetic, or documenting the problem.

## Review round (subagent)

- Confirmed every claim and found no duplicate. A prototype of the regex matched current output on about 25 edge cases, including unclosed `#{`, `#{a#{b}}`, repeats, whitespace and `#{}`.
- Fixed my trigger wording. I had written "empty or one-char value and gap ≤1", which wrongly includes a one-char value with gap 1.
- Added a second cause of re-expansion: `str.replace` rewrites copies of a placeholder inside earlier values (`#{a} #{b}` with a=`#{b}` → `B B`). So the cursor-only alternative must also stop using `str.replace` before it can stop the rescan, and the Alternatives section was corrected to say so.

## Leftovers

- The title says "empty placeholder", but a one-character value also triggers it. Left as is because empty is the realistic trigger.
- `${...}` inside input names is still expanded by the `replacement_dict` pass after the regex change. That behavior is unchanged and not mentioned in the issue.
- It's low impact: real workflows only hit it with adjacent placeholders plus an unresolved reference.
