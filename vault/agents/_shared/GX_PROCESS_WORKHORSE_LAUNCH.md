You'll be given a Galaxy issue number, a file with an issue or plan, or a prompt. Launch a workhorse to implement and polish it via [`PROCESS_HERDR_LAUNCH.md`](PROCESS_HERDR_LAUNCH.md) with:

- `AGENT_DIR`: `gx_workhorse`
- `NAME`: `wh-<issue number>` or `wh-<short-slug>`
- `PROMPT`:
  - issue number: `Implement galaxyproject/galaxy#<N>.`
  - issue or plan file: `Implement the plan in <absolute path to file>.`
  - prompt: the user's text verbatim

Append any extra direction the user gave (base branch, scope limits, things to skip). Don't restate the workhorse process - it gets that from `gx_workhorse/AGENTS.md`.
