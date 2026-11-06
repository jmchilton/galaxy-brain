# Initial review: #24719

- Profile: default
- Model: claude-opus-5-5
- Effort: medium
- Reviewed commit: e2c3677d3ae (diffed against merge-base ff1608a4d67 with origin/dev)

Verdict: sound, small change. `effective_storage_duration` is a good extraction and preserves `new_target` behavior exactly. One real gap: the Recent Exports page linked from the dialog text still assumes 24 hours, so on the servers this PR targets the two now disagree. The rest is minor.

Reviewed statically. The worktree has no `.venv` or client `node_modules`, so no tests were run.

## P2

### P2 1: Recent Exports contradicts the dialog's lifetime

The dialog now states the server's lifetime, then sends the user to Recent Exports ("Your exports are also listed under Recent Exports"). That page still uses a hard-coded 24 hours for the same export. The PR description defers the history and invocation wizards but not this page.

`DownloadItemCard.vue` picks `useShortTermStorageMonitor()` for `short_term_storage` records. Its `expirationDate` and `hasExpired` come from `DEFAULT_EXPIRATION_TIME = 24h` in `client/src/composables/shortTermStorageMonitor.ts:7`, passed through `usePersistentProgressTaskMonitor`.

- With `short_term_storage_default_duration: 172800` (the PR's manual test): the dialog says "usually after 2 days". The card says "Expires in 24 hours", then shows Expired at 24h and removes Copy Link and Download while the link still works.
- With `short_term_storage_maximum_duration: 3600`: the dialog says "usually after 1 hour". The card keeps showing Ready, "Expires in 23 hours", Copy Link and Download after the server has deleted the file.

Before this PR both surfaces gave the same (possibly wrong) answer. Now the app contradicts itself about one link.

Fix: derive the monitor's `expirationTime` from `short_term_storage_effective_duration`, falling back to 24h when the key is missing. `useGenericMonitor` takes a plain number, so this needs a value available once config has loaded, or a getter. Precedent for real expiry: `client/src/components/Common/models/exportRecordModel.ts` computes it from the per-request `duration`. `useShortTermStorageMonitor` is also used by `StsDownloadButton.vue` and `InvocationExportWizard.vue`, which would benefit too. A smaller option, if the author prefers, is to call this out as deferred alongside the wizards.

## P3

### P3 1: `REUSE_FOR_MS` assumption can now be replaced with the real lifetime

`ExportToAnotherGalaxyDialog.vue:28-29` reuses a link for one hour, with the comment "Well inside the shortest storage duration a server is likely to use". The dialog now has the actual lifetime, and it is the setting this PR makes visible. With `short_term_storage_maximum_duration: 1800`, reopening an item at 45 minutes can show a link already deleted by cleanup, next to text saying it lasts "usually after 30 minutes".

Fix: cap the window from the config value, e.g. `Math.min(REUSE_FOR_MS, effective * 1000 / 2)`, and drop the guess from the comment. This needs a numeric lifetime alongside the formatted `linkLifetime`.

### P3 2: Tests cover config wiring at the wrong layer

- `test/unit/app/managers/test_ConfigSerializer.py` calls the serializer lambda against a `SimpleNamespace`. Its cases repeat rules already pinned by `test_effective_duration_matches_new_targets`, so it only guards argument order.
- `lib/galaxy_test/api/test_configuration.py` only sees the default configuration, and hard-codes `86400`, so it also assumes the server under test uses the default.
- Nothing exercises non-default `galaxy.yml` values through the real app, which is the case the PR exists for.

Fix: replace the serializer unit test with an integration test that sets default and maximum through `handle_galaxy_config_kwds` and asserts the API value. Ideally it also checks that a real `prepare_store_download` target gets the same duration, which would back the PR's "cannot drift" claim end to end.

### P3 3: Rounding to nearest can understate exposure

`formatDurationSeconds` rounds to nearest, so 3.4 days (293760s) reads "3 days" and 83 minutes reads "1 hour". This text is a consent warning ("Anyone with this link can download... It can't be withdrawn before then"), so understating is the wrong direction. Low impact: typical values are round numbers and the text says "usually". Separately, 3599s reads "60 minutes".

Fix: use `Math.ceil` for hours and days, and add a case to `duration.test.ts`.

## Considered, no finding

- Anonymous exposure of `short_term_storage_effective_duration`: only a retention setting. It reveals nothing about any user or link, and storage request ids are unguessable. No security concern.
- Serializer reads `app.config` rather than the manager's config: `lib/galaxy/app/__init__.py:785-790` drops unset values, and `effective_storage_duration` treats `None` and `0` the same, so results match.
- Custom formatter vs date-fns: `formatDuration` would not give the "24 hours" form the PR wants. The helper could live in `utils/dates.ts`, but a separate file is fine.
- `uploadMethodRegistry.ts:175` tip ("24 hours by default"): shown on the importing server about another server's link, so local config would be the wrong source and the text stays accurate.
- "usually" wording: still right. Files are deleted by a periodic task (`short_term_storage_cleanup_interval`, default 3600s), so a link can outlive its duration.
- Explicit request durations: the dialog sends no `duration`, so the effective default applies to its exports.
- Key name, and leaving history/invocation wizards for later: decided in the PR description.
