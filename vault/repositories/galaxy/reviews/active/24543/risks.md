Risks are minimal - this release-branch fix narrows how `/user/logout` parses `logout_all` (now `string_as_bool`, matching `/authnz/logout`) and stops the client sending it on plain sign-out; it doesn't lock Galaxy into difficult-to-change choices (a two-way door).

<details><summary>Risk Details</summary>

- Small server behavior change: `/user/logout?logout_all=<value>` previously ended all sessions for any non-empty value; now only `true`/`yes`/`on`/`1` (case-insensitive) do. A script relying on another truthy string (unlikely) would silently get a plain logout.
- Mixed-version deploys (new client, old server or vice versa) are safe: client omits the param unless true, so old servers no longer misread `"false"`.
- Easy rollback: three-line code change plus tests.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the narrowed parsing is acceptable as an intentional fix and consistent with `authnz.logout`'s `asbool`. Check the Masthead and ExternalIdentities callers (which pass no argument or an event) now map to plain logout, and that the "Sign out of all sessions" path still sends `logout_all=true`.

</details>
