Run via Claude Opus 5.5 at high effort.

**Recommendation: expand modestly.** As implemented already covers the issue's "better" fix (per-store `direct_download_expires_in`, default 3600, all four presigning backends, sample docs). Add three small, same-file pieces: fold the two direct-download XML parses into one helper (thermo-nuclear's suggestion; it's the general piece the new knob belongs in), reject values above S3 SigV4's 7-day max (604800) so admins get a startup error rather than URLs that fail at fetch time, and set the knob in the `boto3_direct_download.yml`/`cloud_direct_download.yml` examples so the YAML path is exercised. Keep the per-call `expires_in` kwarg and API-model exposure out (#24484 targets dev; schema change on a release branch).

No security issues found needing a private report. Prod diff is ~30 lines (<100), so no decomposition section.

## Scope A - As implemented

Config key on `ConcreteObjectStore` (validated >0, in `to_dict`), XML classmethod parse wired into s3/boto3/azure (cloud via s3), all four `_get_object_url` read it; sample YAML documents it; baseline tests pin pre-change lifetimes.

| Pros | Cons |
|---|---|
| - Fully closes issue incl. its preferred fix 2<br>- Mirrors `enable_direct_download` pattern exactly<br>- Baseline commit splits cleanly | - Two parallel XML parse classmethods for one feature (3 sites x 2 keys)<br>- Accepts values S3/SigV4 can't honor (>604800) - silent breakage at download time<br>- Example ymls don't show the knob |

## Scope B - Minimal (issue fix 1)

Change the two 86400 constants to 3600; no config.

| Pros | Cons |
|---|---|
| - Two-line diff, trivially backportable | - Issue itself calls it the lesser fix<br>- Throws away done, reviewed work<br>- Admins can't tune exposure window |

## Scope C - Modest expansion (recommended)

A + one `parse_direct_download_config_from_config_xml` returning `{enable_direct_download, direct_download_expires_in}` `**`-merged in azure/s3/s3_boto3; upper bound 604800 in `ConcreteObjectStore.__init__`; knob added to the two direct-download example ymls (+ a parse assertion from YAML).

| Pros | Cons |
|---|---|
| - One home for future direct-download knobs<br>- Turns a latent runtime failure into a config error<br>- Small, same files, same tests | - Touches pre-existing `enable_direct_download` parse lines on a release branch<br>- 7-day cap is S3-specific (Azure SAS has no hard cap) - but a global ceiling is a sane hardening default |

<details>
SigV4 presigned URLs are capped at 7 days; boto3 generates longer ones without error but S3 rejects them. Azure user-delegation SAS caps at 7 days too; account-key SAS doesn't. A single ceiling keeps behaviour uniform; if reviewers dislike it, drop the cap and keep the helper + examples.
</details>

## Scope D - Per-call `expires_in` override (issue's #24484 tie-in)

`get_direct_download_url(..., expires_in=None)` falling back to the store setting, so Pulsar staging can ask for 900 s.

| Pros | Cons |
|---|---|
| - Matches issue's stated end state | - #24484 is open against dev and does exactly this threading; conflicts<br>- Leaks kwarg into irods/pithos/rucio/pulsar signatures (debrief reason)<br>- Natural rebase follow-on once #24484 lands - note it in the PR body |

## Scope E - Expose in `ConcreteObjectStoreModel` / API

Add `direct_download_expires_in` to the pydantic model so the client can show link lifetime.

| Pros | Cons |
|---|---|
| - Users see exposure window next to `enable_direct_download` | - API schema + client typings regen on release branch<br>- No consumer asks for it; better as dev follow-up |

## Scope F - Also cover other URL sites (axel 7200 in `s3.py`, irods/pithos/rucio/onedata `_get_object_url`)

| Pros | Cons |
|---|---|
| - Uniform URL lifetime story | - axel URL is internal fetch, not client-facing<br>- Other backends don't support `enable_direct_download`; nothing to configure |
