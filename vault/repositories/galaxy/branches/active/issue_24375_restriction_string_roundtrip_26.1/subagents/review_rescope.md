# Normal review after re-scope (2026-11-01)

I acted on all five findings by amending the unpushed expansion commit (now `6340eaa04f2`):

1. Restricting on connections keeps priority over static restrictions, as at runtime. Only restrictions plus suggestions changes behavior (restrictions now win).
2. The comment and commit message now cite the real precedent, the form's `restrictions or suggestions` prefill, instead of "as on the run form".
3. The commit message now states the full effect. Restrictions were dropped at import and save, and the run form didn't enforce them. The PR description should carry the same note.
4. The separator API test is back to its original form. The precedence case has its own API test, `test_text_input_restrictions_and_suggestions_open_restricted`, which also checks that the run form is a select over the restrictions.
5. The unit test is split into `..._restrictions_beat_suggestions_on_load` and `..._restrict_on_connections_kept_on_load`.

Not acted on: nothing.

<details>
<summary>Full review</summary>

**Verdict.** Nothing blocks the branch. The escape-scheme commits look sound. The expansion fixes a real loss of data, but its restrictions-over-restrictOnConnections flip changes behavior without motivation, and its comment makes claims about the run form that the code doesn't support. There are no security concerns.

**Verified:**
- 144 unit tests pass, and mypy and ruff are clean.
- The collapse happens at import: `from_dict` goes through `step_state_to_tool_state`, then `save_to_step`. `get_runtime_inputs` never sees both keys; if it did, suggestions would overwrite the options.
- There's no textual or semantic conflict with #24140 (`git merge-tree` against `release_26.2` is clean), and #24140's default preselection now reaches these inputs.

**Findings:**
1. **Medium.** `modules.py:1918-1924`: restrictions now beat restrictOnConnections. Runtime treats on-connections as primary, with static restrictions as the fallback. Keep on-connections winning with `if restrictOnConnections and suggestions is None: onConnections / elif restrictions: staticRestrictions / elif suggestions: staticSuggestions`, or document the flip.
2. **Low.** The claim "as on the run form" is wrong. The precedents are the editor prefill (`restrictions or suggestions`) and `FormColumnDefinition.vue` `initialEnumerateType`.
3. **Low.** The effect is understated. Before the fix, restrictions plus suggestions gave a free-text run form that didn't enforce the restrictions. Say so in the PR or changelog.
4. **Low.** The API test mixes the separator regression with precedence. Restore it, and add a separate API test that checks the tool_state and that the run form is a select over the restrictions.
5. **Nit.** Split the unit test by intent.

**Domain answers:** restrictions over suggestions is right. Keep on-connections winning on release_26.1. No changes are needed for #24140.

</details>
