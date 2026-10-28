Run via Claude Opus 5.5 at medium effort.

- [x] What does the user see when it fails? Admins get a startup `ValueError` naming `direct_download_expires_in` for non-integer or non-positive values; users following an expired URL get the provider's own expiry error.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They assert the lifetime each SDK signing call (boto3 `ExpiresIn`, boto `expires_in`, Azure SAS `expiry` delta, cloud `generate_url`) receives, plus `to_dict()` and the rejection of `0` and `1h`, for default and configured values in both XML and YAML.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `0155f4a0721` pins the old lifetimes (boto3/azure 3600, s3 86400; cloud 86400 was already pinned), and `f7525a9787d` changes the s3/cloud expectations to 3600 with the behavior change.
- [x] Are the comments free of excess archeology? Yes. New comments are `# seconds` and the sample-config docs. The old `# 24hrs` comments were removed along with the literals.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
