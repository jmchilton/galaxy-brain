# Scope evaluation: selenium_tool_form_helpers

**Recommendation: expand modestly.** Add two pieces to the branch. First, cherry-pick `f19d8ec90f8` ("Let tool_form_fill map a data field over a collection hid"). The upstreaming plan already assigns it to this branch, and it applies cleanly to head `9e4a42c6388`. Second, fix repeat counting for repeats inside a conditional or section, and for nested repeats. That bug is in code the branch already rewrote (`repeat_instance_counts` and `_add_repeat_instances`). Nothing should come out of the branch. Every theme in it matches plan rows 6a, 6a′, 6b, 6c, 7a, 7e and 7f, and the gxui-only follow-ons belong with gxui.

Evaluated at head `9e4a42c6388` (`index.md` still says `148ec120d51`). Diff vs `origin/dev`: 9 files, +680/−192. About 46 of the added lines are an HTML fixture.

## Possible Decompositions

The branch is about 630 lines of non-generated code. The commits below are in landing order. Several pieces are entangled:
- `5d193098daa` reorders a fill inside 6b's `test_tool_form_parameters_match_form`.
- `949d1d4f18c` carries the 7a test and the 6c test together.
- `9e4a42c6388` moves `repeat_instance_counts` (fill code) along with the build-model parsing.

Any split has to break these commits apart.

**Option A: three PRs.**
1. **`select_set_value` exact match (7f).** `739e327a7f9`, with `test_select_set_value.py` and the `multiselect.html` fixture. This is the only piece with no dependencies. `select_set_value` is a shared helper: `tool_set_value` calls it, and so do the rule builder, upload, quotas and the workflow editor.
2. **Fill helpers on `NavigatesGalaxy`.**
   - Commits: the move (`4e0ff77dcb3`), collections (`1e65e508a3c`), hid selection (`49ab335afd1`), 6a′ (`0e53077612f`), 7a (`af8b828a033`), 7e (`a4abeb0d511`), the Playwright deferral (`5d193098daa`), the repeat E2E (`4aec94b9d0b`) and the waits (`48ea9865308`).
   - Plus the 7a half of `949d1d4f18c`, and the `repeat_instance_counts` half of `9e4a42c6388`.
   - `5d193098daa`'s test reorder would need another home, because it reorders 6b's test.
3. **`tool_form_parameters`.** 6b (`c02d13c3d1b`), 6c (`c39182618ea`), the 6c half of `949d1d4f18c`, drill-down and pinned data (`3e74adc7e08`), and the rest of `9e4a42c6388`. Lands after 2.

**Option B: two PRs.** PR 1 is the same as in A. PR 2 is everything else, as the branch has it now. The only split is lifting out 7f.

**Option C: two PRs, the move first.**
1. The move with no behavior change, `4e0ff77dcb3`. It is +186/−190 and reads as a verbatim lift.
2. Everything else.

This puts the one large, low-risk diff where it can be reviewed on its own.

## Scopes considered

### 1. As implemented

The tool-form filler moves into `NavigatesGalaxy` (6a) with fixes for deferral (6a′, plus the Playwright `except`), editor steps (7a), repeat counting (7e) and exact select options (7f). It adds `tool_form_parameters` for a tool's or a job's form (6b, 6c), with a browserless `galaxy.selenium.tool_form` module.

| Pros | Cons |
|---|---|
| <ul><li>Matches the plan's row for this branch exactly.</li><li>Every fix has a red→green E2E or unit test.</li><li>Fixes two dev bugs in the harness (the `-` lookup, and the Selenium-only `except`).</li></ul> | <ul><li>Leaves out `f19d8ec90f8`, which the plan assigns here. Without it, a collection hid in a dataset field is a silent no-op.</li><li>Leaves a dev bug in the repeat counting it rewrote (see scope 3).</li></ul> |

### 2. Expand: fold in `f19d8ec90f8` (collection hid map-over, assert selection) — recommended

`tool_form_fill(data={...: hid})` switches a dataset field to collection (map-over) mode when the hid is a collection. It then asserts that the field shows the hid, instead of silently keeping the old selection. The change is +34 lines, including the E2E test `test_tool_form_fill_maps_over_collection`, which is red without the fix.

| Pros | Cons |
|---|---|
| <ul><li>The upstreaming plan says outright: "goes with `selenium_tool_form_helpers`".</li><li>Fixes a real silent-failure bug in the hid selection this branch adds (`49ab335afd1`).</li><li>`git apply --check` is clean on `9e4a42c6388`. Every helper it uses is on this base: `tool_form_wait_for_batch_info`, `parameter_data_input_collection` and `history_contents`. `history_contents()` hits `/contents`, which lists collections too.</li><li>The new selection assert is a general guard. It would also have caught the int-hid substring case the thermo review suspected.</li></ul> | <ul><li>Adds one more history API call per fill that has int data.</li><li>On restack, gxui must drop the commit. The same is already true for the rest of this branch.</li><li>The new E2E needs to be run on this base under both backends.</li></ul> |

### 3. Expand: count repeats by full path, including repeats in a conditional or section and nested repeats — recommended

`REPEAT_PATH` (`^(.+?)_(\d+)\|`) parses `select_data|rep_level_0|countsFile` as the repeat `select_data|rep_level`. But `repeat_insert_named` matches `data-repeat-name`, which is `props.input.name` (`rep_level`, from `FormRepeat.vue:174`). So `insert.wait_for_visible()` times out for any repeat inside a conditional or section. For `outer_0|inner_2|x`, only `outer` is counted. The fix is a `data-repeat-path` attribute (`FormRepeat` already has `prefix`), a navigation target, and counting at every level.

