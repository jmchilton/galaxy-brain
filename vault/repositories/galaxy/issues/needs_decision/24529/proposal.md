# Creating a custom build from a FASTA dataset via the API fails with a 500 for API-key clients

Adding a custom build from a history FASTA dataset through the API fails with a 500 for any API-key request, because the FASTA → `len` conversion needs a current history and API-key requests don't have one.

```
PUT /api/users/{user_id}/custom_builds/fasta_build
{"name": "FASTA build", "len|type": "fasta", "len|value": "<id of an ok FASTA HDA>"}

→ 500
```

The same request from the UI works, only because the browser session has a current history. The server and dataset are fine: stock `datatypes_conf.xml.sample` ships the `fasta → len → linecount` converters.

<details><summary>Red API test (fails with 500 today)</summary>

```python
def test_custom_build_from_fasta(self):
    dataset_populator = DatasetPopulator(self.galaxy_interactor)
    user_id = dataset_populator.user_id()
    with dataset_populator.test_history() as history_id:
        hda = dataset_populator.new_dataset(
            history_id, content=">chr1\nACGT\n>chr2\nAC\n", file_type="fasta", wait=True
        )
        response = self._put(
            f"users/{user_id}/custom_builds/fasta_build",
            data={"name": "FASTA build", "len|type": "fasta", "len|value": hda["id"]},
            json=True,
        )
        self._assert_status_code_is(response, 200)
        dataset_populator.wait_for_history(history_id)
        builds = self._get(f"users/{user_id}/custom_builds").json()
        build = next(build for build in builds if build["id"] == "fasta_build")
        assert build["count"] == 2
```

For `lib/galaxy_test/api/test_users.py`.

</details>

<details><summary>Cause</summary>

- `lib/galaxy/webapps/galaxy/api/users.py` (`add_custom_builds`) calls `dataset.get_converted_dataset(trans, "len")` and `new_len.get_converted_dataset(trans, "linecount")` without `history=`.
- That reaches `converter.execute(..., history=None)`, so the tool action falls back to `trans.get_history(create=True)`, which is `None` for API-key requests.
- `lib/galaxy/tools/actions/__init__.py` `assert history` raises a bare `AssertionError`. The handler only catches `NoConverterException`, so it surfaces as an unhandled 500. Same code on `dev` and `release_26.2` (#24310 landed on 25.1 and merged forward).
- Tool-input implicit conversion in the same file passes `history=history`, so it doesn't hit this.

</details>

## Context

Bug discovered while working on 🔀 #24312 (E2E for adding a custom build from a FASTA), which had to drop its API happy-path test because of it. Bug related to 🎯 #24309 - its planned API test goes through the same PUT. Related to 🔀 #24310 - error handling on the same endpoint.

## Proposed Approach

Pass both `get_converted_dataset` calls an explicit `history=` owned by the requesting user: the FASTA's own history when `dataset.history.user == trans.user`, otherwise `trans.history` or the user's most recent history. The dataset is only checked with `hda_manager.get_accessible`, not ownership, so a FASTA from a shared or published history must not have conversion jobs written into someone else's history. For browser sessions on owned FASTAs, converted datasets land next to the FASTA instead of in the current history.

## Alternative Approaches

Always using the user's current/most recent history also works, but can drop conversion jobs into an unrelated history; preferring the FASTA's history when owned keeps outputs next to their input. It is still the fallback for accessible-but-not-owned FASTAs.

<details><summary>Alternatives In Detail</summary>

### Alternative: current history, falling back to most recent

<details><summary>Description</summary>

#### Details

`history=trans.history or trans.user.most_recent_history` style resolution.

#### Why the proposed approach is preferred

Owned FASTAs (the common case) get no surprise placement; this alternative is kept only as the fallback.

</details>

### Alternative: let the conversion run without a history

<details><summary>Description</summary>

#### Details

Make tool actions accept `history=None` for converters.

#### Why the proposed approach is preferred

Much wider change to tool execution; jobs and outputs assume a history.

</details>

</details>
