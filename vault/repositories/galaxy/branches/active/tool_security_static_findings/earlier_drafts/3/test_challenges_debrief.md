Run via Claude Opus at high effort.

# Test challenges: tool_security_static_findings (re-harden)

One commit, `e067cc3dd2a`, on top of `79f7da40312`. It is test-only apart from one spec property, `ReviewExpectation.rules`. `test/unit/tool_util/security` went from 604 to 589 passed. The drop is one merged test plus two parametrized coverage tests (8 and 9 members) that became set checks. No check was weakened. The analyser is untouched; the generated docs section is byte-identical, and so is the CLI oracle (see `thermo_nuclear_review.md`).

## Changes

- **`test_main.py`**
  - `test_review_error_keeps_tool_id_and_version` no longer monkeypatches `review_tool_source`. It reviews a real tool written to `tmp_path`: the tool loads, but its `<validator type="nope">` makes the review raise. The test also checks that the next path is still reviewed, and the exact-dict assertion now carries the real error string.
  - The YAML tests write a minimal `class: GalaxyTool` file to `tmp_path` instead of copying `simple_constructs.yml`. `test_main` no longer depends on `test/functional/tools`.
  - `test_text_names_the_tool_version` was folded into `test_text_lists_findings_by_tool`, which now asserts the exact header instead of `startswith`. `_directory` (one caller) was inlined, and the `PIPE` constant is used where `tool_path("pipe_to_shell.xml")` was repeated.
- **`test_rules.py`: strengthened.** `test_emitted_rules_are_catalogued` used to record only the first `kind` seen for each rule. It now collects every kind a rule is emitted with and requires exactly `{vulnerability}` or `{capability}`, so a rule emitted with both kinds now fails.
- **`test_classify.py`: strengthened.** In two tests, `X in result.codes` became an exact `codes ==`, and the rewrites reason is compared exactly.
- **`test_spec.py`** now holds the spec checks that were scattered across files:
  - Pattern coverage and the vulnerability-rule spec coverage are set differences instead of per-member parametrizations, so a failure names every missing member.
  - The pattern descriptions get the same `set(...) == set(PatternCode)` check that `Rule` and `Uncheckable` have, which also catches stale keys.
  - `test_spec_rejects_an_unknown_rule` (from `test_rules`) and `test_spec_rejects_review_failed_as_a_classify_code` (from `test_classify`) moved here, beside the loader they test.
- **Design: `ReviewExpectation.rules`** (a plain `@property`, so `model_dump` and the generated docs are unchanged) is "the rules a case names". It replaces `docs._case_rules` and the coverage test's inline copy.

## Red checks

The package does not exist on dev, so "fails without the branch" would only fail at import. Each changed test was instead shown red under a temporary mutation, which was reverted with `git checkout`. All mutations ran before the identity dumps.

| Mutation | Went red |
|---|---|
| `__main__._identify` returns `None, None` | `test_review_error_keeps_tool_id_and_version` |
| `Rule.OPTION_INJECTION` dropped from `VULNERABILITY_RULES` | `test_emitted_rules_are_catalogued` |
| `classify`: `if capabilities:` becomes `if True:` (spurious `TEMPLATE_CODE`) | the rewrites and pipe tests. Both passed with the old `in` checks. |
| `ReviewExpectation.rules` returns `serious_rules` only | `test_every_vulnerability_rule_has_a_case` |
| The rewrites reason text reworded | `test_rewrites_name_the_rewriting_code` |

The rule emitted with both kinds case was reasoned, not mutated: forcing it would mean changing the analyser.

## Process items

- **`doc/source/dev/writing_tests.md`:** read. This is a library with no server, so the unit layer is right. No API, integration or E2E test applies, because nothing wires the review into Galaxy at runtime.
- **Mocks:** the only one was the `monkeypatch` above, and it is gone. `RecordingJudge` (`test_judge`) is already a small reusable stand-in. `test_patterns._finding` builds real `Finding` dataclasses.
- **Ported tests** (`test_review`, `test_sources`, `test_known_helpers`, `test_judge`, `test_patterns`, `test_template`) were challenged, and none was dropped:
  - `test_template` is a differential test against Cheetah's own parser.
  - `test_patterns` pins `expr` shapes that the spec cases do not reach.
  - `test_judge` uses a real stand-in.
- **"Baseline tests" prefix:** not used, because there is nothing on dev to pin.
- **Tree dependence:** `test_rules` still walks `test/functional/tools` with no skip guard. That matches the other `test/unit/tool_util` tests (`test_parsing`, `test_test_definition_parsing`). The `packages/tool_util` run goes through the `tests/tool_util` symlink inside the tree, so it always has the directory.

## Not done

- **`test_review.py`'s 28 subset checks** (`expected in rules(...)`) were left alone. They are mvdbeek's tests, and exact sets would pin every incidental low finding. The suggested helper from the earlier draft still applies. `test_review.py` stays at 983 lines.
- **Spec `unchecked_locations` still compares the report's own set**, not the classified one. That is pending John's decision; the CLI tests pin the classified set.
- **`path_like_name` is still a near-duplicate of `element_identifier_shell_injection`.** That decision carries over from `earlier_drafts/1`.

## Status

READY.
