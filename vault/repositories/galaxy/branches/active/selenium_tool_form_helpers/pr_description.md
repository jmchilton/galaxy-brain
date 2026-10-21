Make Galaxy's tool-test form filler a public `NavigatesGalaxy` helper, fix the form shapes it filled wrong or not at all, and add `tool_form_parameters` to describe a form by the paths the filler takes.

***This is test infrastructure only. The one client change is `navigation.yml` selectors; no Galaxy UI behaves differently.***

On `dev` the only code that can fill an arbitrary tool form (repeats, sections, conditionals, every widget) is private to `RunsToolTests`, so E2E tests and scripts driving Galaxy can't use it. Moved out as-is, it also gets these shapes wrong:

| Form shape | `dev`'s filler | This PR |
| --- | --- | --- |
| Parameter a conditional reveals late | retried under `key.replace("\|", "-")`, an id no element has, so skipped silently 😬 | set ✅ |
| ...under Playwright | its timeout isn't a deferrable error, so the fill fails ❌ | set ✅ |
| Repeat with `min="1"` | clicks Insert once per instance the paths name, on top of the one `min` renders, leaving an extra instance 😬 | adds only missing instances ✅ |
| Repeat inside a conditional or section | waits for an insert button named after the whole path (`cond\|rep`), which no button carries, and times out ❌ | inserts at every level ✅ |
| Repeat inside another repeat | inserts only outer instances; inner values are skipped, inner data times out 😬 | inserts at every level ✅ |
| Form with sections already open | clicks every section header, closing open ones 😬 | expands only collapsed sections ✅ |
| Workflow editor step's form | waits for the Run button the step form doesn't have, times out ❌ | fills ✅ |
| Collection hid in a dataset field (map over) | not possible: data is picked by label only | switches to collection mode and checks the selection ✅ |

😬 fills the wrong form without failing; ❌ fails or times out.

```python
# From the new tests: a repeat inside a conditional, data picked by hid.
self.tool_open("async_conditional_no_default_nested_data")
self.tool_form_fill(
    data={
        "select_data|rep_level_0|countsFile": first["hid"],
        "select_data|rep_level_1|countsFile": second["hid"],
    }
)

# Describe a form, or a job's rerun form, as ToolFormParameter(path, label, type, value, options, condition).
parameters = self.tool_form_parameters("gx_conditional_select")
inttest = next(p for p in self.tool_form_parameters(job_id=job_id) if p.path == "inttest")
```

***The tool-test harness keeps using this filler: `RunsToolTests` now only turns a test definition into `tool_form_fill` arguments, so the tool-form harness suite covers the moved code.***

***It moves the filler and fixes it in one PR because the move makes it public API: shipping it as-is would publish these bugs. The `select_set_value` fix is on the filler's own select path.***

***It's about +1080/−200 lines, but library code is about +460/−200; the rest is tests and HTML fixtures. Ten commits, one per theme, so it can be read commit by commit. The move commit leaves `dev`'s behavior unchanged.***

<details><summary>What each commit does</summary>

1. **`select_set_value` baseline test**, red on `dev`: a fixture multiselect lists `metacyto_clr.txt` before `txt`, and setting `txt` picks the wrong one.
2. **`select_set_value` exact option.** Click the option equal to the value when one is listed. See below.
3. **Move** the filler from `RunsToolTests` onto `NavigatesGalaxy` unchanged, as `tool_form_fill` / `tool_form_set_parameter`. The Playwright timeout check becomes `has_driver.exception_indicates_playwright_timeout` so the filler can share it.
4. **Data and late parameters.** Select data by hid; select collections like datasets (one `data` argument); look deferred parameters up by their real path; defer on either backend's timeout.
5. **Describe.** `tool_form_parameters(tool_id)` flattens the build model the form renders from into `ToolFormParameter`s (path, label, type, value, options, and the conditional case that shows the field). `job_id=` describes a rerun form, including the datasets the rerun pins. Drill-down options are flattened. Parsing lives in `galaxy.selenium.tool_form` and needs no browser.
6. **Editor step.** Wait for the form header, not the Run button.
7. **Repeat counts.** Count rendered instances before inserting, so a `min` repeat doesn't gain an extra one.
8. **Module.** Move the fill code into `galaxy.selenium.tool_form_filler.ToolFormFiller`, a composed helper. `NavigatesGalaxy` keeps three thin public methods, so `navigates_galaxy.py` grows by about 45 lines.
9. **Map over** a dataset field with a collection hid.
10. **Repeats and sections at any depth.** Before setting each path, expand its collapsed sections and add its missing repeat instances, outer level first. A `name_N` segment counts as a repeat only if the page shows one there, so a conditional named `options_1` isn't misread. Same-named repeats in one scope raise instead of clicking a guess.

