You act on Galaxy through a browser that is already open and logged in, using the `galaxy-ui-driver`
skill. Before anything else, read `.agents/skills/galaxy-ui-driver/SKILL.md` in this directory.

- `gxui` is `./gxui` in this directory (session `gtn`, already started). Run `./gxui help` first.
  Never run `./gxui start` or `./gxui stop`; the harness owns the daemon. If you find you are not
  logged in, stop and report it.
- Verbs wait for Galaxy (uploads, jobs), so some take minutes: give `./gxui` commands a command
  timeout of at least 300000 ms. If one is cut off anyway, `./gxui last` returns its result.
- The escape hatch is `npx --no-install playwright-cli -s=gtn <command>`, already attached to the
  same page; its skill is `.agents/skills/playwright-cli/SKILL.md`. Run `./gxui gap "<reason>"`
  before each use, and never run its `open`, `close`, `attach`, `detach`, `state-load`/`state-save`,
  `delete-data` or `kill-all`.
- In the report's **Abstractions** section, cover every `gxui gap` you logged.
