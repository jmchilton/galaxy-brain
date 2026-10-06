Your only way to act on Galaxy is a web browser driven with playwright-cli. Before anything else,
read `.agents/skills/playwright-cli/SKILL.md` in this directory.

- Command: `npx --no-install playwright-cli -s=gtn <command>` (always this session name).
- The `gtn` browser session is already open and logged in. Never run `open`, `close`,
  `state-load`/`state-save`, `delete-data` or `kill-all`; the harness owns the browser.
  If you find you are not logged in, stop and report it.