</details>

<details><summary>Why <code>select_set_value</code> changes</summary>

Typing a value and pressing Enter takes the first option the list shows. On selectors that don't rank exact matches first, that's the first option *containing* the value: setting extension `txt` picked `metacyto_clr.txt`. `dev`'s client ranks exact matches first, so nothing changes there and no in-tree E2E test goes red without it. Released 26.0 and 26.1 clients (through 26.1.1) don't rank, and `galaxy-selenium` drives those servers. The typed branch now matches the untyped branch, which already clicks the option whose text equals the value. A browser-fixture unit test is red without it on both backends.

</details>

<details><summary>Known limits</summary>

- Inserting a repeat needs `data-repeat-name`, which only 26.2+ clients render (none released yet). `dev`'s filler has the same limit.
- Data parameters are never deferred. They're set after every other value, so their conditionals are already switched.
- Forms with `sustainRepeats` rely on the field already being there.

</details>

## Risks

***`tool_form_fill`, `tool_form_set_parameter`, `tool_form_parameters` and `ToolFormParameter` become public API of the published `galaxy-selenium` package, so their shapes are harder to change once outside code calls them.***

<details><summary>Risk Details</summary>

- The three methods and `ToolFormParameter`'s fields are new public surface; the gxui driver already calls all three.
- `tool_form_parameters(tool_id=None, tool_version=None, job_id=None)` takes either id in one entry point instead of two methods.
- `RunsToolTests` keeps the same inputs, but its form filling is now this code, so a regression here shows up as tool-form harness failures.
- Repeat insertion still needs a 26.2+ client; on older ones it times out on the insert button.
- `navigation.yml` drops `repeat_insert_named` (on `release_26.2` and `dev` only, never released) for the new repeat targets.
- `select_set_value`'s change touches every caller of the typed path. It only clicks when an option's text equals the value exactly, and otherwise presses Enter as before.

</details>

<details><summary>Risk Review Advice</summary>

The API shape is the part that's hard to walk back: path strings like `cond|rep_0|x`, `data` taking a hid or a label, and `ToolFormParameter`'s fields. Worth a look is whether those are the names Galaxy wants to keep.

In the fill logic, look at `ToolFormFiller._prepare_parameter` and `_add_repeat_instances` (`tool_form_filler.py`): which `name_N` segments count as repeats, and where the insert button is looked up.

</details>

## Context

Part of 🌿 [`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), used to fill and describe tool forms when driving Galaxy from scripts. Alternative kept on 🌿 [`selenium_tool_form_helpers_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/selenium_tool_form_helpers_alt_original_scope) - without map-over or repeats below the top level.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep one tool-form theme (fill + describe); the <code>select_set_value</code> fix stays.</summary>

- A first evaluation widened scope to map-over and nested repeats and sections, the bugs in the code this moves. The second recommended keeping that scope.
- Moving the `select_set_value` fix to the gxui PR was the strongest alternative. It stays: it's on the filler's own select path and does nothing on `dev`'s client.
- Not taken: an insert fallback for pre-26.2 clients, strict validation of unknown paths, editor-step values in `tool_form_parameters`, deferring data parameters, and a new test tool for nested repeats.
- Splitting into stacked PRs was weighed. One PR with compacted history was chosen.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The ~170-line fill machinery moved out of <code>navigates_galaxy.py</code> into a composed <code>ToolFormFiller</code>.</summary>