| Pros | Cons |
|---|---|
| <ul><li>A related bug in code the branch already rewrote (7e, `9e4a42c6388`). It was inherited from dev, which used the same regex and selector.</li><li>Real test tools have this shape: `async_conditional_no_default_nested_data`, and `export_remote` (conditional > repeat).</li><li>gxui's `_first_instance` already handles repeats at any depth on the consumer side. This brings the Galaxy helper up to that level.</li><li>The pure function stays unit-testable. `repeat_instance_counts` is the obvious place for it.</li></ul> | <ul><li>Found by reasoning, not by running it. A red E2E (fill `select_data|rep_level_1|countsFile`) needs writing first.</li><li>Touches the client: one `data-` attribute on `FormRepeat.vue`, plus a `navigation.yml` target.</li><li>No test tool has a repeat nested in a repeat, so that half of the fix would have only a unit test.</li></ul> |

<details>
<summary>Evidence</summary>

- `repeat_instance_counts(["sec|queries_0|x", "outer_0|inner_2|x", "cond|queries_1|input"])` returns `{'sec|queries': 1, 'outer': 1, 'cond|queries': 2}` at head.
- dev's `framework.py:998-1001` calls `repeat_insert_named(name=repeat_name)` with the same parsed name, so the bug was inherited, not introduced.
- `repeat_instance_parameter` (`form-element-${name}_${index}|`) is matched against the id, which keeps the full path. Only the insert lookup is wrong.
- The thermo review listed nested repeats as "unchanged from dev" and didn't act on them. The problem is wider than nesting: it covers any repeat that isn't at the top level.

</details>

### 4. Expand further: lift gxui's path handling into `tool_form_fill` (one dict in, typed by the build model) — not recommended

gxui's `tool-fill` validates paths against `tool_form_parameters`, normalizes `components_2|x` to the described first instance, and routes data fields by build-model type. Moving that into Galaxy would give one `tool_form_fill(values)` that raises on unknown paths.

| Pros | Cons |
|---|---|
| <ul><li>A reusable abstraction: `tool_form_parameters` and `tool_form_fill` would finally share one model.</li><li>Unknown paths would fail loudly instead of being skipped.</li></ul> | <ul><li>The plan says that commits only gxui motivates go up with gxui.</li><li>The dev harness relies on silently skipping inactive-conditional inputs, so strict mode would need an opt-in.</li><li>Changes the API this branch is still introducing. Better as a follow-up after review feedback on the API.</li></ul> |

### 5. Expand: editor-step values in `tool_form_parameters` — not recommended

In the editor, `tool_form_parameters` reports the tool's defaults, not the step's values. gxui patches the values from the inspector DOM (`_inspector_fields`). A Galaxy-side fix would read the step's `tool_state` from the workflow API.

| Pros | Cons |
|---|---|
| <ul><li>It would make 7a symmetric: fill and describe would both work on editor steps.</li></ul> | <ul><li>New surface area (workflow API and step identity) with only a gxui consumer.</li><li>Unsaved editor state isn't in the API, so the DOM read would still be needed.</li></ul> |

### 6. Contract: lift 7f (`select_set_value` exact match) into its own PR

`739e327a7f9` changes a shared dev helper. Its callers include `tool_set_value`, the rule builder, upload, quotas and the workflow editor. It is tested by a browser unit test against a static fixture, because the test challenge found no reliable E2E home for it.

| Pros | Cons |
|---|---|
| <ul><li>Independent, small (+93), and easy to review alone.</li><li>Its reach goes well beyond the tool form, so it can be reviewed on its own merits.</li></ul> | <ul><li>Another PR and branch record to carry for a fix of about 10 lines.</li><li>The plan already grouped it here, and gxui hit it through tool and upload fills alike.</li></ul> |

### 7. Contract: drop `tool_form_parameters` (6b, 6c, drill-down/pinned, the `tool_form` module)

Ship only the filler work. The describe API would move to a later PR or go up with gxui.

| Pros | Cons |
|---|---|
| <ul><li>Roughly halves the new code, since `tool_form.py` and its unit tests are about 300 lines.</li><li>The only consumer outside its own tests is gxui.</li></ul> | <ul><li>`test_tool_form_parameters_match_form` is the E2E that proves 6a′ under Playwright, so it would need a new home.</li><li>The plan groups 6b and 6c here. The rerun form also gives a non-gxui test motivation (6c red→green).</li><li>gxui would carry roughly 300 lines of Galaxy code in its final PR.</li></ul> |

### 8. Contract: drop the collections behavior change (`1e65e508a3c`)

The test harness would keep dev's collection path (no multi handling) instead of selecting collections like datasets.

| Pros | Cons |
|---|---|
| <ul><li>The move becomes a pure refactor for harness users.</li></ul> | <ul><li>`4e0ff77dcb3` had to add a temporary `collections` argument to keep dev's path. Keeping that would leave an awkward API.</li><li>The change only matters for a collection given to a `data_multiple` parameter. The baseline refactor already isolated it into its own commit for review.</li></ul> |

### Thermo review items not acted on (scope-neutral)

The thermo review declined these on design grounds. None of them changes scope, and I agree with leaving them:
- a mixin for the DOM fill code
- splitting `tool_form_parameters(tool_id|job_id)`
- collapsing the `data` and `collections` dicts (superseded by `1e65e508a3c`)
- the `_detect_param_type` string dispatch
- silently skipping deferred parameters (dev behavior that the harness needs)

Nested repeats were the one item that does affect scope; scope 3 covers them.
