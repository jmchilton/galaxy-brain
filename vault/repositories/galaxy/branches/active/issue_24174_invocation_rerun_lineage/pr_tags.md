- `kind/feature`
- `area/workflows`
- `area/database`
- `area/API`
- `area/UI-UX`

The labeler would add `area/UI-UX` (client sources), `area/database` (`lib/galaxy/model/`), `area/testing`, `area/testing/api` and `area/testing/selenium`. `area/database` stays: it adds a column, a self foreign key, an index and a migration. `area/API` isn't from the labeler (no `lib/galaxy/webapps/galaxy/api/` change), but the invoke payload and invocation responses gain public fields. `area/workflows` isn't from the labeler either, but is central: workflow invocations and both run forms. The testing labels are dropped as incidental.
