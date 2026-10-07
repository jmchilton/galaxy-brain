Cap `social-auth-core` below 6, so installing Galaxy's packages stops pulling in a release that Galaxy can't import.

`social-auth-core` 6.0.0 was published on 2026-10-06. Since then every PR's "Test Galaxy packages" job fails while collecting modules:

```
ImportError: cannot import name 'AuthMissingParameter' from 'social_core.exceptions'
```

6.0.0 removed most of its specialised exception classes, and `lib/galaxy/authnz` imports four of them:

| Class | Galaxy import | 5.2.0 | 6.0.0 |
| --- | --- | --- | --- |
| `AuthMissingParameter` | `oidc_utils.py` (26.1+) | ✅ | ❌ |
| `AuthAlreadyAssociated` | `managers.py` | ✅ | ❌ |
| `AuthForbidden` | `managers.py` | ✅ | ❌ |
| `AuthTokenError` | `managers.py` | ✅ | ❌ |

`galaxy-data` declares `social-auth-core>=4.5.0`, so `pip install galaxy-data` / `galaxy-app` now resolves 6.0.0 and fails at import.

***Server installs aren't affected. `pinned-requirements.txt` pins 4.8.3 here (4.9.1 on 26.1, 5.2.0 on dev). This only fixes package installs and the packages CI job.***

***This is a cap, not a port. Moving to 6.0 needs a database migration as well as new exception names, so it's tracked separately in #23941.***

<details><summary>What a 6.0 port involves (#23941)</summary>

From the 6.0.0 release notes:

- Removed exception classes become coded categories, e.g. `AuthInputError(code="missing_parameter")`. `managers.py` catches `AuthTokenError`, `AuthForbidden` and `AuthAlreadyAssociated`, and the authnz unit tests import them too.
- Storage integrations must persist an association `id_key` and implement `get_social_auth_by_extra_data()` and an atomic `migrate_social_auth()`. Nonces must persist `issued`/`lifetime` and email codes a `timestamp`. That means schema changes to `UserAuthnzToken`, `PSANonce` and `PSACode`.
- Strategies implement `get_request_data()`, pipeline steps no longer receive `request`, and a new `social_names` pipeline step handles name normalisation.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Targets `release_26.0`, the oldest branch that imports these classes and still gets fixes, so the cap can merge forward to `release_26.1` and `dev`. `release_25.x` has the same exposure.

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
  python -c "from social_core.exceptions import AuthTokenError"      # 6.0.0: ImportError
uv run --no-project --isolated --with "social-auth-core>=4.5.0,<6" \
  python -c "from social_core.exceptions import AuthTokenError"      # 5.2.0: ok
```

The "Test Galaxy packages" job is the end-to-end check.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
