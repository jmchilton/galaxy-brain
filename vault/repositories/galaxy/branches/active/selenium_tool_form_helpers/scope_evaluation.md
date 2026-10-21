# Scope evaluation: selenium_tool_form_helpers (second evaluation)

**Recommendation: keep scope.** The branch is one "tool form" theme (fill + describe), and the re-scope already absorbed the related bugs in its touched code; the Codex redesign closed the three known limits the re-scope left. No further expansion clears the bar. The one real judgment call is 7f (`3d4b88bd711`, `select_set_value` exact-option click). Keep it: it's ~10 lines on the select path `tool_form_fill` itself uses (`tool_set_value` -> `select_set_value`), it brings the typed branch of `select_set_value` to the exact-equality semantics its untyped branch already has, and it costs nothing on ranked clients. The strongest alternative is moving 7f to gxui on the 7i precedent (contraction, scope C1). That is cheap for John to do at PR time if he prefers it. Stacked PRs aren't forced by the upstreaming plan; the options are laid out below for John.

Evaluated at head `798bae4b33f` (22 commits on `origin/dev`). Diff: 15 files, +1078/−204. Library code is about +463/−204 (`tool_form_filler.py` 261, `tool_form.py` 103, `navigates_galaxy.py` +57/−13, `navigation.yml` +20, `has_driver.py` +11, `framework.py` −190). Tests are about +430 Python plus 183 lines of hand-written HTML fixtures. `index.md` is stale (head `148ec120d51`, no map-over, nested repeats, sections or filler module), and so is the plan's row ("29/29"). Neither was edited here.

**Older-client rule used throughout.** `galaxy.selenium` may carry a cheap hardening for released clients on a code path this branch is about, when it changes nothing on dev's client. Examples are 7f, and `_button_is_pressed` accepting 25.x's `BButton.active`. Full parity with older clients is gxui's job. That covers the `data-repeat-name` insert target (26.1+ only, and already that way on dev) and 7i-style search workarounds.

## Possible Decompositions

This is over 1000 lines, so here are several options. SHAs are current; draft 1's SHAs are stale. Entanglements any split has to break:
- `3d4b88bd711` (7f) creates `test/unit/selenium/conftest.py` / `FixturePage`. The later fixture tests (`300bf135e28`, `63dcbba1efb`, `2d9259be09f`) depend on it.
- `dbe393d7fb9` bundles the 7a editor-step E2E and the 6c rerun E2E.
- `7ff315909c9` (the Playwright deferral) reorders 6b's `test_tool_form_parameters_match_form`. That describe test is also the only Playwright proof of the 6a′ deferral (`f7280d4125c`).
- `repeat_instance_candidates` lives in `tool_form.py`, the describe module, but `tool_form_filler.py` imports it. A fill-first split has to start `tool_form.py` in the fill PR, or move that function.
- The describe E2E (`5559936b03a`) fills the form with `tool_form_fill`, so describe can't land before the move.
- History supersedes itself: the repeat logic goes through `c304175271d` -> `300bf135e28` -> `2d9259be09f` (redesign) -> `798bae4b33f`. A split rebuilds commits from the final tree; it can't cherry-pick them.

Stacking doesn't help gxui. Its base is `release_26.2`, and the plan keeps a dev-only merge's commits on gxui until the final rebase onto dev. A split only helps review size, and it costs a branch record and two-backend E2E runs per piece.

**Option A: lift 7f, two PRs.**
1. 7f: `3d4b88bd711` with `conftest.py`, `multiselect.html` and `test_select_set_value.py`. No other dependencies.
2. Everything else, stacked on 1 (or `FixturePage` copied in).

**Option B: refactor first, two PRs.**
1. A behavior-free move: `4e0ff77dcb3` + `e360aa8596e`. Optionally go straight into `tool_form_filler.py` instead of `NavigatesGalaxy`. That would rebuild `2b32dabfdff` early, and it's possible once the stubbed unit tests (deleted by `b7aaad7696a`) are never written.
2. All behavior changes.

