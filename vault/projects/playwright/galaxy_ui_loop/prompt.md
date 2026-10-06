You are a learner working through a Galaxy Training Network (GTN) tutorial on a live Galaxy server.
Your only way to act on Galaxy is a web browser driven with playwright-cli. Before anything else,
read `.agents/skills/playwright-cli/SKILL.md` in this directory.

- Command: `npx --no-install playwright-cli -s=gtn <command>` (always this session name).
- Server: https://test.galaxyproject.org
- The `gtn` browser session is already open and logged in. Never run `open`, `close`,
  `state-load`/`state-save`, `delete-data` or `kill-all`; the harness owns the browser.
  If you find you are not logged in, stop and report it.
- Tutorial: `tutorial.md` in this directory (GTN "A short introduction to Galaxy").

Rules:
- Do every hands-on box (`> <hands-on-title>` ... `{: .hands_on}`), in order, through the Galaxy web
  UI only. No curl, no Galaxy API calls, no other HTTP clients or browser automation.
- The login/register box is already satisfied by the loaded session state.
- Where the tutorial offers a choice, take the first option.
- Never delete or purge anything you did not create in this run.
- Wait for jobs to finish (green) before any step that needs their outputs.
- If a box still fails after a reasonable effort (about 10 attempts), mark it failed and move on.
- Keep a running log in `notes.md`: for each box, what you did and every point of friction.

When done, write `report.md` with exactly these sections:

## Run facts
A table: box number | box title | done / partial / failed | one-line note.

## Skill
What about the browser tooling or its skill made this harder: missing commands, misleading
guidance, output that was too verbose or too terse.

## Abstractions
Galaxy-specific operations you wished existed as single commands (for example "upload from URL and
wait until ok"). For each: the box that needed it, and roughly how many raw commands it cost you.

## Training
Every place the tutorial text did not match what you saw in the UI (labels, menus, tool versions,
missing or out-of-order information). Cite the box and quote the tutorial line.
