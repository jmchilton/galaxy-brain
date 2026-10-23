# gxui pitch refinement plan

This is work that would strengthen `GALAXY_UI_DRIVER_PITCH.md`, which now pitches only gxui.
Items are ordered by leverage. Checked against gxui tip `0450e986d59`, the `galaxy-ui-driver`
skill at `f00d50c`, and `GALAXY_UI_SKILL_RUNS.md`, on 2026-10-21. Items 4 and 5 were rechecked
later that day against tip `fddc4bda08a`, after the restack onto
`workflow_editor_connection_helpers`.

## 1. Re-run the A/B as three arms on current gxui (L)

The current table comes from one model, n=3, on 2026-10-07. gxui changed between the arm A runs,
and there was no MCP arm.

**Arms**, all on the same pinned versions, the same tutorial, server and harness:
- **M:** `@playwright/mcp` with its stock config.
- **B:** `playwright-cli` with its stock skill.
- **A:** current gxui plus `galaxy-ui-driver`, both pinned to a single commit for the whole series.

**Design:**
- n of 5 or more per arm.
- At least two models, for example Codex and Claude.
- Run against a local `faq_server.sh` Galaxy whose client matches `navigation.yml`, plus one run
  per arm on test.galaxyproject.org.
  - The local server removes the DNS-outage and 429 noise, and lets each run use a fresh user.
  - The test.galaxyproject.org runs keep the public-server case.
- Interleave the arms in time.

**Measure:**
- Pass rate on `verify.py`.
- Wall time.
- Input tokens, split into fresh and cached.
- Model requests.
- Mean context per request.
- Commands, and how many failed.
- Polling and wait commands, such as hand-rolled `run-code` waits.
- For arm A, the transcript layer counts.

Report the median and the range, not single runs.

**Strengthens:**
- "Cheaper than generic browser tools": this would be the first measured MCP comparison.
- "Steadier": see item 2.
- It turns the "these numbers are dated and need to be redone" paragraph from a confession into
  results.
- The MCP comparison stops resting on static schema cost. That cost is only about 5k tokens per
  request, so about 0.5M on a 9M run. The real M-vs-B difference is unknown.

Reuse `galaxy_ui_loop/` (`run.sh`, `verify.py`, `metrics.py`). It needs an arm M `tooling_m.md` and
a local-server mode.

## 2. Measure resilience directly (M)

Today "steadier" rests only on fewer failed commands, and that count fell as gxui changed between
runs.

**Work:** add resilience metrics to `metrics.py`, run within the item 1 series:
- **Failures per run:** a failed command, plus the commands spent until the next successful step.
- **Unrecovered failures.**
- **Variance in wall time and tokens across runs:** steadiness means a tight range.
- **Fault injection:**
  - a slow job (a delayed tool);
  - a browser relaunch mid-run (the daemon already reports "browser died and was relaunched");
  - an expired login.
- **One deliberate version-skew run per arm:** an older client against gxui's `navigation.yml`.

**Strengthens:** "steadier", with a number behind it. It also shows honestly where gxui is
weaker. The skew test is gxui's known soft spot: phase2-runA1's `dataset-copy` failed on an older
client. Showing that limit openly makes the pitch more credible.

## 3. Run a gxui script against the test Galaxy in CI (M)

Nothing in `lib/galaxy_test`, `test/integration_selenium` or `.github` runs gxui.
`test/unit/selenium/test_gxui.py` drives a static fixture page and a fake login server.

**Work:**
- Add one Playwright-only Selenium test that starts a daemon against the test server.
- It runs `collections_convert_datatype.gxui.sh` verb by verb, then checks the result through the
  API.
- Parametrize it over two or three more of the 18 FAQ scripts.
- Move those scripts into the Galaxy repo as test data. Today they exist only in the vault.

**Strengthens:**
- "Hardened abstractions": verbs are exercised against real Galaxy on every PR.
- "Release QA as scripts": the replay scripts are checked instead of rotting.
- The pitch's lead script can carry the caption "this runs in CI".

## 4. Make verb metadata trustworthy (S)

The lead visual is `gxui help` with "(backs onto X)". Three verbs have false or no-op metadata:
- `workflow-add-tool` never calls `workflow_editor_add_tool_step`. (`workflow-connect` now backs
  onto `workflow_editor_try_connect` and calls it, so it is fixed by item 5.)
- `login` only raises; the client handles it.
- `collection-build` names only one of its two builders.

17 backing methods also have no docstring, including `tool_open`, `history_contents` and
`workflow_editor_connect`.

**Work:**
- Correct `method=` on those verbs.
- Add a unit test over `REGISTRY`: each verb's method exists, the verb calls it, and it has a
  real docstring.

**Strengthens:** "verbs are Galaxy's own vocabulary". A reviewer who checks a single "backs onto"
line won't find a false one.

**Progress (2026-10-21, on `galaxy_ui_driver_editor_refs`; mostly done):**
- `workflow-add-tool` calls `workflow_editor_add_tool_step`. Its Tool Shed GUID workaround moved
  into `tool_open`.
- All 16 undocumented backing methods have docstrings. (The 17 counted earlier included
  `workflow_editor_connect`, which no verb backs onto any more.)
- New parametrized test `test_verb_backs_onto_a_documented_method_it_calls`. For each verb, the
  method exists (or its component path resolves), it has a docstring, and the verb or a
  `verbs.py` helper calls it. Before the fixes, 21 verbs failed.
- `login` is exempted in the test, because the daemon calls `submit_login`.
- Not done: `collection-build` still names only its list builder.


