John asked for a breakdown of what caused these two regressions, and whether this PR backs out the recent fixes or narrows them. In short, it narrows both of them and backs out neither. Neither seems worth a tool profile gate.

**Chopin2 / `comment_lines`**

- **Cause:** #24357 (`72dcfbe09dd`) made `comment_lines` an `IntParameter`. `MetadataToolOutputAction.apply_action` always calls `.split(",")` on `default`, so `default="7"` arrives as `["7"]`. That list is rejected, and the job fails at creation.
- **Not caused by the follow-up bool/float check (`f9c022e2d6e`).** A list already fails `int()` without it.
- **Branches:** #24357 went into `release_25.1`, so this is already broken on the 25.1, 26.0 and 26.1 heads as well as 26.2. tools-iuc CI pins `release_26.1`, so the green 26.1 runs predate the forward merge. No release tag contains it yet.
- **Other wrappers:** CAT (7 outputs) and arriba use the same `comment_lines` action and fail the same way.
- **The old behavior wasn't doing anything.** `Tabular.set_meta` always recounts `comment_lines` from the file at job finish (`tabular.py:577`), so the action's value never survived to an `ok` dataset. The tools only need the action not to crash.
- **Backing out or narrowing:** narrowing. Values are still stored as ints, as #24357 intended. The singleton-list unwrap applies to every `IntParameter` caller, but it's a reasonable release-branch stopgap. The root cause is the type-blind comma split in `apply_action`, which already has a TODO for this. Splitting based on the element's metadata spec would be a good follow-up on dev.
- **Profile gate:** not worth it. Nothing depends on the stricter behavior.
- **Suggestion:** split the `metadata.py` change and its tests into a PR against `release_25.1`, so the fix reaches 25.1 through 26.1 before their next point releases.

**BayeScan / `sel`**

- **Cause:** #23866 (`a43a281d4fa`) changes any output extension that isn't a registered datatype to `data` when the job finishes. `sel` was never registered, so BayeScan's `ftype="sel"` test assertion now sees `data`. This exists only in 26.2 and dev.
- **Backing out or narrowing:** neither. Registering `sel` keeps #23866's rule as it is.
- **Profile gate:** feasible, but it would amount to a revert. BayeScan and the unzip case #23866 was written to fix (#22648) both rely on the extension captured from a `discover_datasets` pattern. A gate that spares BayeScan also leaves unzip unfixed until the tool bumps its profile.
- **Long term:** the wrapper itself is invalid. Galaxy's `ValidDatatypes` linter already reports `ftype="sel"` as an error. About 15 other formats declared in tools-iuc aren't registered and now silently become `data`, for example emboss formats, `pickle`, `plink` and `ps`. Only `sel` has a tool test asserting the format, so it's the only one that fails visibly. Registering `sel` is a fine compatibility shim. Fixing the wrappers is the lasting fix.

***Posted by agent [gx_reviews](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_reviews/AGENTS.md) using model Claude Opus 5.5 on John's behalf.***
