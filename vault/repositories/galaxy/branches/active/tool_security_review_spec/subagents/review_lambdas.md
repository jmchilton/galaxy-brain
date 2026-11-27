# Review debrief: lambdas in templates (`tool_security_review_spec_lambdas`)

I acted on every in-scope finding of the normal review, plus its code-quality nits and test gaps. I did not act on three findings about older behaviour that the lambda work does not touch. John has those privately.

Not acted on:
- Three findings about older behaviour, outside the lambda work. They need a decision from John, who has them privately.
- Nit: `_bound` in lambdas.py was not rebuilt on interp's target helpers. It covers more statement kinds than they do. Where the two differ, it only adds names, so it errs toward flagging.

<details>
<summary>Full review (non-sensitive part)</summary>

1. should-fix: lambdas.py kept its own copy of the template attribute names, which had drifted from the one in capabilities.py. Done: both now use `template.template_attributes()`.
2. nit: `_bound` reimplements interp's target helpers. Not done, for the reason above.
3. nit: the comprehension target walk was written twice. Done: `_targets()`.
4. nit: `map` was matched only as a bare name, not as `$map`. Done.
5. nit: the set of changing names was rebuilt for every lambda. Done: it is now computed once per template.
6. Style fits interp.py and known_helpers.py.

The reviewer found no false positives from `unfollowed_changes` / `method_locals` over `#block`, `#cache`, `#filter`, loop variables or common append and update idioms. The test gaps it named are now covered in test_review.py.

</details>
