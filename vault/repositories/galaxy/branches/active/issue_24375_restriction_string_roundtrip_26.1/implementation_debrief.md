# Implementation debrief

```
created .../differential-review/snapshots/20261101T153515Z-hardening-4333ba9e1a6c.json
  hardening @ 4333ba9e1a6c vs origin/release_26.1 (merge-base 32f18adbdd1c)
  since 20261101T150953Z-implementation-6340eaa04f25:
    commits: 0 same, 1 rebased, 3 changed, 2 new, 0 dropped
    hunks:   11 carried, 3 changed, 1 new, 0 dropped
```

**STATUS: READY.** Scope decision: one modest expansion (restrictions plus suggestions), then no further change.

**Push is blocked.** Local head is `4333ba9e1a6`. Hardening rewrote the history (test moves and a refactor-first commit), and the force-push to the fork was denied by the permission classifier. So `jmchilton/issue_24375_restriction_string_roundtrip_26.1` still points at `c3bf15ffc76`, which is the escape fix only. The final tree differs from it by the precedence fix, the refactor split and the regex cleanup. John or the coordinator needs to run `git push --force-with-lease jmchilton issue_24375_restriction_string_roundtrip_26.1` from the worktree. The original scope is on the fork as `..._alt_original_scope` (`13c2282e38c`).

## What it does

The fix is for #24375, on `release_26.1`, with no parent branch. Commits, in order:

1. **Baseline tests.** Pin what already round-trips: plain values, `value:label`, the editor string, form parsing, empty values, and restrict-on-connections beating restrictions.
2. **Refactor only.** Move `_parameter_option_def_to_tool_form_str` and the nested `_string_to_parameter_def_option` to module-level `parameter_options_to_form_str` and `form_str_to_parameter_options` in `workflow_parameter_input_definitions.py`. Behavior is still lossy.
3. **Fix.** Backslash escapes in the editor field:
   - `\,`, `\:` and `\\` stand for a literal comma, colon and backslash, and `\<space>` keeps whitespace at the ends.
   - A stray comma no longer adds an option, and a lone `:` is the empty value.
   - Values and labels are trimmed separately.
   - Label-less dicts, non-text entries and `None` load as text instead of raising.
   - The help text documents the syntax.
4. **Follow-up.** Escape a backslash only where parsing would misread it, so `C\data` reads back as typed.
5. **Precedence (re-scope).** A state with both restrictions and suggestions opens as restricted. Before, the restrictions were dropped at import or save and weren't enforced on the run form. Restrict-on-connections keeps its old priority.
6. **Cleanup.** One escape character class drives both the encoder and the parser.

## Tests

- **Unit, in `test_modules.py`:** round trips for every lossy case, normalization, a parser table, an exhaustive round trip over short strings of `a\,: `, the exact editor string, and the tool-form save path.
- **API:** `test_text_input_static_restrictions_survive_download` covers upload, download, re-import and download. `test_text_input_restrictions_and_suggestions_open_restricted` checks the tool_state and that the run form is a select.
- **Red/green:** both API tests and the non-baseline unit tests failed before the fix and pass after it. On the final head, `test/unit/workflows` has 253 passed and 1 skipped, and the 2 API tests pass. mypy, ruff, black and isort are clean.

## Hardening

| Step | Result |
|---|---|
| [Test challenges](test_challenges_debrief.md) | Moved never-red cases to the baseline, dropped one duplicate unit test |
| [Codex](codex_review.md) | No findings. The sandbox couldn't run commands, so the code was inlined into the prompt |
| [Thermo-nuclear](thermo_nuclear_review.md) | Unified escape rule, corrected the precedence comment |
| [Baseline refactor](baseline_refactor.md) | Added the refactor-first commit |
| [Scope evaluation](scope_evaluation.md) | Keep as implemented |
| Check-branch | Format and mypy clean |
| Screenshots | Skipped: the only UI change is server-provided help text |
| Reviews | [Normal review](subagents/review.md) and [post-re-scope review](subagents/review_rescope.md): every finding was addressed or explained |

Earlier-round debriefs are in `earlier_drafts/1/`. The re-scope is in [implementation_rescope_debrief.md](implementation_rescope_debrief.md). The issue comment is drafted, not posted, in [issue_comment_draft.md](issue_comment_draft.md).

## For the PR description

- The editor field's syntax changed for newly typed strings: `\` before `,`, `:`, `\` or whitespace is now an escape, `a,,b` no longer gives a `""` option, and a lone `:` is `""`. Persisted state is always structured, so stored workflows are unaffected.
- Restrictions plus suggestions now open as restricted, so the run form enforces them.

## Decisions for John

1. **Base.** Is `release_26.1` right? The code is identical from 25.1 to dev. I chose 26.1 because the field syntax changes. 25.1 is the policy's oldest supported branch.
2. **Escape syntax or structured editor.** Is the escape syntax acceptable on a release branch, or should this wait for a structured value/label editor on dev? The issue prefers the editor, but repeats don't work in this form, so it would need client work.
3. **Non-text entries.** They're coerced to text on load. Should they also be rejected at save or import, to match 26.2's strict typing (gxformat2#272)? Scope evaluation: not on 26.1, because numeric restrictions run today.
4. **Follow-ups:**
   - A dict with no `value` still raises (import validation).
   - Restrict-on-connections plus suggestions still opens as suggestions. The precedence is circular. Making it a clean order is a one-line change, but it changes behavior.
   - The sample-sheet column editor (`FormColumnDefinition.vue`) uses its own unescaped, lossy comma format.
   - A structured editor on dev.
5. **Force-push.** Authorize the force-push above so the fork matches the local head.

## Incident

A concurrent `git stash pop` race briefly pulled another agent's stash into this worktree. I cleaned it up, and the owner's work was intact in its own worktree. I don't use stash any more.
