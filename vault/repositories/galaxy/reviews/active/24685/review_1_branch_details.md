Branch `pr_24685_review_1`, from reviewed commit `150cb834122`, adds browser coverage for the one link whose wiring changed, the `BreadcrumbHeading` link, by going back through it in `test_history_storage_accessibility`. It also moves the new `CollectionCreatorIndex` spec to MSW instead of mocking the API module. The `CollectionCreatorIndex` GLinks lose a no-op `.prevent`. There are no other production changes.

- `ea64e090b21` Drop no-op .prevent from CollectionCreatorIndex GLinks: `@click.stop.prevent` becomes `@click.stop` on "Try again" and "Create another collection".
- `117807a746e` Cover BreadcrumbHeading navigation in storage dashboard E2E: adds a `storage_dashboard.breadcrumb_link` selector and clicks it from `StorageManager` in place of the second masthead navigation.
- `d0d1f133a99` Mock the collection create API with MSW in CollectionCreatorIndex spec: failure and success now go through the real API function, using `useServerMock`.
