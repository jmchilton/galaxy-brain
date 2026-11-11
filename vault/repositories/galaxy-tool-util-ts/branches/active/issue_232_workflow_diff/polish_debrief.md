# Polish debrief

Run via Claude Opus 5.5 at high effort. The coordinator split it into separate agents, since subagents can't start their own.

- **Polish agent:** wrote the description, four titles and the `enhancement` tag, and moved the queue entry to `branches_need_polish`.
- **Strengthen agent** ([strengthen.md](subagents/strengthen.md)):
  - The text test now pins the full output, byte-identical to Python's.
  - Added red-to-green missing-file exit-code tests.
  - Updated the changeset.
  - Corrected how the description attributes #796 and how it lists the divergences.
  - Head is now `433db8de`.
- **Coordinator:** on 2026-11-11, at John's request, opened draft PR #233 with the first title option and `enhancement`, and linked it from gxformat2#296's body.

Leftover questions for John:

- Should the iwc-lab#8 pair go into gxformat2's diff examples?
- Should every read or parse failure exit 2? (`lint` exits 1 for warnings.)
- Should the TS out-keys test be dropped now that the synced case covers it?
