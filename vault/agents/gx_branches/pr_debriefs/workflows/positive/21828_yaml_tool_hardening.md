# #21828: Various YAML Tool Hardening and Progress toward Tool State Goals (workflow-adjacent)

https://github.com/galaxyproject/galaxy/pull/21828. Merged. +5160/-199 across 63 files, 45 commits. Labelled
`area/tool-framework`. Included because tool state feeds workflow state, and because it is the largest PR here to get
strong praise.

## What happened

- **2026-02-11 22:08:** opened as a draft, "Extracted from #17393" (the long-running structured tool state branch).
- The description opens with a direct ask: "@mvdbeek this is probably too much to review in this format but it is only
  growing. Any ideas about stuff you'd like to see pulled out and reviewed in isolation? I think the biggest changes
  to review are probably the parameter_specification.yml file and runtime.py / evaluation.py".
- The rest is a long **"AI Generated Summary:"** section, labelled as such.
- **2026-02-12, from 07:41:**
  - mvdbeek objected to one bullet: flattening test inputs to the pipe format "seems very unfortunate?". He added
    "Other than that the description reads great, now to actually review it :)".
  - He wrote "I've reviewed all commits and they look great ... this all makes perfect sense to me."
  - He approved with **"Awesome, I think we should merge this!"** and asked for one change (JSONType → native JSON).
- John pushed back on the flattening claim ("That is a surprising claim ... Are you sure?"). mvdbeek conceded: "I
  don't know what I was thinking, yes, we don't use this at all".
- mvdbeek pushed his own fix commits (JSONB and lint) to the branch.
- **2026-02-13:** John marked it ready, and mvdbeek merged it. Open to merge was about 41 hours.

## Why it landed well

- **The direction had been agreed for years** (#17393, structured tool state). The PR was progress on a shared goal,
  not a proposal.
- **John flagged the size himself, offered to split it, and pointed to the 2–3 files that matter.** That defused the
  size objection before it was raised.
- **The AI summary was labelled.** mvdbeek praised the description ("reads great") and used it to find the one bullet
  he disliked.
- John pushed back with a concrete question, not a defense of the design, and the reviewer corrected himself.
- An out-of-scope suggestion (init in the constructor) became separate issue #21843 rather than growing the PR.

## Reusable signal

- **Large PRs land when the author names the review hotspots and offers a split.** Line count matters less than
  whether the reviewer knows where to look.
- **When the reviewer pushes his own commits to your branch, he wants the PR in.**
- This PR is not workflow-labelled. Weight it as supporting evidence only.
