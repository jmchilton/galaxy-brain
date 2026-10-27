- [x] P2 1: Every existing Pulsar job fails on the pinned pulsar-galaxy-lib, staging or not
- [x] P2 2: Input metadata files are still pulled into the handler's cache
- [x] P2 3: `object_store_staging` is validated late and re-checked as a raw string
- [x] P2 4: Redirect-mode Pulsar job tests don't prove the redirect was used
- [x] P2 5: Runner staging unit tests are built on `object.__new__` and `SimpleNamespace` fakes
- [x] P2 6: Duplicated static running-job helper in integration tests
- [x] P3 1: `JobObjectStagingManager` duplicates `JobFilesManager`'s active-job and purged-input checks
- [x] P3 2: The runner imports URL construction from `galaxy.managers`
- [x] P3 3: `staged_input` switches modes with `head`/`redirect` flags and returns a "one field set" dataclass
- [x] P3 4: Unit tests that duplicate the integration tests

Other Actions:
