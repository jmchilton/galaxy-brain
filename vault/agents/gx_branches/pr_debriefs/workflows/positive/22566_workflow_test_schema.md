# #22566: Tighten the workflow test schema

https://github.com/galaxyproject/galaxy/pull/22566. Merged. +2909/-1405 across 66 files, 9 commits.

## What happened

- **2026-04-25 (Saturday):** opened. The body is one paragraph: it "Pulls in some updated version of stuff from
  #17128 that didn't make it into my approach with #18884. Also goes some way toward unifying the Planemo workflow
  test format and the workflow test format we use for the framework tests."
- **2026-04-27:** mvdbeek approved with **"Very nice cleanup, thank you @jmchilton!"** He left one soft inline
  comment. The PR had removed nested `type:` annotations from fixtures, and he wrote: "Could we allow this ? ... they'd
  help me make sense of deeply nested structures ? Not a must".
- **2026-04-30:** John posted a reply labelled **"Claude's Response:"**. It admitted the agent had conflated the
  unsupported `type:` key with the valid `collection_type:` and offered to restore the annotations. mvdbeek: "No, i
  think that's fine then". He merged it the same day. Open to approval was 2 days; open to merge about 5 days.

## Why it landed well

- **It is consolidation again**, continuing the #21907 thread of making the workflow test format match Planemo's.
- The large diff is mostly fixture rewrites and schema, so there is no semantic change to argue about.
- **The agent error was disclosed openly.** The "Claude's Response" label plus "I conflated it" turned a possible
  review round into a one-line resolution.

## Reusable signal

- Another counterexample to "size to the reviewer's patience". 66 files merged with one non-blocking nit because the
  direction was already agreed and the content was mechanical.
- **Audit what the agent removed, not just what it added.** The one comment here was about readability annotations
  that were silently deleted. The fix was cheap because the error was admitted plainly.
