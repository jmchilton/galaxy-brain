Run via Claude Opus 5.5 at high effort.

**Recommendation: keep as implemented (post-rescope).** The branch delivers the issue's preferred fix 2 (per-store `direct_download_expires_in`, default 3600, all four presigning backends, sample doc) and now routes both direct-download XML knobs through one `parse_direct_download_config_from_config_xml` helper - the general piece eval 1 asked for. The two other eval-1 items were declined with sound reasons I agree with: a 604800 cap is S3-SigV4-specific (wrong as a global ceiling), and the example ymls back default-lifetime tests. No further same-file related bug remains: the other `_get_object_url` lifetimes (axel 7200, irods/pithos/rucio/onedata) are not client-facing direct downloads. Per-call override (#24484) and API-model exposure stay out of a release-branch PR.

No security issues needing a private report. Prod diff ~35 lines (<100), so no decomposition section; baseline commit `edcff857f56` already splits off cleanly.

## Scope A - As implemented (recommended)

Config on `ConcreteObjectStore` (validated >0, in `to_dict`), one XML helper merged into s3/boto3/azure configs (cloud via s3), all four `_get_object_url` use it, sample YAML documents it; baseline tests pin old lifetimes first.

| Pros | Cons |
|---|---|
| - Closes issue incl. preferred fix<br>- One parse home for future direct-download knobs<br>- Small, mirrors `enable_direct_download` pattern | - `parse_enable_direct_download_from_config_xml` now only called by the new helper (could inline; nit)<br>- No ceiling; S3 rejects >7d URLs at fetch time |

## Scope B - Minimal (issue fix 1)

Change the two 86400 constants to 3600; no config.

| Pros | Cons |
|---|---|
| - Two-line backport | - Issue calls it lesser fix; discards reviewed work |

## Scope C - Add provider-aware ceiling

Reject >604800 only in s3/boto3/cloud stores (not Azure account-key SAS).

| Pros | Cons |
|---|---|
| - Turns latent fetch-time failure into startup error | - Per-backend validation scattered; generic_s3/MinIO limits differ<br>- Unverified provider limits; rescope already declined a global cap<br>- Admin misconfig, not a bug in touched code - fine as reviewer-requested follow-up |

## Scope D - Per-call `expires_in` override (#24484 tie-in)

`get_direct_download_url(..., expires_in=None)` falling back to store setting.

| Pros | Cons |
|---|---|
| - Issue's stated end state | - #24484 does this on dev; would conflict<br>- Natural rebase follow-on; mention in PR body |

## Scope E - Expose lifetime in `ConcreteObjectStoreModel` / API docs

Add field to pydantic model; mention lifetime in `DIRECT_DOWNLOAD_REDIRECT_RESPONSE`.

| Pros | Cons |
|---|---|
| - Users see exposure window | - Schema + client typings regen on release branch; no consumer asks |

## Scope F - Uniform lifetimes for other URL sites

axel 7200 in `s3.py`; irods/pithos/rucio/onedata `_get_object_url`.

| Pros | Cons |
|---|---|
| - Uniform story | - axel is internal fetch; others don't support `enable_direct_download` |
