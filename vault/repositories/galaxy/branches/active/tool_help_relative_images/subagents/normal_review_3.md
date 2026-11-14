# Normal review 3 (X1/X2)

Reviewed the two commits added for John's scope decision: pass the user to the icon lookup (X2, now `b7c94f6ed1d`) and strip `$PATH_TO_IMAGES/` from non-shed RST help (X1, now `e7e8939e7bf`). No bugs found. Acted on all nits, folded into those commits:

- `test_tool_icon_require_login` now also asserts an anonymous request still gets 401 (strengthening; passes).
- XSD: moved the `$PATH_TO_IMAGES/` sentence ahead of the "Before Galaxy 27.0" caveat.
- X2 commit message mentions admins now getting Data Manager tool icons.

Not acted on:

- `strip_path_to_images` stays in `shed_util_common.py`, next to the other RST image regexes, as the reviewer recommended.
- RST substitution definitions (`.. |x| image::`) and figure `:target:` aren't rewritten; the shed path doesn't handle them either and no surveyed tool uses them.

The autosquash also rebased onto `origin/dev` (2 new upstream commits, GitHub workflow pins only; none touch branch files). Force-pushed.

<details>
<summary>Full review</summary>

See [normal_review_3_raw.md](normal_review_3_raw.md).

</details>