## 5. Cover or lift the workflow editor verbs (M; only if the editor stays in the pitch)

`workflow-steps`, `-step`, `-connect`, `-disconnect`, `-remove-step` and `-output` drive the canvas
with raw selectors and mouse moves. Together with other verbs, `verbs.py` makes 34 such calls.
None of it is covered by any test against Galaxy.

**Work:**
- Cheapest: add one CI script (item 3) that builds and saves a two-step workflow.
- Fuller: lift step selection, connect with the refusal reason, and disconnect onto
  `NavigatesGalaxy`, with `navigation.yml` entries.

**Strengthens:**
- The skill advertises editor verbs, and the runs ledger shows them helping:
  `refine-workflow-editor-1` made 114 `call`s at 101k mean context, and the next run, with editor
  verbs, ran at 63k.
- Without this work, they are the least hardened part of "hardened abstractions".
- Drop this item if the pitch doesn't mention the editor.

**Progress (2026-10-21): mostly done, by the fuller route.**
- New Galaxy branch `workflow_editor_connection_helpers` (head `8380a8c1026`, off `release_26.2`,
  pushed, no PR or CI yet). It has three commits:
  1. It moves the test class's connection helpers onto `NavigatesGalaxy`:
     `workflow_editor_destroy_connection`, `assert_connected`, `assert_not_connected`,
     `assert_connection_invalid` and `assert_input_(not_)mapped`.
  2. It fixes Playwright's synthetic drag. `dragenter` now fires a task after `dragstart`, so the
     editor's refusal reason exists when the tooltip decides whether to open.
  3. It adds `workflow_editor_try_connect` (returns the refusal reason, or None on success) and
     `workflow_editor_remove_node`. It also adds the E2E test
     `test_refused_connection_and_removed_step`: refuse with a reason, connect, disconnect,
     reconnect, remove a step, save, then check the saved connections through the API. The test
     passes on both backends, and it fails without commit 2 or 3.
- `galaxy_ui_driver` is restacked on that branch (tip `fddc4bda08a`). `workflow-connect`,
  `-disconnect` and `-remove-step` now call those helpers when the step's `node-label` is unique.
  Otherwise they fall back to their id-based code, because unlabelled steps of one tool share a
  label.
- What's left:
  - `workflow-steps`, `-step` and `-output` still use raw `ctx.page` locators.
  - Step selection (`_resolve_step`, `_select_step`, `_set_step_label`) is still gxui-only.
  - The duplicate-label fallback (`_drag_connection`, with its mouse moves) is still in gxui.
  - `workflow-add-tool` (item 4) still doesn't call its method.
  - No `navigation.yml` entries were added; the existing `node._(label=)` scoping was enough.
- `NavigatesGalaxy` already has `EditorNodeReference = int | str`, which takes an order index or a
  label, and `workflow_editor_ensure_tool_form_open` / `set_node_label` / `set_node_annotation`
  accept it. Widening the new helpers to `EditorNodeReference` would remove gxui's fallback paths.

**Progress, later on 2026-10-21:** branch `jmchilton/galaxy_ui_driver_editor_refs`, `df78f64ec31`,
not yet folded into `galaxy_ui_driver`.
- The helpers now take step numbers: the node selector `_` also resolves from `id`.
- `workflow-connect`, `-disconnect` and `-remove-step` run one path, through the helpers.
  `_drag_connection` and its mouse moves are gone.
- Step selection, labels and annotations use the existing inspector helpers. `workflow-step` now
  backs onto `workflow_editor_ensure_tool_form_open`.
- Still left: `workflow-steps` and `-output` (read-only, and inspector work that already uses
  components), `_resolve_step`, and `_bring_into_view`/`_untangle` (canvas panning, gxui-only).

## 6. Publish the evidence and the skill (S)

A/B data and the harness live only in the vault. The skill is only on `jmchilton/galaxy-skills`
`gxui`: there is no upstream PR, and the last commit was 2026-10-09.

**Work:**
- Publish the per-run `metrics.json` and `verify.json`, plus `galaxy_ui_loop/`, somewhere
  linkable, such as a gist or a repo.
- Open the skill PR, or link the branch.
- Re-check the skill against the current verbs.

**Strengthens:** the "The skill" section and the table become verifiable rather than asserted.
The skill says "Each verb is a method from Galaxy's ... test framework"; soften that to match
gxui's adapters.

## 7. Documentation gaps, in `packages/selenium/README.rst` (S)

- A "why" paragraph.
- A verb table generated from `REGISTRY` (62 verbs: 53 adapters and 9 method verbs), with a drift
  test.
- Prose on the `component`/`components`/`call`/`methods` layers, when to use which.
- What the transcript records and what `gap` is for.
- A contributor note: `method_verb` (no code) versus `@verb` (an adapter); the docstring is the
  help.

**Strengthens:** the pitch can link the docs and cut its `<details>`. "Useful abstractions"
becomes browsable without installing anything.

## 8. Transcript summary (S)

**Work:** `gxui transcript --summary`: counts per layer, top `call` methods and `component` paths
(the promotion candidates), and gap reasons.

**Strengthens:** "every run leaves a list of what it lacked" becomes a command whose output the
pitch can show. Its output across the item 1 runs is the gap table for the pitch.

## Dropped from the previous plan

- Restacking for #24317.
- Problem-section accuracy fixes.
- Lifting editor verbs for the shared-layer argument.

The pitch no longer argues that the abstractions break outside tests.
