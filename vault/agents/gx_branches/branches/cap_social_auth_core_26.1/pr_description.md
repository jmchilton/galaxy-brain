Merge #23940 (cap `social-auth-core` below 6) forward to `release_26.1`, so package installs and the "Test Galaxy packages" job stop pulling in 6.0.0 here too.

26.1 is more exposed than 26.0. Besides the three `managers.py` imports, `oidc_utils.py` subclasses `AuthMissingParameter`, which is what the packages job fails on:

```
ImportError: cannot import name 'AuthMissingParameter' from 'social_core.exceptions'
```

***This is a merge of the 26.0 branch, not a separate fix. It merged cleanly; the diff against `release_26.1` is the same one line in `packages/data/setup.cfg`.***

***Server installs aren't affected. `pinned-requirements.txt` pins 4.9.1 here.*** The 6.0 port is tracked in #23941.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Merge-forward of #23940. If #23940 merges first, the normal merge-forward makes this redundant; this lets 26.1 (and its PRs' packages jobs) go green without waiting.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Without the cap, an `ImportError` at startup. With it, the resolver picks 5.2.0.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A. Dependency metadata only. The packages CI job is the test.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] Instructions for manual testing are as follows:

<details><summary>Manual check</summary>

```sh
uv run --no-project --isolated --with "social-auth-core>=4.5.0" \
  python -c "from social_core.exceptions import AuthMissingParameter"   # 6.0.0: ImportError
uv run --no-project --isolated --with "social-auth-core>=4.5.0,<6" \
  python -c "from social_core.exceptions import AuthMissingParameter"   # 5.2.0: ok
```

The "Test Galaxy packages" job is the end-to-end check.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
