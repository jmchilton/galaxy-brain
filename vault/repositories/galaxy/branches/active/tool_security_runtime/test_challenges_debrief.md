Run via Claude Opus 5.5 at default effort.

# Test challenges: tool_security_runtime (interactive and CWL exclusion revision)

Scope: only the tests this revision changed.
- HEAD `c04b2dc19b7`, "Leave interactive and CWL tools out of the job-preparation review": the two new tests in `test/unit/app/tools/test_security_review.py`.
- The shared base commit `d598fb16089`: the new `review_exclusion` / `built_tool_type` tests in `test/unit/app/tools/test_security_refusal.py`. I did not edit them, because the commit is shared byte-identically with a sibling branch. My recommendations for it are below.

The earlier tests were challenged in `earlier_drafts/3/test_challenges_debrief.md` and before.

My change is uncommitted in the worktree and touches only `test/unit/app/tools/test_security_review.py`. I made no implementation change.

Results:
- `test_security_review.py` and `test_security_refusal.py`: 174 passed. That is one fewer than before, because two tests became one.
- ruff, black and isort are clean on the changed file.
- `git status` shows only the test file modified.

## Changes

**I merged `test_interactive_tools_jobs_are_not_checked_at_any_level` and `test_tools_that_only_look_interactive_are_reviewed` into `test_only_tools_galaxy_builds_as_interactive_are_left_out`.**
- Why: the lookalike test (entry points but no `tool_type="interactive"`, refused under `enforce_code`) passed against the pre-change `security_review.py`. A new non-baseline test must fail without its change at its own assertion. The test is still worth keeping, because it pins the boundary the admin doc states ("entry points alone do not make it one"). So it is now the contrast half of the interactive test: the same template and job values, with only the tool type different. One run is not checked at any level, and the other is refused.
- I added the "It has a command, so only the exclusion leaves it unreviewed" and "Said once per reviewer and tool, not per job" comments, as in the own-tools test. I also gave the lookalike its own file name.

Mutations I ran on `lib/galaxy/tools/security_review.py`. I restored the file after each one and checked it with `git status`:

| Mutation | Result |
|---|---|
| Pre-change file (`git show c04b2dc19b7~1`) | Fails at `assert reviewed_tool_source(tool) is None` |
| Leave out a tool because it has entry points (`if tool.ports`) | Fails: `DID NOT RAISE ToolInputRejected` on the lookalike |
| Log the reason only for Galaxy's own tools | Fails: `assert 0 == 6` on the log count |

## Challenged and kept

- **The 3 levels x 2 `when_unsure` sweep with a refusable identifier.** It mirrors `test_galaxy_own_tools_are_exempt_at_every_level`. The job values would be refused if the tool were reviewed, which the lookalike half shows. So the sweep proves that `check_job` skips the tool, not merely that it finds nothing.
- **`app.config.interactivetools_enable = True`.** It is needed: `InteractiveTool.__init__` raises `ToolLoadConfigurationConflict` without it. This also mirrors production, where the class is built only when an administrator enables interactive tools.
- **The precondition asserts (`tool.tool_type == "interactive" and tool.command`, `lookalike.tool_type == "default" and lookalike.ports`).** They show that the fixtures are what the test claims: a built `InteractiveTool` with a command, and an ordinary tool whose entry points were parsed. Without them, a fixture typo would make the test pass for the wrong reason.
- **The `SimpleNamespace` evaluator stub.** It is the file's shared `evaluator()` helper and is out of scope here. The earlier challenge noted the `SimpleNamespace` stubs as a file-wide candidate for a dataclass.
- **No CWL test at the review layer.** `tool_class_for_source` raises `ToolLoadError` for `tool_type="cwl"`, and there is no `Tool` subclass for a CWL source, so a CWL `Tool` cannot be built today. `reviewed_tool_source` also already returns None for a source that is neither XML nor YAML. The shared tests cover the CWL decision at the predicate.
- **No integration or E2E test.** Running an interactive tool job needs a container runtime. The unit test builds a real `InteractiveTool` from source and goes through the real `ToolSecurityReviewer`, which is the code path job preparation calls. There is no UI.
- **`_review_exclusion`'s `reason: str | None = ...; return reason`.** It looks odd, but it is needed. With a direct `return review_exclusion(...)`, mypy reports `security_review.py:188: error: Returning Any from function`. I kept it.

## Not addressed

- I wrote a private note on one design question about the exclusion's scope. It is not in this repo.

## Recommendations for the shared commit

These are for `d598fb16089`'s `test/unit/app/tools/test_security_refusal.py`. I did not apply any of them.

1. **Pin "entry points alone" at the predicate.** Add a row to `test_review_exclusion` (or to `test_review_exclusion_follows_the_class_galaxy_builds`): an XML tool with `<entry_points>` and no `tool_type` gives `None`. The admin doc and the `review_exclusion` docstring both claim this. Branch 3 pins it only at the review layer, and the sibling branch does not pin it at all.
2. **Pin "in any tool format".** The admin doc says a tool is interactive when it declares `tool_type="interactive"` "in any tool format". No test, and no tool in the tree, has a YAML interactive tool (`grep "tool_type: interactive"` finds nothing). Add a YAML row: a source with `class: GalaxyTool` and `tool_type: interactive`, where `built_tool_type` gives `"interactive"` and `_exclusion` gives `"it is an interactive tool"`.
3. **Move the `patched=True` assertion out of `test_galaxy_interactive_tools_are_excluded`.** That test sweeps the real interactive tools, but its last line calls `review_exclusion(interactive[0], "interactive", patched=True)` with a literal tool type, which is a different concern. Moving it into `test_patched_own_tools_are_reviewed` (perhaps renamed `test_patched_only_changes_galaxy_own_tools`) groups all the `patched` behaviour in one place.
4. **Optional: clearer ids for `test_review_exclusion`.** The `ids=lambda value: os.path.basename(value) if isinstance(value, str) and os.sep in value else None` lambda works, but `pytest.param(path, reason, id="interactivetool_simple")` would say the same thing without the `os.sep` check.

I checked the other shared tests and kept them as they are:
- In `test_review_exclusion_follows_the_class_galaxy_builds`, the `interactive_class` and `*_overridden` rows each catch an implementation that reads `parse_tool_type()` instead of the built class.
- `test_xml_that_claims_cwl_is_reviewed` pins `built_tool_type`'s `None` for a tool Galaxy cannot load.
- The over-40 sweep of the real interactive tools guards against parse differences in real tools.
