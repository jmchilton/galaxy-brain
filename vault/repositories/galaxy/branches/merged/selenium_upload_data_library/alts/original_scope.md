# selenium_upload_data_library_alt_original_scope

Head `aa8326448f9` on `jmchilton`. It's the branch before the scope evaluation's expansion, and has two Baseline tests commits:

- API library setup and multi-dataset staging
- the other-user test and the list-into-picked-history test

It differs from the parent in two ways. `UploadContext.start()` doesn't wait for an enabled Start button, and there's no test for folder navigation or select-all in `DataLibraryUpload`.
