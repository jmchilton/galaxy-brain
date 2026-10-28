# galaxy#24550 — Direct-download URLs from aws_s3, generic_s3 and cloud object stores last 24 hours, not the documented ~1 hour

[Issue](https://github.com/galaxyproject/galaxy/issues/24550)

Presign lifetimes hardcoded per backend (1 h boto3/Azure, 24 h legacy S3/cloud) vs "~1 hour" docs. **Recommendation:** post; reproduced, reviewed.
