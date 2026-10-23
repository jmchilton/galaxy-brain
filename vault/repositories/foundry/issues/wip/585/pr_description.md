Title: Bind authored user-defined tools to workflow steps

Supersedes #617, carrying its commits forward unchanged. Gives the Foundry a maintained source for how a workflow step uses a Galaxy user-defined tool, and wires it into the per-step Molds.

An agent reproducing a paper on usegalaxy.org built a workflow around a user-defined tool it had authored. It first referenced the tool by `tool_id` only, which leaves the step unresolved because user-defined tools aren't in the toolbox. It then put the tool's `uuid` in `content_id`, `tool_id` and `tool_uuid`, which ran but produced a bogus Tool Shed "derivation" warning. galaxyproject/galaxy#23694 fixed that in Galaxy (the mismatch is now a 400) and added a "Using a tool in a workflow" section to Galaxy's authoring help.

From #617:

- **Vendor the authoring help.** `client/src/components/Tool/authoringHelp.yml` is copied into `content/research/galaxy-user-tool-authoring-help/` with a framing note.
- **Derive the binding rule.** `content/research/galaxy-user-tool-workflow-binding/index.md`:
  - In gxformat2, embed the authored `GalaxyUserTool` definition under the step's `run:`.
  - `tool_uuid` is only for a native `.ga` step bound to an already-registered tool.
  - Never put the `uuid` in `tool_id` or `content_id`.
- **Bind authored tools in the Molds.** `implement-galaxy-tool-step` takes the authored definition as an input, with a binding procedure, eval property and scenario. `advance-galaxy-draft-step` embeds on fall-through to authoring. `author-galaxy-tool-wrapper` says the definition is embedded as written, not registered first.

Added here:

- **Merged current `main`.** Conflicts were in the two per-step Molds and their eval; main's summary-reuse, conditional-case and `rename:` guidance is kept, with the authored-tool paths added.
- **Re-pinned the vendored help** to `galaxyproject/galaxy` `release_26.1` (`5af1d03c929`) through `$GALAXY`, now that #23694 has merged. This picks up Galaxy's new output-labels section and Markdown-only tool help. The `galaxy_mvdbeek` prefix and the pre-merge re-pin steps are gone.
- **Dropped the gxwf workarounds.** jmchilton/galaxy-tool-util-ts#185 shipped in 1.13.1, so the pinned 1.14.0 handles a `GalaxyUserTool` under `run:`. I checked a draft with an embedded step: `validate`, `draft-validate` with and without `--concrete`, `draft-next-step`, and `draft-extract` all pass, and `draft-extract` keeps the workflow output even with no `out:` list. The "gxwf limits in the pinned version" section and the Molds' validation fallbacks are removed.
- **Registration guidance for #585.** The binding note gains "Registering a tool on a server":
  - `POST /api/unprivileged_tools` with `{"representation": <GalaxyUserTool>}`, gated by `enable_beta_tool_formats` and the Custom Tool Execution role, returns a `uuid`.
  - `POST /api/dynamic_tools` is admin-only (`require_admin=True`) and returns 403 for an ordinary user.
  - A returned `uuid` means the definition was accepted, not that the tool runs.
  - `author-galaxy-tool-wrapper` now loads the note on demand when asked to register or run a tool on a server, so the guidance reaches that skill and not only the per-step ones.

Fixes #573. Fixes #585. Addresses #587 differently than it proposes: format2 needs no `tool_uuid`, because the definition is embedded. #582, whether Planemo can run an embedded tool, stays open and is recorded as an open question; `run-workflow-test` is unchanged until that is answered.

`pnpm run validate`: 0 errors. `check-generated`, `check-casts`, `check-verify`, `validate-roadmap` and `check-planemo-pin` pass. `check-vendored` fails only on existing Galaxy and gxwf entries, compared against local checkouts that are not at their pins; the re-pinned entry has no drift.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