**Option C: three PRs by theme.**
1. **Move plus the small fill fixes.** `4e0ff77dcb3`, `e360aa8596e`, `2680513b341` (collections), `475ccd12946` (hid) and `f7280d4125c` (6a′). It needs a Playwright test for the deferral that isn't the describe test.
2. **Describe API.** `5559936b03a` (6b), `d88e5b875e3` (6c), the 6c half of `dbe393d7fb9`, `7ff315909c9`, `8ad4abe50be` (drill-down/pinned) and `464388ae903` (`tool_form` module).
3. **Fill structure.** `5ea36d06f52` (7a) plus the 7a half of `dbe393d7fb9`. Then the repeat work (`c304175271d`, `b7aaad7696a`, `281ada62ed9`, `300bf135e28`), `2b32dabfdff` (filler module), `ba3fae3f91f` (map-over), `63dcbba1efb` (sections), `2d9259be09f` and `798bae4b33f`. 7f rides here or in its own PR (Option A).

**Option D: one PR, history compacted.** Same scope, with the 22 commits squashed to about 7 thematic ones: move + has_driver; collections + hid + deferral; describe + rerun + drill-down + `tool_form`; editor step; repeats/sections/redesign + filler module; map-over; 7f. That removes the superseded intermediate repeat code reviewers would otherwise read. It also drops the per-step red→green history that `baseline_refactor.md` kept on purpose.

## Scopes considered

### 1. As implemented — recommended

`tool_form_fill` / `tool_form_set_parameter` move off `RunsToolTests` into a composed `ToolFormFiller` behind `NavigatesGalaxy`. They gain deferral, hid, map-over, editor-step, repeats at any depth, collapsed-section and conditional-case handling. `tool_form_parameters` describes a tool's or a job's form from the build model, and 7f makes `select_set_value` click the exact option.

| Pros | Cons |
|---|---|
| <ul><li>One theme: everything hangs off `tool_form_fill` / `tool_form_parameters`, which gxui's `verbs.py` calls as the public API.</li><li>The related bugs in touched code are fixed: the first evaluation's two expansions, plus Codex's four findings, which closed every known limit from the re-scope.</li><li>Each fix has a red→green E2E or a real-markup fixture test. Most E2Es are green on both backends.</li><li>The thermo extraction keeps `navigates_galaxy.py` growth at +44, and `framework.py` shrinks by about 180.</li></ul> | <ul><li>Large for a test-library PR (about +1078), with self-superseding history (see Decompositions).</li><li>7f has no in-tree E2E motivation (scope C1).</li><li>Nested-repeat and repeat-in-section shapes are covered only by browser fixtures.</li></ul> |

### E1. Expand: older-client insert fallback (no `data-repeat-name` before 26.1) — not recommended

Find the insert button without `data-repeat-name`, so repeats fill on 25.x/26.0 clients.

| Pros | Cons |
|---|---|
| <ul><li>gxui drives released servers, so it would hit this.</li></ul> | <ul><li>dev already has the same limit (`repeat_insert_named`), so it isn't a regression.</li><li>Full parity with older clients is gxui's job under the rule above.</li><li>Galaxy's own suite can't test it.</li></ul> |

### E2. Expand: strict path handling (gxui's validation of unknown paths and normalization of instances) — not recommended

`tool_form_fill` would check paths against `tool_form_parameters` and raise on unknown ones.

| Pros | Cons |
|---|---|
| <ul><li>Fill and describe would share one model, and typos would fail loudly.</li></ul> | <ul><li>The harness relies on silently skipping inactive-case inputs, so this needs an opt-in mode.</li><li>It changes an API that hasn't been reviewed yet.</li><li>The plan sends gxui-only motivation up with gxui.</li></ul> |

### E3. Expand: editor-step values in `tool_form_parameters` — not recommended

Report a step's `tool_state` instead of the tool's defaults when the form is in the editor.

| Pros | Cons |
|---|---|
| <ul><li>Fill and describe would both cover editor steps.</li></ul> | <ul><li>New surface (workflow API, step identity) with only a gxui consumer.</li><li>Unsaved editor state isn't in the API.</li></ul> |

### E4. Expand: defer data parameters, too (Codex note) — not recommended

Data fields would join the deferral and retry pass instead of being set after every value.

| Pros | Cons |
|---|---|
| <ul><li>One deferral rule for all fields.</li></ul> | <ul><li>Data fields are set after every value, so their conditionals are already switched. No failing case exists.</li><li>It changes behavior, not structure.</li></ul> |

### E5. Expand: an E2E test tool with repeat-in-repeat / repeat-in-section — not recommended

Add a functional test tool, so the nested shapes get E2E coverage instead of fixture-only coverage.

