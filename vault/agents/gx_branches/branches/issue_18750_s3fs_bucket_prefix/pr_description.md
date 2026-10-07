Fix 🎯 #18750 - an S3 file source whose bucket is written as `s3://bucket` or `bucket/` browses fine, but every import fails with "The specified key does not exist".

| Bucket configured | Browsed URI on `dev` | Import on `dev` | This PR |
| --- | --- | --- | --- |
| `genomeark` | `gxfiles://test1/data_use_policies.txt` | ✅ | ✅ unchanged |
| `meeo-s3/NRT` (key prefix) | `gxfiles://test1/catalog.json` | ✅ | ✅ unchanged |
| `s3://genomeark/` (#18750) | `gxfiles://test1/genomeark/data_use_policies.txt` | ❌ | ✅ |
| `s3a://genomeark` | `gxfiles://test1/genomeark/data_use_policies.txt` | ❌ | ✅ |
| `genomeark/` | `gxfiles://test1/genomeark/data_use_policies.txt` | ❌ | ✅ |
| `meeo-s3/NRT/` (Galaxy's sample conf) | `gxfiles://test1/meeo-s3/NRT/catalog.json` | ❌ | ✅ |

❌ = the listing works, then import asks S3 for the bucket path twice (`genomeark/genomeark/...`) and fails with "The specified key does not exist".

The reporter of #18750 entered `s3://1000genomes` into the AWS public bucket template, which is how AWS writes bucket URIs. The thread worked around it by telling them to drop the prefix. Galaxy's own `file_sources_conf.yml.sample` has the trailing-slash form in two entries (`meeo-s3/NRT/`, `meeo-s5p/RPRO/`), so an admin who copies them gets the same failure.

The fix normalizes `bucket` with a Pydantic `before` validator (`S3FSConfigMixin`) that strips an `s3://` or `s3a://` prefix and surrounding slashes. It mirrors `FtpConfigMixin`, and covers the user template models and the s3fs plugin configuration.

***Buckets with a key prefix (`meeo-s3/NRT`) keep working; only the scheme and surrounding slashes are stripped.***

***Admin `file_sources_conf.yml` entries are normalized too: plain bucket names are unchanged, and `s3://` or trailing-slash entries, including the two in the sample conf, start importing.***

***Already-saved user file sources with `s3://` in the bucket start working without being re-entered, since a user source's template is resolved into a configuration each time it's used.***

***The thread's second request, stale listings (`listings_expiry_time`), already shipped in 24.2 as `file_source_listings_expiry_time` and the per-source `listings_expiry_time`; this PR doesn't touch it.***

<details><summary>Why browsing worked while import failed</summary>

s3fs strips the scheme and slashes when listing, so entries come back as `genomeark/data_use_policies.txt`. `S3FsFilesSource._adapt_entry_path` builds the Galaxy URI by removing `f"{bucket}/"`, which is `s3://genomeark//` or `genomeark//` for these buckets, so nothing is removed and the URI keeps `genomeark/`. Import prepends the bucket again.

</details>

<details><summary>Side effect: URL matching for admin-configured buckets</summary>

`S3FsFilesSource.score_url_match` compares a URL against `s3://{bucket}/`. With `bucket: s3://foo` an admin source previously compared against `s3://s3://foo/` and never claimed `s3://foo/...` URLs. It now matches them, which is what such a config meant.

</details>

This doesn't touch object store S3 buckets or the Google Cloud Storage file source's `bucket_name`.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Listed URIs for `s3://`, `s3a://` and trailing-slash sources lose the leftover bucket segment. URIs recorded with the old shape (e.g. deferred datasets) never imported before and still don't.
- An admin source with `bucket: s3://foo` now claims `s3://foo/...` URLs in `score_url_match`, so they use that source's credentials.

</details>

## Context

Builds on 🔀 #23497, which added `FtpConfigMixin` and `split_ftp_host_path` for FTP host normalization; `S3FSConfigMixin` and `normalize_s3_bucket` follow the same pattern beside them.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Other bad buckets (typos, `https://` URLs, uppercase `S3://`) still fail at browse time with S3's error, as before; the forms above no longer browse and then fail at import.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The network test lists a real public bucket configured three ways and realizes the listed entry.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `test/unit/files/test_s3.py::test_file_source_bucket_variant_realizes_listed_entry` lists the public `genomeark` bucket configured as `s3://genomeark/`, `s3a://genomeark` and `genomeark/`, and realizes the listed entry. On `dev` each case fails at the URI assertion with the bucket left in the URI.
- `test_s3.py::test_score_url_match_with_s3_scheme_bucket` (fails on `dev`: `0 == 14`), `test_bucket_keeps_key_prefix_from_sample_conf` (fails on `dev`: `'meeo-s3/NRT/'`) and `test_bucket_normalizes_s3_url` cover the plugin configuration offline.
- `test/unit/files/test_template_models.py::test_production_aws_public_bucket_strips_s3_scheme` resolves the production public bucket template with a user-entered `s3://1000genomes/`. It fails on `dev` with the prefix kept.
- `test/unit/util/test_config_template_validation.py::test_normalize_s3_bucket` covers the new helper's edge cases, including template expressions passing through untouched.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
