Fix 🎯 #11743 - type `copy_tags_to` as an iterable of tag associations and test that nested element tags survive an HDCA copy.

| #11743 item | `dev` | This PR |
| --- | --- | --- |
| Type `copy_tags_to`, iterable only | untyped; still accepts a dict | `Iterable[ItemTagAssociation] \| None`, dict branch removed |
| Preserved tags in tool actions as an iterable | passed as `.values()` since #10761; still a dict | still a dict (see below), values typed `ItemTagAssociation` |
| Test for #10230 (fixed in #10761) | no test | API test on a `list:paired` HDCA copy |

#10761 fixed collection elements losing their tags when an HDCA is copied to another history, but no test on `dev` checks element tags after an HDCA copy, so its `copy_tags=element_object.tags` in `DatasetCollectionElement.copy_to_collection` could be dropped unnoticed. The new `test_hdca_copy_preserves_nested_element_tags` tags the inner forward dataset of a `list:paired` with `name:` and `group:` tags, copies the HDCA to a second history, and checks the copied inner dataset is a new dataset in the new history with the same tags. With that line removed it fails with `assert [] == ['group:condition:a', 'name:sample1']`.

***No runtime behaviour changes. Every caller of `copy_tags_to` and `HDA.copy(copy_tags=...)` already passes `<obj>.tags` or `preserved_tags.values()`, so the removed dict branch was dead.***

***The dict branch came from #11741, when model-operation tools passed the preserved-tags dict as `copy_tags`. Since 2021 they pass `<obj>.tags`, and with the new type mypy rejects a dict there instead of it failing at runtime.***

***`preserved_tags` stays a dict on purpose. It also goes to `collections_manager.create(tags=...)`, which treats a list as user tag strings, so only its type is narrowed.***

<details><summary>Typing details</summary>

- `ItemTagAssociation` declares `tag_id: Mapped[int | None]` and `value: Mapped[str | None]` without `mapped_column`, the same way it already declares `user_tname`, so mypy can check `copy_tags_to`. All 10 subclasses already define both columns. Their `tag_id` annotations become `Mapped[int | None]` to match `nullable=True`, and their mapped tables are unchanged.
- `CollectedToolInputs.preserved_tags`/`preserved_hdca_tags` and `OutputCollections(tags=, hdca_tags=)` go from `Any`/untyped to a new `PreservedTagsT = dict[str | None, ItemTagAssociation]`, keyed by tag value, which can be `None`.

</details>

<details><summary>Related cleanups</summary>

- `ModelOperationToolAction` no longer passes `tags`/`hdca_tags` to `tool.produce_outputs`. No `produce_outputs` reads them, and they were the last place the preserved-tags dict could reach an HDA `copy`.
- `DatasetCollectionManager._append_tags` copies the tags dict before adding implicit input tags, so it no longer changes the caller's dict. `create()` no longer assigns its `None` result (or `add_tags_from_list`'s) to `tags`. No current caller passes both a dict and implicit inputs, so behaviour is unchanged.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Builds on 🔀 #10761, which fixed #10230. The issue came out of review on 🔀 #11741.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Nothing changes for users. If the test fails, a developer sees `assert [] == ['group:condition:a', 'name:sample1']`.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The test reads the copied inner dataset's tags through the API.
- [x] Are the comments free of excess archeology? Yes. The diff adds no comments.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `lib/galaxy_test/api/test_history_contents.py::TestHistoryContentsApi::test_hdca_copy_preserves_nested_element_tags` is new. It fails when #10761's `copy_tags=element_object.tags` is removed and passes with it.
- Existing tests don't reach that line with tags to check. `test_hdca_copy_and_elements` doesn't look at tags. A history copy (`test_copy_history_does_not_duplicate_tags`) copies element datasets with `copy_tags_from` first, then reuses them through `minimize_copies`, so it never goes through `copy_to_collection`'s copy.
- The typed `preserved_tags.values()` path is already covered by `test_tag_auto_propagation` in `test_workflows.py`.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
