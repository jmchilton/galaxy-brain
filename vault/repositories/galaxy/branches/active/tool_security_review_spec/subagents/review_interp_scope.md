# Review: interpreter lookup scope (debrief)

Acted on: the two blocker findings in the commit that keeps nested-scope changes (fixed in `281a75a82fb`, with tests), two older gaps next to the new `map` and mutator code (fixed in `ba8b70b6d35`), the missing negative tests (`test_names_a_lambda_or_comprehension_binds_do_not_leak`), the `Env.merge` / `hidden` nit (merge now unions the branches' hidden names), the `_block_call` nit (it returns the block's name), the rejoin docstring and lambda comment (they now state the limit), and the getVar comment. The details of the blockers and of the older gaps went to John privately, under the security policy. Not acted on: the items below.

- Three older gaps of the same kind, all already present at `8d1d17cbc3d`. Two share a root with known open item F, and fixing them is a larger change to how the interpreter reads lambdas, so it is left for John to decide. Details are private.
- Precision nit (5): list, set and dict comprehensions always get their own frame, though Python 3.12 inlines them. This stays on purpose while Galaxy supports Python 3.10 and 3.11. The corpus measurement the reviewer asked for: the nested-scope change alters 2 of 3,695 tools (tools-iuc, tools-devteam, galaxytools, tools-galaxyp). In both, a source is added to an existing finding, and no new finding appears.
- Precision nit (6): getVar drops narrowing. It has to be conservative, because a narrowing key can't tell a local from the parameter it shadows. A comment now says so.

<details><summary>Full review (non-sensitive part)</summary>

Reviewer: general-purpose subagent (Claude Opus 5.5). Scope: `8d1d17cbc3d..480f39890ad`, 8 commits. It edited nothing and made no commits.

Checked:
- Unit tests: `test/unit/tool_util/security`, 759 passed on HEAD at review time.
- ruff is clean, and mypy reports nothing in the security package.
- Do the new tests pin the change? 28 of the new cases fail against the base implementation. The ones that pass on base are deliberate pins: the negatives, `map(lambda x: x, [$free])`, and the test-challenge loop rows.

Found sound:
- Narrowing keys inside nested scopes. A hidden name joins its narrowed local with the un-narrowed namespace value, and rejoin skips narrowing keys.
- `#def` helpers called from nested scopes get a fresh env, so nothing is hidden there.
- Nested lambdas inside generators, and comprehensions inside lambdas.
- Lambda defaults for posonly, kwonly, `*a` and `**k` arguments, evaluated in the enclosing env.
- `map` with several iterables, for lambdas and helpers.
- `map` over bound methods. Base missed several of these, and HEAD now catches them.
- `_block_call` matches Cheetah's `self.b(trans=trans)`. A block inside `#for` or inside a `#def` is read.
- `getVar` now ignores `#set` locals, which matches Cheetah.

Findings:
1. should-fix, tests: the rejoin test had only positive cases. Add negatives (a comprehension target must not leak), and add a case where the nested scope binds a name that is not already a method local. Done.
2. should-fix, docs: the rejoin docstring and the lambda comment implied that a rejoin at definition time stands for any call. State the limit. Done.
3. nit: `_block_call` returned a bool, and its caller re-asserted the node's shape. It now returns the name. Done.
4. nit: `copy()` carried `hidden`, but `merge()` didn't combine it. It now unions the branches' hidden names. Done.
5. nit, precision: comprehensions always get their own frame. Kept on purpose (see above).
6. nit, precision: getVar resolves without narrowing. Kept, and a comment added.
7. observation: the new spec cases and their doc sections read clearly and follow the existing format.

Sensitive findings: handled under the private security process, not recorded here.

</details>
