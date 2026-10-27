No refactoring of the base branch was performed.

This pass looked again at all four commits on the `d2d1dcd883c` (release_26.2 merge-base) base, including the two added since `earlier_drafts/1`. History is unchanged: head is still `344dc3d6b17`, there was no rebase and no force-push, and `jmchilton/selenium_upload_data_library` matches it.

## Candidates considered

- **`LibraryPopulator.remove_library_dataset_restrictions` extraction** (`populators.py` plus the `test_history_contents.py` call site, in `1024890c3b2`). This is the only pure refactor of base code. Moving it below the tests would either put a non-"Baseline tests" commit first, which breaks the keep-first rule, or mislabel a refactor as "Baseline tests". It's about 10 lines and commit 1's message already names it, so it stays.
- **`data_library_select_all` selector fix** (`f777c86f911`). Its first caller is in the same commit. Splitting it out would make a commit that adds an unused selector.
- **`start()` waits on `start_button_enabled`** (`344dc3d6b17`). This is the branch's one non-baseline change and it isn't a refactor. It depends on the `start_button_enabled` target added in `1024890c3b2`, so it stays last.
- The rest of `1024890c3b2`'s helper changes (multi-dataset staging, API library setup, staged screenshot) were already isolated from the net-new tests by the earlier split. Each has a caller in its own commit.

## Verification

- `git rev-parse HEAD~4` == `d2d1dcd883c`.
- History wasn't rewritten, so the both-backends rerun wasn't required. As a sanity check, `TestUploadActivityDataLibrary` ran under Playwright against gunicorn 8092 + Vite 5181: 3 passed (81s).
