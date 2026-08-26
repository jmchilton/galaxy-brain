This is a focused hardening change that came out of reviewing
[galaxyproject/galaxy#23277](https://github.com/galaxyproject/galaxy/pull/23277). It intentionally
does not attempt to address the larger authentication and authorization design for the compute-side
recryptor.

## The problem

The shared FastAPI application currently installs this CORS policy for both service modes:

```python
allow_origins=['*']
allow_credentials=True
allow_headers=['*']
```

The two modes have different browser-facing requirements:

- **User mode (Service A)** is called from Galaxy in the user's browser and performs an operation
  backed by the user's local private key. It needs CORS, but only for the Galaxy origins the user or
  administrator explicitly trusts.
- **Compute mode (Service B)** is called by the compute-side Galaxy process. It has no browser client
  and should not expose a cross-origin browser API.

The wildcard user-mode policy means any website can make an `application/json` preflight succeed and
read the service's response. Removing `allow_credentials` alone would not fix that: with
`allow_origins=['*']`, Starlette would still return `Access-Control-Allow-Origin: *` for these
unauthenticated endpoints.

## What this PR changes

### CORS is user-mode only

The shared application no longer installs CORS middleware globally. User mode installs it from its
own settings; compute mode never installs it and has no CORS setting to accidentally enable.

### User mode is fail-closed by default

User mode adds an `allowed_origins` list whose default is empty. With no configured origins, no CORS
middleware is installed and cross-origin browser access is unavailable.

To enable the Galaxy browser flow, configure the exact Galaxy origin in
`c4gh_recryptor_user/c4gh_config.yml`:

```yaml
allowed_origins:
  - https://galaxy.example.org
```

This is an intentional behavior change: existing user-mode installations must configure their
Galaxy origin before the browser flow will work after upgrading.

### Origins are exact and narrowly validated

Configured origins must:

- use `http` or `https`;
- include a hostname and optional port;
- contain no wildcard, path, query, fragment, or embedded credentials;
- match the browser origin exactly, with no trailing slash.

The middleware also disables credentialed CORS and restricts non-safelisted request headers to
`Content-Type` instead of accepting every header.

## Security boundary

This change prevents an arbitrary web origin from successfully preflighting the JSON recrypt request
or reading Service A responses, and it removes cross-origin browser API access from Service B.

CORS is not authentication or authorization. It does not constrain non-browser HTTP clients, prove
which Galaxy user initiated a job, or authorize Service B to recrypt a particular dataset to a
particular job key. Service B still needs an authenticated and authorized compute-side channel; that
larger protocol is deliberately outside this PR.

## Tests

The new tests cover:

- browser access disabled by default;
- exact origins loaded from user-mode YAML configuration;
- allowed-origin preflight and response headers;
- rejected-origin preflight and unreadable responses;
- absence of credentialed CORS;
- rejection of the `Authorization` request header;
- rejection of wildcard, `null`, path-bearing, wildcard-host, and credential-bearing origins;
- confirmation that the real compute-mode app has no CORS middleware.

Validation:

```text
pytest: 31 passed
flake8: clean
isort: clean
yapf: clean
git diff --check: clean
```
