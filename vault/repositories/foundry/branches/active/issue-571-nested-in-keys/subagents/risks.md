Risks are minimal - this change doesn't lock the project into particular difficult to change choices (a two-way door). It adds documentation and an on-demand reference; reverting the Mold's reference and recasting removes all of it.

<details><summary>Risk Details</summary>

- The connection rule (`label` then `id` in list form, map key in map form) was checked against `gxwf` 1.15.0 and `gxformat2` 0.28.0 validation only, not a live Galaxy import. If import resolves differently, agents would write drafts that validate and then fail. A note edit corrects it, but drafts built in the meantime wouldn't be corrected.
- The note's nearby "commonly `step_id/output_id`" stays in place above the new paragraph, and now reads loosely beside the stricter rule.
- The implement cast grows by about 135 KB (433 KB total, third largest of the casts measured). This is repository and bundle size only, until an agent opens the file.
- The cast lists `references/notes/gxformat2.schema.json` with "read it where that note directs", and the note says to use it to inspect the structural vocabulary. Nested wiring is common, so the note will load often (8.8 KB). An agent could then also open the 126 KB schema, which doesn't help with the question that triggered the load.

</details>

<details><summary>Risk Review Advice</summary>

Is the recast an acceptable cost? Yes. Loading is lazy: `SKILL.md` gains two lines, and the note and schema cost context only when opened. The companion comes with the note by design (`companions:` in the note's frontmatter), and the summary-to-template casts already carry the same 3,926-line file. The bundle also already holds comparable files on demand, including a 65 KB draft schema and a 45 KB collection semantics file, and seven other casts carry a 207 KB tests schema. The lines are generated and need no line-by-line review. What to watch is the agent opening the schema without need, not the disk size. If run traces show that, split the two facts into a smaller note; nothing here prevents it.

A human should check that the connection sentence matches their expectation of Galaxy import, since that path wasn't run. `make check-casts` and `make check-generated` pass at this commit and leave the tree clean, so the regenerated files match their sources.

</details>
