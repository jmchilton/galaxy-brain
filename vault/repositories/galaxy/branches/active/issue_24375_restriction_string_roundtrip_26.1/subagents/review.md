# Normal review (2026-11-01)

The review found no blocking issues. I acted on finding 1 (backslashes doubled on every reload), finding 2 (`None` loaded as `"None"`) and part of finding 7: parse cases now call the helper directly, there's an exhaustive round-trip test over short strings, and a `StaticParameterOption` alias. That landed as `c3bf15ffc76`. The reviewer's process alert about an uncommitted `modules.py` was my own red check. It reverted `modules.py` to base for an API run and restored it afterwards. The API test was then run red (base) and green (fix).

Not acted on:

- **Finding 3: reject non-text entries instead of coercing them.** Loading must not fail for stored workflows, so coercing at load stays. Rejecting non-text restrictions at save or import would be a separate validation change, and it belongs with the strict-typing follow-up (gxformat2#272).
- **Finding 2, second part: a dict with no `value` still raises `KeyError`.** This is pre-existing and out of scope. It's noted in the implementation debrief.
- **Finding 4: the sample-sheet column editor's comma format is also lossy.** It's client-only and lossy only when the user edits. It's a follow-up candidate.
- **Finding 5: syntax changes for newly typed strings.** These are intentional and will go in the PR description.
- **Finding 6: help text length.** Left as is.
- **Finding 7: the `TypedDict` for `{value, label}`.** I used a plain alias instead.

<details>
<summary>Full review</summary>

**Verdict:** the fix is correct and well-contained. I found no blocking or high-severity problems and no security concerns. My suggestions are low or medium severity, mostly about UX and consistency.

**Process alert.** During the review, the worktree had an uncommitted `modules.py` that reverted it to the pre-fix code, presumably someone's red check. I re-ran the tests on a `git archive HEAD` copy instead.

**What I verified:**

- The unit suite at HEAD passes: 139 tests.
- 200k random round trips of `dec(enc(opts)) == opts` had 0 failures. As expected, `{"value": "", "label": ""}` collapses to `""`.
- 200k random typed strings were stable under `dec(enc(dec(s))) == dec(s)`.
- The encoder and parser agree on Unicode whitespace.
- There's no conflict with #24140. The two branches touch disjoint functions, and #24140's runtime builder already treats a label-less dict as value=label.
- Persisted state is always structured: `save_to_step` stores `_parse_state_into_dict()`. Backward compatibility therefore only matters for strings typed from now on.
- The help text renders literally, because `helpFormat` is html.

**Findings:**

1. **Medium (UX).** `_escape_option_part` escapes every backslash, so a typed `C\data` reloads as `C\\data`. Fix: escape `\` only before `\ , :`, whitespace, or the end of the part.
2. **Low.** `str(None)` produces `"None"`. Treat `None` as `""`. Separately, `{"label": "x"}` with no `value` still raises `KeyError`. That's pre-existing.
3. **Low (design).** Coercing non-text entries keeps never-working input alive. Coercing on load is right, but consider rejecting these entries at save or import, in line with the 26.2 strict typing. With #24140, a numeric default against restrictions coerced to strings won't preselect.
4. **Low.** `FormColumnDefinition.vue` uses its own unescaped comma format for sample-sheet columns. Follow-up.
5. **Low.** Semantics change for newly typed strings: `\` followed by a special character is now an escape, `a,,b` no longer yields `""`, and a lone `:` is `""`. These need documenting in the PR.
6. **Nit.** The help text is long. `:` is a sensible encoding for the empty value.
7. **Nit.** Add a shared option type alias or `TypedDict`. The parse cases could call the helper directly. The baseline tests are fine to keep.

**Structured editor instead?** Not on release_26.1, because repeats don't work in this form. The escape scheme fixes the silent load-time data loss at minimal risk. A structured editor is a dev follow-up.

**Placement:** next to `validators_to_form`/`validators_from_form` is right. Replacing the method and the closure is a net simplification.

</details>
