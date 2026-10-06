Merge `release_26.1`, with the `social-auth-core<6` cap (#23940) on top, forward into `dev`, so package installs and the "Test Galaxy packages" job stop pulling in 6.0.0 here.

Every dev PR's packages job currently fails while collecting modules:

```
ImportError: cannot import name 'AuthMissingParameter' from 'social_core.exceptions'
```

***This is a full merge-forward. Besides the cap, it carries the 26.1 fixes not yet on dev (#23928 Safari workflow connection drags, #23909 history/workflow card owner actions). Those merged without conflicts.***

***Only conflict: `packages/data/setup.cfg` is gone on dev. The cap goes in `packages/data/pyproject.toml` instead.***

***Server installs aren't affected. `pinned-requirements.txt` pins 5.2.0 here.*** The 6.0 port is tracked in #23941.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Merge-forward chain: #23940 (`release_26.0`) → `cap_social_auth_core_26.1` (`release_26.1`) → this. If those merge and are forwarded first, this becomes redundant.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Without the cap, an `ImportError` at startup. With it, the resolver picks 5.2.0.
- [x] Is the diff free of unrelated or stale generated changes? Only the cap plus the unforwarded 26.1 commits.
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
