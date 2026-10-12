# Draft review for #24042 — request changes

The batching and compatibility fallback are clear, and the object-store suite passes locally (188 passed, 16 skipped), including all 21 new tests. I found one uncommon key-encoding regression worth preserving the old behavior for.

**[P2] Keep XML-incompatible extra-file keys on individual deletes** (`lib/galaxy/objectstore/s3_boto3.py:379–385`)

S3 supports keys with characters that cannot appear in XML 1.0, such as U+0001, and boto3's URL-encoded listing returns these intact. Passing such a key into `delete_objects` emits invalid XML: a `MalformedXML` response takes the non-fallback branch, leaving every key in that batch and skipping later batches. The previous individual-delete loop handles the same key through URL encoding. I reproduced this with a real boto3 client and a local XML-parsing HTTP service: the new method left both an ordinary key and a U+0001 key, while the old loop removed both. AWS documents the key restriction in [ListObjectsV2](https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html).

Could XML-unsafe keys use individual deletes while the remaining keys stay batched? A payload-specific malformed-XML fallback could also work, but should avoid permanently disabling batching for a capable endpoint. A real-client regression with both key types would cover it. This is an unusual filename case; no production prevalence is established, and ordinary-key deletion passed all checks.

## Risks

This is reversible at the implementation level, but the underlying deletes are one-way operations. The request-encoding edge case above is the main correctness concern; the existing paginator and key-prefix behavior stay unchanged, and partial-object failures are reported correctly. No live storage benchmark or live AWS compatibility test was performed.
