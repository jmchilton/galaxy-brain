No further refactoring of the base branch was performed in this pass. The branch keeps the two refactor commits from the first pass (re-applied unchanged during the re-scope) ahead of the fixes. The re-scope commits contain no behavior-neutral change that can move before the fixes. The tip is unchanged: `58f9664c617`, so `git diff 58f9664c617 HEAD` is empty.

## Branch structure (`6df388987b4..yaml_boolean_defaults`, base `origin/release_26.1`)

```
58f9664c617 Drop conditional __current_case__ from legacy user tool inputs     (fix)
f88b9c28691 Apply YAML Boolean policy to sections in strictify                 (fix)
6029ff27032 Load canonical repeat and section inputs in YAML tools             (fix)
cdebfcb580d Keep explicit null Boolean default for YAML tools in request execution (fix)
1e2386509f6 YAML tools default omitted optional and Boolean value to False     (fix)
f3178c7f971 Honor YAML boolean values when loading tools                       (fix)
087336e8249 Add YAML tool source predicate and child source factory methods    (refactor)
8541fd2a3b3 Add InputSource hooks for Boolean default and text optionality      (refactor)
2b351605ed4 Baseline tests for user tool authoring contracts                   (tests only)
923173b9e3e Send use_cached_job only when requested in DescribeToolExecution   (test helper)
eaea0064b80 Function-scope API test interactor fixtures                        (test fixture)
```

- The first three commits touch only test infrastructure, test data, and docs. The Baseline tests commit pins current behavior: the legacy `checked` key is rejected, and canonical repeat/section definitions fail API parsing (strict xfail).
- The two refactor commits have the same `git patch-id` as their first-pass versions (`b7a8838e3ff`, `52974cbc957`). Their content and their equivalence argument are unchanged; see `earlier_drafts/1/baseline_refactor.md`.

## Candidates considered in the re-scope commits

- **`strictify(..., yaml_origin=False)` (`f88b9c28691`).** Not extracted. The parameter only matters because `_fill_defaults` takes `yaml_origin`, and that threading is added by the fix `cdebfcb580d`. Below the fixes it would be an unused parameter, the same reason the first pass gave for not extracting the `fill_static_defaults` threading. Above `cdebfcb580d` it is the behavior change itself, since sections then follow the YAML policy.
- **`CanonicalYamlInputSource.parse_input_type` / `parse_nested_inputs_source` (`6029ff27032`).** Not extracted. The canonical classes first appear in fix `1e2386509f6`, and these overrides change how YAML tools load: sections are recognized, and nested `parameters` are read instead of `blocks`.
- **Repeat `min`/`max` null handling in `Tool.parse_input_elem` (`6029ff27032`).** Not extracted. At base, an explicit `min: null` or `max: null` in YAML raises `TypeError` from `int(None)` or `float(None)`; afterward it loads with the defaults. That turns an error into a success, so it is a behavior change. XML is unaffected because attributes are never None.
- **The `remap` visitor that drops `__index__` / `__current_case__` (`6029ff27032`, `58f9664c617`).** Not extracted. It changes the `$(inputs)` that legacy and 21.01 user tool jobs render.
- **Moving the test fixtures (`gx_user_repeat.yml` and `gx_user_section.yml` to `test/functional/tools/parameters/`, plus the `sample_tool_conf.xml` entries).** Not moved into the Baseline tests commit. The YAML content also changes (repeat `min: 1` and a `flag` input), and at base the toolbox cannot load canonical repeat/section YAML. Registering those files earlier would put tools that fail to load into the baseline toolbox.

## Verification (fresh this pass)

- **Contract API module at `2b351605ed4`** (Baseline tests on base production code): 1 passed, 4 xfailed.
- **Contract API module at `087336e8249`** (after the refactors): 1 passed, 4 xfailed. Identical to the baseline.
- No new commits were created, so the unit-test and lint results recorded for the unchanged refactor patches in `earlier_drafts/1/baseline_refactor.md` still apply.