| Pros | Cons |
|---|---|
| <ul><li>Fits the plan's preference for E2E coverage.</li></ul> | <ul><li>The fixture now mirrors real FormRepeat/FormCard markup (Codex rewrite) and is red→green on both backends.</li><li>A new tool in the shared tool conf can ripple into panel and tool-count tests.</li><li>The test challenge already weighed this.</li></ul> |

### C1. Contract: move 7f (`3d4b88bd711`) to gxui (plan step 4) — strongest alternative, not recommended

Drop 7f here, so it rides with gxui, like 7i ("only works around test.galaxyproject.org's older client").

| Pros | Cons |
|---|---|
| <ul><li>Dev and 26.2 already rank exact matches first. `b10ff38b833` (`SingleItemSelector`) and `817612475e2` (shared filter/`FormSelect`) are on `release_26.1`, `26.2` and dev, but in no upstream tag yet (latest is `v26.1.1`, checked with `ls-remote`), and not on `release_26.0`.</li><li>The test challenge couldn't make any in-tree E2E go red, so its only motivation is driving released servers. That is gxui's motivation under the plan's "non-gxui motivation" rule.</li><li>It follows the 7i precedent.</li></ul> | <ul><li>Unlike 7i, it's not a workaround that changes semantics. It makes the typed branch match the untyped branch's existing `elem_value == value` exact match, and it does nothing on ranked clients.</li><li>It's on this branch's own path (`tool_form_fill` -> `tool_set_value` -> `select_set_value`).</li><li>`galaxy-selenium` from dev is a published package that still meets 26.0 and 26.1.x clients, both supported.</li><li>Cost: `FixturePage` has to move into `300bf135e28`, and gxui keeps carrying a 10-line fix.</li><li>As the second evaluation, it would park the branch BLOCKED for a 10-line call.</li></ul> |

<details>
<summary>7f limits worth knowing either way</summary>

- It compares option *text* to the value. Where the harness passes option values that differ from labels, it falls back to Enter. So on unranked servers it only helps when the value equals the label (the `txt` case).
- On dev, ranking is case-insensitive, so a harness value like `do` lands on "Do" through Enter. 7f doesn't change that (`test_challenges_debrief.md`, out of scope).

</details>

### C2. Contract: 7f as its own PR (dev, or `release_26.0`) — not recommended

The same commit in its own branch. `release_26.0` lacks the ranking, so an E2E there might go red without 7f.

| Pros | Cons |
|---|---|
| <ul><li>It's independent, and it's the cleanest cut point (Option A).</li><li>On 26.0 it might have a real in-tree red→green.</li></ul> | <ul><li>The 26.0 red point is unverified. vue-multiselect sorts by label length, which may hide the bug, as `test_paste_content` showed.</li><li>One more branch record and PR for about 10 lines.</li></ul> |

### C3. Contract: drop the describe API (6b, 6c, drill-down/pinned, `tool_form.py`) — not recommended

Ship only the fill work; the describe API moves to a later PR or goes up with gxui.

| Pros | Cons |
|---|---|
| <ul><li>Removes about 300 lines, including tests.</li><li>Its only outside consumer is gxui.</li></ul> | <ul><li>`test_tool_form_parameters_match_form` is the Playwright proof of the deferral.</li><li>The filler imports `repeat_instance_candidates` from `tool_form.py`.</li><li>The plan groups 6b and 6c here, and 6c has a non-gxui red→green.</li></ul> |

### C4. Contract: revert to `selenium_tool_form_helpers_alt_original_scope` — not recommended

Go back to the first hardening's head `9e4a42c6388`, without map-over, nested repeats, the section fix or the Codex redesign.

| Pros | Cons |
|---|---|
| <ul><li>Smaller (+680/−192).</li></ul> | <ul><li>It brings back a silent no-op for collection hids, broken repeat insertion outside the top level, sections collapsing, and the four Codex bugs.</li></ul> |

### Debrief items not acted on (scope-neutral)

None of these change scope, and I agree with leaving them:
- Thermo: optional ids on `tool_form_parameters`, string dispatch in `_detect_param_type`, silently skipping deferred parameters that never appear (harness behavior), `_wait_on` reuse, `schema.ts` lacking targets (not generated or checked; dev already lacks most `tool_form` targets).
- Codex: `sustainRepeats` relying on the early return.
- Test challenge: the harness types option values, not labels.
