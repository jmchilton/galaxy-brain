- [x] P2 1: boto3 missing object raises ClientError, not ObjectNotFound
- [x] P2 2: S3 behavior only tested against mocked client
- [x] P3 1: size <= 0 sends invalid Range to S3
- [x] P3 2: Azure head read may download up to 32 MiB
- [x] P3 3: fallback tests patch away boto3's override
- [x] P3 4: ClientError imported inside test functions

Other Actions:
