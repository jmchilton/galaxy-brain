The proxy now preserves the fields needed for a complete tool-call conversation, and omission of empty tools and missing options looks correct. The running-server regression tests cover the request validation and Galaxy policy boundaries well.

I ran the full plugin integration module: 22 tests passed. Four additional checks using the real OpenAI SDK with an in-memory HTTP transport also passed, including serialized message metadata, false-valued options, omission, and streaming usage. No actionable findings.

## Risks

Risk is low: this is easy to roll back, although plugins may come to rely on the newly supported request fields. There are no migrations or stored-data changes. Configured providers still determine which options and message extensions they accept; no live provider was tested.
