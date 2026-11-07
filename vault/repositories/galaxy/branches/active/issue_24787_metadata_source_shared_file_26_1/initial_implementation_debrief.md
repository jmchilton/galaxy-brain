# Initial implementation debrief

```
implementation @ 70790a281ceb vs origin/release_26.1 (merge-base 1f3b0a8e7a82)
first snapshot: 2 commits, 5 files, 6 hunks
```

`FileParameter.make_copy` no longer takes an id-less `MetadataFile` from a different `Dataset`. It returns `None`, and `set_meta` generates the output's own file, matching what the `directory` strategy already does.

## Base: `release_26.1`, not older

The test suite passes 12/12 on `release_25.1` at `de6cd44b812`. `807c53fc441` (in 26.1, not 26.0) put a collection's `metadata_source` in the job-side output definition and gave the job-side context a real provider. Before it, the job side never received the name. So the bug dates from 26.1, which the issue's History section and its "when this started" item don't record. 26.0 is by ancestry only; the tests couldn't run there with the 25.1 venv.

## Choices

- Compare `Dataset`s, not dataset instances. Copies of a dataset share a `Dataset`, and they keep the old behaviour.
- Return `None` rather than falling through to the copy path. Falling through calls `object_store.exists()` on a Dataset with no id, which breaks discovery if a distributed store has a `store_by: id` backend. Found in review, pinned by `TestMetadataSourceDiscoveredExtendedMixedStoreBy`.

## Not done

- Existing duplicate rows and overwritten indexes aren't repaired, and already-affected outputs still resolve to the input's row.
- pgcleanup's `RemovesMetadataFiles` doesn't guard against removing a file another row names. The issue's direction mentions this and #24745's review branch has a guard.
- `extended_celery` and remote object stores weren't run.

## Environment

`run_tests.sh` doesn't work in this venv (no pip) and pytest needs `-p no:postgresql` (no libpq). Bootstrap's Playwright install fails on Ubuntu 26.04; nothing here needs it.
