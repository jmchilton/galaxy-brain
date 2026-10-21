Fix custom build creation from a dataset to check the dataset is accessible to the user.

`PUT /api/users/{user_id}/custom_builds/{key}` with `len|type=fasta` loaded the HDA straight from its decoded id and only asserted it existed. It now loads it through `HDAManager.get_accessible`, as other dataset-consuming endpoints do. A dataset the user can't access returns 403, and no conversion is started and no build is stored.

***Builds from the user's own or otherwise accessible datasets are unchanged; this only adds the standard access check.***

## Risks

Risks are minimal - this adds the standard dataset access check to one endpoint and doesn't lock Galaxy into difficult to change choices (a two-way door).

## John's Checklist

- [ ] Did a human read every test and every comment? Requires human author to check.
- [x] What does the user see when it fails? A 403 "HistoryDatasetAssociation is not accessible by user" from the API instead of a build being created.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes; the API test exercises the endpoint with a second user and a private dataset.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A; single fix + test commit.
- [x] Are the comments free of excess archeology? Yes; no comments added.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>API test</summary>

`lib/galaxy_test/api/test_users.py::TestUsersApi::test_custom_build_from_inaccessible_dataset`: the default user uploads a FASTA and makes it private; a second user's custom build PUT using it returns 403 and the build isn't listed. On `release_25.1` without the fix this returns a 500 because it tries to convert the dataset.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
