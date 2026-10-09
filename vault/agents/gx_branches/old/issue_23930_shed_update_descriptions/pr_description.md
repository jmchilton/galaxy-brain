Fix 🎯 #23930 - updating a Tool Shed repository (e.g. `planemo shed_update`) puts the long description in the short description.

What `PUT /api/repositories/{id}` stores for `synopsis="short"` and `description="long"` (what planemo and bioblend send):

| Stored field | `release_26.1` | This PR |
| --- | --- | --- |
| Short `description` (the synopsis) | `"long"` ❌ | `"short"` ✅ |
| `long_description` | unchanged ❌ | `"long"` ✅ |

The API and the model give the two fields different names. In the API, `synopsis` is the short text and `description` is the long text. In the model, `description` is the short text and `long_description` is the long text. `create_repository` maps between them. The 2.0 update endpoint passed the request to `update_validated_repository` without mapping, so the long text overwrote the short description, `synopsis` was dropped, and `long_description` was never set. This PR renames the keys the same way `create_repository` does.

***This is a regression in 26.1, when the Tool Shed 2.0 API became the only API. It isn't a client change.*** The 2.0 update endpoint, opt-in since 24.2, never mapped these fields, but the v1 `update()` it replaced did. Planemo has sent these field names since 2015, and bioblend sends the same ones. ***No known client sends `description=` meaning the short text, so no client changes are needed.*** ***A repository whose short description was overwritten is fixed by its next `planemo shed_update`; this PR doesn't rewrite stored data.***

<details><summary>Why tests didn't catch it</summary>

- The 2.0 endpoint was added by `1a7e5d1df9f` ("Restore repository update in the tool shed 2.0"). Its tests checked only `homepage_url` and categories. A default deployment kept serving v1 (`TOOL_SHED_API_VERSION` defaulted to `v1`) until `81475072313` made v2 unconditional for 26.1.
- `test_0000...::test_0020` edits both descriptions with the correct API names, but it reverts the edit and never checks what was stored.
- `test_admin_can_manage` sent `description=` and asserted on the short `description`, so it depended on the bug. It now sends `synopsis=`. What it tests (a repository admin can update the repository) is unchanged.

</details>

## Risks

Risks are minimal - the request schema is unchanged, and the endpoint now stores fields the way every existing client already expects (a two-way door).

<details><summary>Risk Details</summary>

- A client written against the 2.0 endpoint that sends `description=` expecting the short text would now set the long description instead. Planemo, bioblend and the Tool Shed frontend don't do this; the frontend never calls this endpoint.

</details>

## Context

Targets `release_26.1`: the bug first reached default deployments in 26.1, and toolshed.g2.bx.psu.edu runs 26.1.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Nothing new: invalid input still gets a 422, and name or permission errors are unchanged. If only one field is sent, only that field changes.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The new test sends both fields, then reads the repository back with a fresh GET and checks both stored values.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- New `test_update_repository_descriptions` in `lib/tool_shed/test/functional/test_shed_repositories.py`. On `release_26.1` it fails with `'new long description' == 'new synopsis'`, which is the symptom in the issue.
- All 38 tests in `test_shed_repositories.py` pass.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
