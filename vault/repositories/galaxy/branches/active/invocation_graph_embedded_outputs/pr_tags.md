- `kind/feature`
- `area/UI-UX`
- `area/workflows`

The labeler would add `area/UI-UX` (client sources), `area/database` (`lib/galaxy/model/`), `area/testing`, `area/testing/api` and `area/testing/selenium`. `area/database` is dropped: the model change is a property over an existing JSON column, with no migration or schema change. The testing labels are dropped as incidental. `area/workflows` isn't from the labeler (no `lib/galaxy/workflow` change) but is central: a new workflow step field, the workflow editor and the invocation view. Same set as stages 1 and 2.
