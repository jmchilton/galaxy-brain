# Test challenges debrief

Scope: the tests that `8d1d17cbc3d` ("Read getVar in loops over a literal list or a select's value as literal names") added. That is 26 new rows and tests in `test/unit/tool_util/security/test_known_helpers.py`, including the 7 lambda, generator and comprehension rows, plus the spec cases `known_literal_list` and `known_select_value`. The earlier challenge for the branch is in `earlier_drafts/1/test_challenges_debrief.md`.

I committed nothing, because the spec branch has a single writer. The work ran in a detached scratch worktree at `8d1d17cbc3d`, and that worktree has since been removed. The recommended tests are given below as exact code. Each one passes on `8d1d17cbc3d` and fails under the mutation it is listed against.

## Verdict

The new tests are black-box. They feed real tool XML through `review_tool_source`, use no mocks, and sit at the right layer. The spec cases add harm checks through the real evaluators. Of 29 mutations of the new code, 17 turned a test red. Of the 12 that survived, 7 are masked by another check or can't be observed (listed below). The other 5 are real gaps in what the tests pin:

1. **Substituting before dropping a rebound name** (`_propagate`). The code drops a `#set` text from `known` before it substitutes into a statement that binds the name again. Swapping those two steps passes every test, but it is wrong for a nested loop that reads the name before it rebinds it: the second time round, the read gets the rebound value. The existing nested-`#for` row reads the name after the inner loop, so it can't tell the two orders apart.
2. **`replace` with a count.** If the fold ignores the count argument (`len(node.args) >= 2`), all tests still pass, but the folded name is wrong.
3. **Any two-text method folded as `replace`.** If the method-name check is dropped, all tests still pass. `'te:xt'.format(':', '')` would then fold to `text`.
4. **`_PART` accepting a leading underscore** (`[A-Za-z_]...`). This lets a later part of a literal loop's getVar name be private or a dunder, such as `text.__class__`. All tests pass. The older helper row `rg_param('text.__class__')` is still refused, but by another check, so it doesn't pin this regex.
5. **More than one node answering for a select's path** (`len(nodes) != 1` loosened to `not nodes`). This takes the first node's options and silently drops the others. All tests pass. It is old behaviour that the split loop shares, but `_select_options` is new code here.

Two more gaps are smaller:

- **The set and dict comprehension frames** (`visit_SetComp`, `visit_DictComp` removed from the own-frame list). All tests pass, because only the generator, lambda and list comprehension forms are tested. A set or dict comprehension has its own frame on every Python version (a list comprehension does before 3.12), so substituting into them would be wrong on 3.9 to 3.11.
- **The letters of a single select's option.** These are pinned only through the case where a letter collides with the loop variable (`join`). No test shows that a letter reaches a parameter it names.

## Recommended tests (exact code)

In `test/unit/tool_util/security/test_known_helpers.py`:

```python
TWO_SELECTS = """<conditional name="c">
<param name="kind" type="select"><option value="a"/><option value="b"/></param>
<when value="a"><param name="oformat" type="select" multiple="true"><option value="tblout"/></param></when>
<when value="b"><param name="oformat" type="select" multiple="true"><option value="free"/></param></when>
</conditional>"""
```

Add these rows to `test_loop_over_values_the_review_cannot_list_is_reflection`:

```python
        # A read in a nested loop before the statement in it that binds the name again.
        (
            "#for $e in ['text']\n#set $n = $e\n#for $x in [1, 2]\ntool '$getVar($n)'\n#set $n = $free\n#end for\n#end for",
            INPUTS,
        ),
        # `replace` with a count, and another method given two texts, are not folded.
        ("#for $e in ['te:x:t']\n#set $n = $e.replace(':', '', 1)\ntool '$getVar($n)'\n#end for", INPUTS),
        ("#for $e in ['te:xt']\n#set $n = $e.format(':', '')\ntool '$getVar($n)'\n#end for", INPUTS),
        # A later part of the name is private or a dunder.
        ("#for $n in ['text.__class__']\ntool '$getVar($n)'\n#end for", INPUTS),
        ("#for $n in ['text._value']\ntool '$getVar($n)'\n#end for", INPUTS),
        # Two selects answer for the path, with different options.
        (VALUE_LOOP.replace("$oformat", "$c.oformat"), INPUTS + TWO_SELECTS),
        # Set and dict comprehensions have their own frame too.
        ("#for $n in ['word']\ntool '${''.join({$getVar($n) for _x in [1]})}'\n#end for", INPUTS),
        ("#for $n in ['word']\ntool '${''.join({$getVar($n): 1 for _x in [1]})}'\n#end for", INPUTS),
```

Add a positive test for the letters:

```python
def test_loop_over_a_select_value_reads_the_parameter_a_letter_of_an_option_names(tmp_path):
    inputs = select('<option value="tblout"/><option value="word"/>') + (
        '<param name="t" type="text"><sanitizer sanitize="false"/></param>'
    )
    report = review(tmp_path, VALUE_LOOP + "tool", inputs=inputs)
    assert code(report) == set()
    assert ("shell-injection", "high") in rules(report)
```

Add `assert not report.unanalyzed` after `review(...)` in these tests:

- `test_loop_over_a_literal_list_reads_each_element`
- `test_loop_over_a_literal_list_reads_a_section_named_with_a_dash`
- `test_loop_over_a_select_value_reads_each_option`

