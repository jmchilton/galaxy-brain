- `kind/bug`
- `area/dataset-collections` - the fix is in the shared collection-creation composables and `ListWizard`.
- `area/libraries` - the reported bug is library Add to History > as a Collection.
- `area/UI-UX` - the bot applies it for any `client/src` change; client-only fix.
- `area/testing/selenium` - three new E2Es and helper changes in `navigates_galaxy.py`.

Bot's `area/libraries` glob (`client/src/components/LibraryFolder/**`) misses the moved `Libraries/LibraryFolder/` path, so add it by hand.
