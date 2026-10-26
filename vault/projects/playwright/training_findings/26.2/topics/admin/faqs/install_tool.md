# topics/admin/faqs/install_tool.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `01e603d896a` (`faq_server.sh main`, now with a shed tool conf; needs
network for the Tool Shed). Installed devteam `bwa` (newest revision) into a new Mapping section, as the cvmfs and
pulsar tutorials pass it (`query=bwa`, `name="Map with BWA-MEM"`, `section=Mapping`).

## GTN

- `install-tool-admin-activity`: Admin is in the Activity Bar, not the top bar. Steps 3-7 match 26.2: Tool
  Management > Install and Uninstall, the search, devteam's `bwa` first, Install per revision (newest first), the
  Target Section box and **Ok**.

## Galaxy

- Step 1 searches `bwa` before installing. After the install, the tool panel showed nothing for `bwa`, or for a new
  query, until a page reload: the client tool store never refreshed. Fixed on the branch (b54e4c00664), queued as
  `tool_panel_stale_after_toolshed_install` (dev; same in 25.0). On servers without the fix, trainees need to reload
  before the tutorial's next step.
- Coverage: `test_admin_toolshed` (selenium, `@flakey`, live Tool Shed) installed and uninstalled with raw xpaths and
  sleeps. Rewritten on new `admin_toolshed_install` / `admin_toolshed_uninstall` helpers and `admin.toolshed.*`
  navigation components; it now installs into a section and opens the new tool from the panel without a reload.
- gxui: `tool-install QUERY NAME OWNER [--section] [--revision]`, `tool-uninstall QUERY NAME OWNER`.
- faq_server.sh: Galaxy installs into the first tool conf with a `tool_path`; the replay tool conf was first, so bwa
  landed in the worktree's `test/functional/tools`. A shed tool conf now comes first. Data-table `.loc` files still go
  under the worktree's `tool-data/shed` (ignores `shed_tool_data_path`); delete after runs.
