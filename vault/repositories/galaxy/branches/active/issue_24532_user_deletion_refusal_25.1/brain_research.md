```yaml
documents:
  - path: vault/research/Component - UI Error Handling.md
    why: Explains the backend MessageException JSON shape ({err_msg, err_code}), that err_code is the numeric 6-digit code (e.g. 403004), not the HTTP status, and how openapi-fetch surfaces it on the client.
    load_when: Choosing the CONFIG_DOES_NOT_ALLOW constant value/location and deciding how to render the message.
  - path: vault/repositories/galaxy/issues/queued/24532/proposal.md
    why: The issue's proposed fix (named constant plus regression test) and the release_25.1 note that the 403 branch never assigns deleteError.
research_requests: []
```
