Run via Claude Opus 5.5 at default effort.

# Test challenges: interactive and CWL exclusions, and the move to identifier_single_unsanitized

This round only challenged the tests the revision added or changed:
- `2a3abbc52d1` (interactive and CWL tools left out)
- `2aa6116bf77` (red case moved to `identifier_single_unsanitized`)
- the `review_exclusion` / `built_tool_type` tests of the shared commit `d598fb16089`, which only get recommendations below.

The challenge started on head `2aa6116bf77`. The changes are uncommitted in the worktree, for the coordinator. The earlier challenges are in `earlier_drafts/5/`.

**Changed:**
- `test_static_findings_refusal.py`:
  - `test_interactive_tools_are_not_refused` now passes the refusing review as `kept`.
  - `test_tools_that_only_look_interactive_are_refused` and `test_tools_a_type_element_builds_as_ordinary_tools_are_refused` are folded into one parametrized test, `test_tools_galaxy_builds_as_ordinary_tools_are_refused`.
  - The comment on `test_the_unsafe_test_tool_is_refused` is reworded.
- `test_populate_store.py`:
  - `_tool_xml` takes a `tool_type`.
  - `TestStaticReview._setup` takes `interactive=True`, which replaces the test's string surgery on the tool XML and the tool conf.

No tests were added or dropped. No implementation file changed.

**Not changed:**
- `test_cwl_tools_are_not_refused`
- the populator test's assertions
- the mechanical renames in `2aa6116bf77`: `test_patch_review.py`, `test_tool_patches.py`, and the integration tests' tool id, fixture and helper rename (`_run_identifier_single` to `_run_tool`)

The in-scope unit tests all pass: 340 tests across these files:
- `test_static_findings_refusal.py`
- `test_security_refusal.py`
- `test_populate_store.py`
- `test_patch_review.py`
- `test_tool_patches.py`

ruff, black and isort are clean on both changed files. The mypy errors in them are the files' existing untyped-def errors. No integration or API tests were run.

A private note was written about one aspect of the exclusion's design. Nothing about it is recorded here.

## Branch tests (acted on)

### `test_interactive_tools_are_not_refused`: the kept review is passed

`CachedToolBox` calls `with_static_review(..., kept=entry.static_review)`. The test only exercised `kept=None`, so swapping the `kept` branch ahead of the exclusion branch passed every test. A store built before this revision, at the same `VERSION` (a dev install), would then keep refusing the jobs of an interactive tool.

The test already builds the refusing review to show the tool is not trivially clean. Now it passes that review as `kept` too.
- **Mutation:** with the `kept` branch moved first in `with_static_review`, both cases (XML and YAML) fail at that assertion.
- **Against `HEAD~2`'s `static_findings.py`:** both fail at the same assertion. That is the test's own assertion, not the changed signature.

### The lookalike and `<type>` element tests: folded into `test_tools_galaxy_builds_as_ordinary_tools_are_refused`

These two were the same test with a different XML edit and a different half of the `static_review_is_current` check. They are now one parametrization (`lookalike`, `type_element`), and each case asserts both halves: its review is current, and None is not.

These are negative controls on a relaxation, so both pass against `HEAD~2`'s behavior (they fail there only on the new `static_review_is_current` signature). That is intended: an exclusion that grows too broad is the failure that matters. The `type_element` case also kills a plausible wrong implementation. With `with_static_review` reading `tool_source.parse_tool_type()` instead of `built_tool_type()`, it fails at `review is not None`. The `lookalike` case pins the commit message's "entry points alone do not make it one". At the predicate layer it costs one parametrization id here, and the shared tests do not pin it (see the recommendations below).

### `test_the_unsafe_test_tool_is_refused`: kept, comment reworded

This is a fixture canary. The integration test asserts that the refused job's `misc_info` starts with `... shell-injection, and this Galaxy server`. That holds only if `shell-injection` is the tool's one rule at high, which is why the exact `== ["shell-injection"]` is justified. `test_patch_review.py` pins that the tool has `shell-injection` at high, but not that it is refused through `with_static_review` with nothing else. The old comment ("whatever happens to identifier_single") referred to a sibling branch's cleanup and would mean nothing after the merge. It now says what the test guards.

### `test_interactive_tools_are_not_reviewed_and_stay_unchanged` (populator): helpers instead of string surgery

The test used to do two things by hand:
- replace `<tool ` in `_tool_xml` output with `<tool tool_type="interactive" `
- replace `</toolbox>` in the conf `_setup` had written

Now `_tool_xml(..., tool_type=...)` writes the attribute, and `_setup(tmp_path, interactive=True)` adds the tool and its conf entry. The assertions are the same. With the populator's fast path mutated to pass `None` instead of `old_entry.tool_type`, the test fails at its own assertion (`3 == 4` unchanged). Against `HEAD~2`, it fails at the `static_review is None` assertion.

### Not acted on

- **`test_cwl_tools_are_not_refused`:** fine. It fails without the change at `static_review is None`, and its first assertion shows the CWL tool would be refused. It has no log assertion, because the log wiring is pinned by the interactive and own-tools tests, and the CWL reason string by the shared tests.
- **The populator's declared-vs-built disagreement** (`tool_type="interactive"` with `<type class="Tool">`): no populator test. In this case the fast path always reparses. That is safe by construction, because a kept entry can only carry the review `with_static_review` gave it. A test would pin a performance cost, not a safety property.
- **Integration coverage for interactive tools:** none added. Running one needs `interactivetools_enable` and an entry point setup. The unit path (`with_static_review` gives `None`, so `check_static_findings` returns early) covers the decision.
- **The `_built` / `_exclusion` helpers' annotated-variable return:** kept. It satisfies `warn_return_any` across the `galaxy.tools` import.
- **No E2E tests:** the feature has no UI.

## Recommendations for the shared commit

These are for `test/unit/app/tools/test_security_refusal.py` and `lib/galaxy/tools/security_refusal.py`, which this challenge did not edit.

1. **Pin the lookalike at the predicate.** `built_tool_type` is where "entry points alone do not make a tool interactive" holds, but no shared test has a tool with `<entry_points>` and no `tool_type`. Add a case to `test_review_exclusion_follows_the_class_galaxy_builds` or `test_review_exclusion`, for example `TYPED_TOOL` without the `<type>` element plus an `<entry_points>` block, that expects `None`. The branch test could then drop its `lookalike` id if you want it lean.
2. **Fold the patched assertions into one test.**
   - `test_patched_own_tools_are_reviewed` and the last line of `test_galaxy_interactive_tools_are_excluded` both pin what `patched` does: it lifts the own-tool exclusion but not the type exclusion.
   - A single `test_a_patch_lifts_only_the_own_tool_exclusion` would read better: upload1 patched gives `None`, an interactive type patched still gives `"it is an interactive tool"`, plus `review_exclusion(None, None) is None`.
   - `review_exclusion(GALAXY_UPLOAD_TOOL, None) == GALAXY_OWN_TOOL` repeats the `upload.xml` case of `test_review_exclusion` and can go.
3. **Docstring nit.** `built_tool_type` says "a user-defined tool's class wins over a declared `tool_type`". A `class: GalaxyUserTool` source cannot declare `tool_type`: `YamlToolSource` raises `UntrustedToolSourceError` ("User-defined tools may not set tool_type"). Reword that clause to say a user-defined tool builds as `UserDefinedTool` (`user_defined`), or drop it. It needs no test.
4. **Nothing to split.** The shared tests fail without the shared change because the API is new, so no "Baseline tests" split applies unless the shared commit becomes its own PR.
