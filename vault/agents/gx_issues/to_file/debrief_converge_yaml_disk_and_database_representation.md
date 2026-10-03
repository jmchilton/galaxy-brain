# Debrief: converge_yaml_disk_and_database_representation

Source: `converge_yaml_disk_and_database_representation.md`, a Codex umbrella draft pinned to #23877 head b4740908. Proposal: `proposed_converge_yaml_disk_and_database_representation.md`.

## Research

- Re-checked everything on `origin/dev` 537915642fa in a scratch worktree with a fresh uv venv. A script covered all six claims in the draft. All of them reproduce on dev.
- **Boolean default, run end to end.** A temporary API test created a `GalaxyUserTool` with `{type: boolean, value: true}`. The tool form showed `False` and the job wrote `false`. `boolean_is_checked()` reads only `checked`, and both models reject `checked`. So no tool created through the API can default a boolean to true. This became the headline row.
- Groupings, scalar outputs, optionality, the dropped `format_souce` key and the fixture inventory (24 tools, 22 pass) were all checked at the model/parser level only.
- Optionality: when the key is missing, the parser infers `optional: true` for text and multi-select inputs (`text_input_is_optional`). A user tool's full dump writes the model default `optional: false`, so the input becomes required. The admin `exclude_unset` dump keeps it optional.
- The parser is constructed in six places, and three different `model_dump` policies feed it.
- Duplicate search: none found. #23380 is partly addressed already, since collection outputs now declare `format`/`format_source`/`metadata_source` and are `extra="forbid"`. #22758 (closed) is a precedent for the same kind of split in collection outputs.

## Rewrite

- Turned the agent-to-agent draft into a pitch. A comparison table (model vs loader vs result) leads, and the repros, fixture list and parser-site table are in details.
- The draft's contract, slices, stored-row policy and acceptance tests are condensed into Proposed Approach details, with a mermaid diagram of the target shape. Added three alternatives: teach the parser both spellings, validate at the boundary only, and fix each mismatch separately.
- Dropped the "user direction" framing and the Codex attribution, as the style guide requires.

## Review (one round, subagent)

- Nothing egregious and no duplicates. Two errors were fixed:
  - **`lift_user_tool_source` claim.** I said it doesn't run on the execution path. That was wrong: `dynamic_tool_to_tool` lifts stored `GalaxyUserTool` rows (753ddd6a099). The lift feeds the same parser, so it fixes no row in the table. `GalaxyTool` rows get no validation.
  - **`checked` row.** It understated the problem. Admin representation creation rejects `checked` too, not just user tools.
- Also reframed the optionality row and quoted the `yaml_parameters.py` docstring ("`to_internal()` is not load-bearing for execution today"). Added #22758 as context and suggested growing the existing lift into the historical-read adapter.

## Open

- Only the boolean row was run against a real server. Unchecked: whether static collection `elements` in `collection_creates_pair_y.yml` works at all.
- Child drafts `yaml_grouping_model_loader_mismatch.md` and `reject_unknown_yaml_dataset_output_fields.md` overlap slices 2 and 5. Decide whether to file them as sub-issues or fold them into this one and retire them.
- The boolean bug could be its own small issue or a quick PR. It's the most user-visible bug here and needs no umbrella.
- Scratch worktree `scratchpad/gx_dev` holds the temp test `lib/galaxy_test/api/test_repro_converge.py`. Remove the worktree after handoff.