Their `injection=False` rows only check that nothing is refused and that no injection is found. A template that does not compile gives exactly that result: I checked that it yields no findings at all. The rows pass today because they compile, and they already pass with this assert added (9 of 9). `test_loop_over_a_literal_list_of_inputs_cleaned_with_re_sub` already has the assert.

Which mutation each new row turns red:

| Row / test | Red under |
|---|---|
| nested loop, read before rebind | substitute before pop in `_propagate` |
| `replace(':', '', 1)` | fold ignores the count |
| `.format(':', '')` | fold any method of two texts |
| `text.__class__`, `text._value` | `_PART` allows a leading `_` |
| `TWO_SELECTS` | `_select_options` takes the first of several nodes |
| set / dict comprehension | own frame for lambda, generator and list comprehension only (also red with no own frame at all) |
| letter positive test | `.value` without the letters |

## Red/green evidence

I ran the mutations with `test_known_helpers.py` and `test_spec.py`, which together make 207 tests. Each mutation was applied to `known_helpers.py` and then restored.

| Mutation | Result |
|---|---|
| Literal lists off | 8 `test_known_helpers` tests and `test_review[known_literal_list]` red |
| Tuple targets off | 3 red, including llm_hub |
| Non-text literal elements accepted | `['text', $free]` row red |
| Tuple arity unchecked | `('a', 'text', 'b')` row red |
| `.value` path off | both select-value tests and `test_review[known_select_value]` red |
| Letters dropped | the `join` row red |
| `_unclaimed` dropped from `_select_options` | `#set $oformat = $free` rows red (old and new) |
| `_propagate` off | `replace` loop, dash and `known_literal_list` red |
| `_propagate` never drops a rebound name | 3 rows red |
| Non-text `#set` values propagated | 5 rows red |
| No own frame | all 7 scope rows red |
| Own frame for generators only | lambda and list comprehension rows red |
| `replace` fold off | 4 red, including `known_literal_list` |
| Non-text `replace` arguments folded | `replace(':', $free)` row red |
| Dash reverted | dash test and `known_literal_list` red |
| `_reads_any` check in `_branches` removed | 2 older rows red |
| Only the first loop target substituted | 3 red |

Baseline check: I restored the parent `45231d97bac`'s `known_helpers.py` and kept the new tests and cases. 13 tests fail, each at its own assertion:

- every positive loop test (10);
- `test_review[known_literal_list]` and `test_review[known_select_value]`;
- one reflection row: the `str($oformat).split(',')` loop with getVar in a generator. Before this commit, the substitution reached into the generator.

The other 26 reflection rows pass on the parent, as they should. They pin the limits of the new reading against a parent that refuses all of these templates, so they can't fail there. They are the regression guards that the mutations above turn red, and the process's "fails without the change" rule doesn't fit them. I kept them all.

Compile guard: the new reflection test asserts that the template compiles. I also checked the older reflection tests, which have no such guard. A template that doesn't compile records an unanalyzed note and no findings. So no `COMPUTED_GET_VAR` assertion can pass because a template failed to compile. The weak spot is on the positive side instead (see the `unanalyzed` assert above).

## Survivors not acted on (masked or unobservable)

- **`.value` with a tuple target** (the `len(targets) != 1` check removed). Masked: the second target stays unsubstituted, and `_reads_any` refuses it.
- **A loop target rebound in the body** (the `_bindings` check in `_branches` removed). Masked: `_reads_any` counts a store to the name as a read too.
- **A dash allowed in the first part.** Masked by `_unclaimed`, which takes plain identifiers only.
- **Any punctuation in a later part.** Masked or harmless: such a name does not resolve at run time.
- **`VFN` autocall flag unchecked.** With autocall on, `replace` is called with no arguments and raises before the outer call. That is a job error, not a wrong name.
- **The if-chain compares only the first target.** Not observable: the static review reads every branch whatever its test. The job check doesn't render the rewritten tree.
- **Own frame removed, for known helpers.** The commit says that the frame rule holds "in loops and known helpers alike". For helpers, it can't be tested: a helper whose getVar sits in a generator or list comprehension no longer matches a known helper, so it is refused either way (I checked `rg_param` with both forms, with and without the frame rule). A test for this would be silly, so I recommend none.

## Other challenges

- **Implementation testing, mocks, layer.** None of the tests reach into internals. They review real tool XML, and the spec cases run the real evaluators with harm checks. There are no mocks. There's no UI, so no E2E test is needed. An API or integration test would add nothing beyond `test_security_review_spec.py`.
- **Overlap.** The unit rows and the two spec cases cover the same forms on purpose. The spec is the contract that is shipped and reused, and the unit rows pin its limits.
- **Readability nit.** The third `LITERAL_LOOPS` row puts `NAME` through `.replace("NA!ME", f"{name[:2]}!{name[2:]}")`, which is hard to follow. A separate parametrized test with the two literal lists written out would be clearer. It's optional.

## Checks

- `test/unit/tool_util/security`: 711 passed (`-n 8`, 66s). The recommended rows and test: 9 passed on `8d1d17cbc3d`.
- `test/unit/app/tools/test_security_review_spec.py -k "known_literal_list or known_select_value"`: 66 passed, run serially.
- `test/unit/app/tools/test_security_review.py`: 115 passed.
- Runner note: the full `test_security_review_spec.py` suite (1892 tests) didn't finish within 25 minutes under `-n 8`, alongside the other suites. Run it serially, or in its own process.
