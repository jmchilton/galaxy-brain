# Debrief: rename action input suffix matching

Source: `rename_action_input_suffix_matching.md` (Codex draft). Proposal: `proposed_rename_action_input_suffix_matching.md`.

## Research
- Reproduced the bug against `post.py` from `dev` @ `3b53c556928`, using the Galaxy venv. Results: `#{input1}` → `cond|xinput1`; with two same-leaf inputs the first one wins; a missing reference becomes `''`.
- Traced the fallback to `bece9ddfff0`, part of #15978, which started recording inputs under their full path.
- Checked that job associations hold only qualified keys. `_record_input_datasets` iterates the `LegacyUnprefixedDict`'s real keys, never its aliases, so the suffix loop is the only path an unqualified nested reference can take.
- Scanned tools-iuc and galaxytools (2,650 tool XMLs) for inputs that can coexist, skipping pairs in different `<when>` branches. That gave 6 partial-segment hits (e.g. velocyto `#{s}` → `main|barcodes`) and 66 same-leaf pairs. The first scan, which ignored branches, overcounted: 144 hits, most of which can't occur.
- Found no duplicate issue.

## Review round (subagent)
- Fixed the counts: 66 is pairs across 33 tools, not 66 tools.
- Fixed the ordering claim: association order isn't defined. Datasets come before collections, and there's no `order_by`.
- `#{cond|input}` doesn't work as a qualified spelling, because `|` separates operations. Only the dot form works, so that recommendation was removed.
- Added #11948 for history and corrected the impact: the workflow editor now lists qualified dot names, so the bug mainly hits workflows from before 23.1 and hand-typed references.
- Added a real case where nothing matches: two IWC workflows rename `ivar_variants` output with `#{input}`, but the input is `input_bam`, so the placeholder renders empty. I checked both `.ga` files myself.

## Leftovers
- No full workflow-invocation reproduction, and no IWC workflow that hits the wrong-input case. The real-world evidence is tool shapes plus the empty-placeholder case.
- The rbpbench hit wasn't checked by hand.
- The ivar empty rename might be worth a separate IWC PR: `#{input_bam}`.
- Impact is low. The issue mostly argues for a correctness fix and a warning.