- A mixin was rejected: it would need about a dozen abstract stubs. `ToolFormFiller(navigator)` follows `capture_clipboard`'s thin-method-over-helper pattern.
- The Playwright timeout check moved into `has_driver.py`, so `navigates_galaxy` still imports without playwright installed.
- The fill path's branching was untangled: one dispatch for hid vs label, the form-ready wait once per fill, and a stuck section raising instead of being deferred as a missing field.
- Kept: one `tool_form_parameters` entry point (callers splat the open form's ids into it), `_detect_param_type`'s string dispatch (moved verbatim), and skipping deferred fields that never appear (the harness relies on it).

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Stub-based unit tests replaced by E2E and real-markup fixture tests; two tests that never went red dropped.</summary>

- Unit tests that faked the form with `SimpleNamespace` stubs were replaced with E2E tests, or with browser-fixture tests through the public `tool_form_fill` (`FixturePage` in `test/unit/selenium/conftest.py`).
- No test tool has a repeat in a repeat or a repeat in a section, so those shapes are covered by fixtures that mirror real FormRepeat/FormCard markup. Each fixture test was run red before its fix and green after, on both backends.
- An E2E test for `select_set_value` couldn't go red on `dev`'s client, so it was dropped; the fixture test is the only layer that shows that fix.
- Dropped: a counting E2E test duplicated by the conditional repeat test, and a counting unit test that passed without the fix.

</details>

### ✅ Second Frontier Model Review

<details><summary>Four findings, all fixed by preparing each path just before it's set.</summary>

- A repeat inside a conditional case not selected yet timed out on its insert button.
- A section inside a newly added instance stayed collapsed.
- An outer instance holding only an empty inner repeat wasn't counted.
- A conditional or section named like `options_1` was read as a repeat instance.
- Each has a test that was red before the fix: two E2E (Playwright) and two fixture tests (both backends).

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>A leading red test and its fix, then a pure move of <code>dev</code>'s filler; each later fix is its own commit.</summary>

- The move commit keeps `dev`'s behavior, so later commits show each fix against it.
- The has_driver helper is part of the move, and the `ToolFormFiller` extraction is commit 8, so the map-over and nested-repeat fixes edit `tool_form_filler.py` directly.
- The history was then compacted from 22 commits to ten thematic ones, with the same final tree apart from a docstring clause and an assertion message. Unit tests that stubbed private methods, and were later replaced, no longer appear anywhere in the history.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? An error naming the path or hid. The exception is a `values` path the form never shows, which is skipped as the harness needs (the docstring says so).
  <details><summary>Messages</summary>

  - A data field that doesn't end up showing the hid: `"<path> shows [...], not hid N"`.
  - Two same-named repeats in one scope: `ValueError` naming the repeat path and how many buttons match.
  - Sections that never expand: `RuntimeError` after a capped number of clicks.
  - Waits name what they wait on ("collection mode for X", "tag removed from X").
  - A bad `data` path isn't deferred, so it surfaces as a wait timeout on that path.

  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. `test_tool_form_parameters.py` feeds real build-model shapes to a pure function, and the fill and select tests go through the public methods on fixtures that copy `FormRepeat`/`FormCard` markup.
- [x] Are baseline tests in their own leading commits (if applicable)? The `select_set_value` test leads, and it's the only one that can be red on `dev`.
  <details><summary>Why the rest aren't baselines</summary>

  The other tests call `tool_form_fill` or `tool_form_parameters` on `NavigatesGalaxy`, which `dev` doesn't have, so on `dev` they fail on the missing API. Each one sits in the commit with its fix. During development, the fixture tests and the Codex-finding E2E tests were each run red before their fix and green after. The other E2E red points were worked out from the code, not run.

  </details>
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? None in Galaxy. In test helpers, `select_set_value`'s typed path now clicks an exact-match option when one is listed.
- [x] Who hits this in practice and what is the evidence? E2E test authors and the gxui driver, whose `txt` → `metacyto_clr.txt` failure motivated the `select_set_value` change. The tool-form harness runs this code too, though none of its current cases is known to need a deferred parameter.
- [x] Were simpler or existing approaches considered? Yes. A mixin instead of the composed `ToolFormFiller`, adding every repeat up front instead of preparing each path, moving `select_set_value`'s fix to gxui, and stacked PRs (see Scope Evaluation).

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- New E2E tests in `test_tool_form.py` (8) and `test_workflow_editor.py` (1) pass under Playwright. The repeat, section, conditional, map-over and editor-step ones also pass under Selenium.
- Browser-fixture unit tests in `test/unit/selenium` (`test_tool_form_fill.py`, `test_select_set_value.py`) cover nested repeats, repeats in sections and exact option clicks on both backends. `test_tool_form_parameters.py` covers build-model parsing without a browser.
- The tool-form harness (`RunsToolTests`) runs in CI's "Tool form harness tests".

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
