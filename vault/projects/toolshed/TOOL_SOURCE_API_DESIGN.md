# Pinned Tool Shed source API

Design proposal, 2026-09-16. This document specifies a separate implementation from
`toolshed_delegate_publishing`; it does not change that branch.

## Scope clarification after review

**For issue #82, expanded source is acceptable, so the existing Tool Shed API is
already sufficient for its source fetch path.** Verified anonymously against
production on 2026-09-16:
`GET /api/tools/devteam~fastqc~fastqc/versions/0.74%2Bgalaxy0/tool_source`
returns HTTP 200, 10,291 bytes of expanded XML, and `language: xml`.

The #82 implementation can fetch that endpoint, store its response, replace the
proxy's 501, and enable the source UI. It does not need original-file retrieval,
a macro-file API, or the proposed manifest. The client can map the existing
`language` header to its format metadata and response content type.

The proposal below is conditional on needing **exact changeset selection or
original committed bytes**. It is not a prerequisite for #82. Exact changeset
pinning remains separate from version-based expanded source retrieval.

## Consumer need and current behavior

[Foundry PR #559](https://github.com/galaxyproject/foundry/pull/559) documents a gap:
agents cannot reliably retrieve wrapper XML belonging to a workflow's pinned Tool
Shed changeset. [The underlying report, #553](https://github.com/galaxyproject/foundry/issues/553),
also explains why the parsed summary is insufficient: output filters can be absent
from it, and decoding the parsed tool can fail for some wrappers. Fetching an
upstream GitHub default branch does not establish evidence for the Shed pin.

[galaxy-tool-util-ts issue #82](https://github.com/jmchilton/galaxy-tool-util-ts/issues/82)
owns the consumer implementation: lazy source retrieval, write-through storage,
raw byte responses, and the source UI. Its existing proxy route can stay
`GET /api/tools/{tool_id}/versions/{tool_version}/tool_source`.

The Shed already has a route with that name, but it returns `ToolSource.to_string()`:
an expanded, serialized document, rather than the original repository bytes. Keep
that contract. Add a distinct `raw_tool_source` route, with explicit revision
selection and provenance. Source retrieval must work without decoding `ParsedTool`.

The local storage plan's proposed `/contents` → `raw_file` fetch chain is not an
established FastAPI contract. This design supplies a direct source route instead.
Retrieval is new work; the cache's parsed JSON fetch does not already contain XML.

Inspected code:

- [Shed tool routes](https://github.com/galaxyproject/galaxy/blob/07f42d2a5a5841ceb25fc968628f51007bca351b/lib/tool_shed/webapp/api2/tools.py)
  and [tool manager](https://github.com/galaxyproject/galaxy/blob/07f42d2a5a5841ceb25fc968628f51007bca351b/lib/tool_shed/managers/tools.py).
- [TRS resolution](https://github.com/galaxyproject/galaxy/blob/07f42d2a5a5841ceb25fc968628f51007bca351b/lib/tool_shed/managers/trs.py)
  maps wrapper versions to metadata records; the same version can occur in several
  changesets and this mapping collapses those occurrences.
- [Metadata resolution](https://github.com/galaxyproject/galaxy/blob/07f42d2a5a5841ceb25fc968628f51007bca351b/lib/tool_shed/util/metadata_util.py)
  can move a requested changeset ahead to a newer downloadable one.
- [Mercurial helpers](https://github.com/galaxyproject/galaxy/blob/07f42d2a5a5841ceb25fc968628f51007bca351b/lib/galaxy/tool_shed/util/hg_util.py)
  include basename matching and historical file lookup; these are unsuitable for
  exact source reads.

## Identity and revision rules

A source pin is `(Shed origin, repository, Mercurial node, tool id, wrapper version)`.
The wrapper version alone is insufficient. Source SHA-256 identifies file bytes;
it does not replace the repository pin or identify the imported macro bytes.

Use the existing Shed tool identifier encoding, e.g. `devteam~fastqc~fastqc`:
**owner ~ repository ~ tool id**. Accept the full wrapper version, including
`+galaxyN`; clients percent-encode path segments and construct query parameters
with a URL library.

`changeset_revision` accepts the existing 12-character hexadecimal Shed pin or a
full 40-character hexadecimal Mercurial node. Resolve a short pin uniquely within
the repository and return the full node. Reject ambiguous pins, symbolic names,
numeric revisions, and revset expressions. Never substitute `tip` or a different
downloadable revision for an explicit pin.

When no revision is supplied, retain the current version-selection policy and
report the actual revision selected. This is a discovery convenience, not proof
of any previously requested changeset. Every subsequent request uses the reported
full node, even if a newer upload has the same wrapper version.

## HTTP surface

Let `T = /api/tools/{tool_id}/versions/{tool_version}`.

| Request | Result | Purpose |
|---|---|---|
| `GET T/raw_tool_source?changeset_revision=R` | Original wrapper bytes | Single-request source retrieval |
| `GET T/tool_source_manifest?changeset_revision=R` | `ToolSourceManifest` JSON | Source identity, path, checksum, direct macro references |
| `GET /api/repositories/{repository_id}/revisions/{R}/files?path=P` | Original file bytes | Fetch a macro or other known repository path at the pin |
| `GET T?changeset_revision=R` | Existing `ShedParsedTool` JSON | Add exact revision selection to the parsed endpoint |

The revision query is optional on tool routes; it is mandatory in the repository
file route. Give `/interop` the same optional revision selection. Other existing
tool routes retain their contracts; no endpoint is renamed or repurposed.

These are read APIs. Published repository source must be anonymously readable:
requiring push or management access would leave the Foundry gap unresolved. Apply
the published-source visibility policy consistently before both direct file reads
and conditional responses. An unavailable/deleted repository is not made public
by knowing its database id. Keep source visibility separate from installability:
an old or non-installable revision can still be legitimate source evidence.

### Raw wrapper response

`200` contains the exact committed bytes, preserving comments, whitespace,
encoding, and unexpanded macro tokens. No JSON quoting, XML reserialization,
macro expansion, or line-ending conversion.

Use `application/xml` for XML, `application/yaml` for YAML, and an appropriate
declared type for an indexed CWL wrapper; do not claim UTF-8 unless known. Supporting
these response formats does not add new Shed ingestion support for a format.

Return:

| Header | Meaning |
|---|---|
| `X-Galaxy-Tool-Source-Format` | `xml`, `yaml`, or `cwl` |
| `X-Galaxy-Repository-Id` | Encoded Shed repository id |
| `X-Galaxy-Changeset-Revision` | Resolved full 40-character node |
| `X-Galaxy-Tool-Source-Path` | Percent-encoded repository-relative POSIX path |
| `Content-Location` | This raw-source URL with the resolved full node |
| `Link` | Pinned source manifest URL, `rel="describedby"` |
| `ETag` | Validator for revision, path, format, and bytes |

The JSON manifest is the authoritative macro list. Do not require the comma-separated
macro header suggested in the older cache plan: paths can contain commas and a
manifest avoids header-size limits. Consumers of #82 should follow the manifest
link when they need imports.

### Source manifest

Illustrative response; hash placeholders are not real repository pins:

```json
{
  "schema_version": 1,
  "tool_id": "devteam~fastqc~fastqc",
  "tool_version": "0.74+galaxy0",
  "repository": {
    "id": "<encoded-repository-id>",
    "owner": "devteam",
    "name": "fastqc"
  },
  "changeset_revision": "<40-hex-node>",
  "source": {
    "path": "rgFastQC.xml",
    "format": "xml",
    "size_bytes": 12345,
    "sha256": "<64-hex-digest-of-original-bytes>",
    "url": "/api/tools/devteam~fastqc~fastqc/versions/0.74%2Bgalaxy0/raw_tool_source?changeset_revision=<40-hex-node>"
  },
  "imports": [
    {
      "kind": "macro",
      "import_path": "macros.xml",
      "path": "macros.xml",
      "url": "/api/repositories/<encoded-repository-id>/revisions/<40-hex-node>/files?path=macros.xml"
    }
  ],
  "warnings": []
}
```

`source.path` and `imports[].path` are normalized repository-relative paths;
`import_path` preserves the literal reference in the wrapper. URLs are same-origin
API references, not upstream GitHub URLs or local server paths. The checksum covers
only the primary raw file. No timestamps enter this deterministic response.

`imports` contains direct XML macro imports, in declaration order. It is not a
complete dependency bundle or a claim that the primary file is self-contained.
Missing or invalid imports produce structured warnings with a code and path;
the primary bytes remain retrievable when its identity is already indexed.
Non-XML dependency graphs are outside this initial import-list contract.

Nested XML imports need care: the inspected Galaxy macro loader resolves them
against the primary wrapper's directory, rather than changing the base to each
importing file's directory. Document that behavior for consumers and test it
against Galaxy. A repository file endpoint accepts a canonical repository path;
it does not reinterpret a literal macro reference.

### Repository file response

`path` is a required, repository-relative POSIX path. Return the exact file at
that node, including files unchanged in the requested commit. Return
`application/octet-stream`, revision/path provenance, and an ETag. No full-tool
parsing or metadata record is required to read a known path.

Read only the Mercurial manifest and file contexts, never arbitrary host paths.
Reject absolute paths, NUL, backslashes, `.hg` components, escaping `..`, and
symlink entries. Macro references such as `../macros.xml` may be normalized against
the wrapper directory by the resolver if they remain inside the repository; the
file API itself receives the resulting canonical path. Do not follow external
URLs, filesystem links, or basename-only matches.

### Parsed endpoint extension

An explicit revision chooses the same source identity used by raw retrieval.
Add `source_provenance: ToolSourceProvenance | null` to `ShedParsedTool`; populate
it for explicitly pinned Shed responses, with these fields:

```json
{
  "repository_id": "<encoded-repository-id>",
  "changeset_revision": "<40-hex-node>",
  "path": "rgFastQC.xml",
  "format": "xml",
  "sha256": "<64-hex-digest-of-original-bytes>"
}
```

`repository_revision` is the existing database metadata view. Include it only if
there is an exact record for the selected node; its legacy short hash must resolve
to that same node. Otherwise return `repository_revision: null` and use the new
source provenance object. Never borrow a newer record's id or installability flags
and present them as this revision's metadata. The generic ParsedTool subtree keeps
its existing shape.

Explicitly pinned parsed-model cache entries must include the full revision in
their key. Existing unpinned calls keep their current response shape and selection
policy. The source routes do not use the parsed-model cache as an authority.

## Resolver and implementation

Introduce a shared source resolver in `tool_shed/managers/tools.py`:

```text
resolve_tool_source(trans, tool_id, version, changeset_revision=None)
    -> repository, full node, repository-relative path, format
read_repository_file(repository, full node, path)
    -> bytes
```

Resolve repository identity using the existing tool encoding, then resolve the
requested node directly through Mercurial. Find the primary path from tool metadata
for the exact revision, preserving directories from `tool_config`; an absolute
legacy metadata path is converted relative to that repository's storage root.
Validate that it belongs to the repository and exists in the chosen manifest.

If metadata was moved ahead or no exact record remains, resolve identity from the
**requested node's manifest**. Use a lightweight wrapper index keyed by repository
and full node: inspect candidate wrappers for id/version, including pinned macro
tokens where necessary, without constructing a `ParsedTool` or its output model.
Metadata from another revision can supply path hints, but cannot establish the
identity or version of the requested revision. Return a conflict if several files
claim the same id/version. This fallback matters for genuinely historical pins.

Identity parsing must obey repository path bounds. If temporary materialization
is needed for Galaxy's id/version parser, materialize only revision-owned files
with validated import paths; no network clone or shared working-copy checkout.
Collection-output decoding failures must not block identity resolution.

Byte retrieval is `ctx[path].data()` from the full manifest, not `ctx.files()`:
the latter lists changed files rather than every file present at that node.
Avoid `copy_file_from_manifest`, basename helpers, and moved-ahead metadata helpers.

Put tool routes and manifest models beside the existing tools API and client
schema. Put the generic revision file route in `api2/repositories.py`; use the same
read policy and exact Mercurial resolver. No new persistent source table is needed
for an initial implementation; immutable lookup caches can be rebuilt from hg.

## Errors, caching, and browser contract

Use the normal Shed JSON exception envelope for errors; successful raw responses
are bytes. Include an OpenAPI-documented reason code for distinctions callers need.

| Status | Condition |
|---|---|
| `422` | Missing required path, malformed revision, invalid identifier/path |
| `404` | Unavailable repository, unknown node, or absent file/tool at that node |
| `409` | Ambiguous short node, conflicting wrapper identity, or a known wrapper at the pin with a different version |
| `500` | Repository/metadata inconsistency that prevents a truthful result |

Do not fall back to GitHub, a configured Galaxy, or another Shed after an explicit
pin mismatch and present the result as successful evidence for the requested pin.

Start with `Cache-Control: public, max-age=0, must-revalidate` for published source
and support `If-None-Match`/`304`. Full-node bytes are immutable; visibility and
version-only resolution are not. Include revision/path in validators even when
primary bytes are identical: a macro-only commit still changes source provenance.
Manifest validators include the manifest body; conditional responses retain
provenance headers and are subject to the same read policy.

Allow browser reads on the new routes and explicitly expose the provenance,
`Content-Location`, `Link`, and `ETag` headers through CORS. OpenAPI declares raw
responses as `string`/`binary`, their media types and headers, and error envelopes;
generated clients must consume bytes/text rather than JSON.

## Integration if exact pins or original bytes are required

For basic #82 support, use the existing expanded route as clarified above. If
the additional source guarantees in this proposal are adopted, use the issue's
recommended lazy fetch plus write-through cache. The proxy's existing
`tool_source` route calls the Shed's new `raw_tool_source` route. It must not forward
the expanded Shed `tool_source` response as raw source.

For a Foundry discovery pin, send `changeset_revision` for both parsed and raw
fetches. For a version-only request, resolve the manifest once, then fetch both
artifacts using its full node. Never make two independent version-only resolutions
and assume they select the same revision. Raw-only retrieval is still possible
when parsed-model decoding fails.

The inspected TS `ParsedTool` schema does not model `repository_revision`, so the
consumer must preserve the new `source_provenance` separately before decoding the
generic parsed payload. The source manifest is also a typed provenance record for
raw-only calls and for resolving version-only requests to an explicit pin.

Issue #82's existing cache key uses Shed URL, tool id, and version. For explicitly
pinned entries, add the full node to the source/parsed artifact identity so two
revisions of the same version cannot overwrite each other. Version-only entries
can remain lookup aliases to a resolved pin. Persist checksum, path, origin, node,
and format with the cached bytes. Do not infer a source origin from the first
configured provider after another provider supplied the parsed entry.

Fetch macro files on demand using the same node; expansion stays with the consumer.
`summarize` stays offline and populates `artifacts.raw_tool_source_path` only when
the bytes have been stored with matching provenance. A raw-source fetch failure
can leave a usable parsed entry and an explicit warning; the absence must not be
represented as an authoritative source artifact. Refetch/invalidation treats a
resolved pin's parsed and source artifacts consistently.

Stock tools have no Mercurial pin. Keep them out of the first Shed repository-source
implementation; return a documented `404` reason for unavailable repository source.
The consumer can separately support Galaxy's raw-source API and record Galaxy
provenance. It must not claim a stock safe-version substitution is exact repository
evidence. This does not change the existing expanded stock-source endpoint.

## Acceptance tests and rollout

1. Anonymous raw retrieval returns byte-identical committed XML, including comments
   and unexpanded tokens; existing expanded-source behavior is unchanged.
2. Two changesets with the same wrapper version return different provenance and
   their own wrapper/macro bytes; a concurrent upload cannot mix parsed and raw pins.
3. Both 12- and 40-character pins select the same full node; an explicit historical
   pin remains exact after metadata is moved ahead.
4. A file unchanged in the target commit is readable, a deleted file returns 404,
   and equal basenames in different directories remain distinct.
5. Macro version tokens, nested imports, and safe parent-directory references
   match Galaxy's resolution rules; missing imports do not hide indexed raw bytes.
6. A wrapper whose ParsedTool output model fails remains available through raw
   source retrieval and lightweight identity resolution.
7. Path escapes, symlinks, unavailable repositories, unknown revisions, ambiguous
   identities, and version mismatches return the documented errors without fallback.
8. Revision-aware parsed caches cannot return another revision's model; browser
   CORS, binary OpenAPI declarations, validators, and 304 provenance work end to end.
9. Cache integration stores matching provenance, reuses bytes offline, and populates
   Foundry's raw-source artifact without fetching an unpinned upstream branch.

Land the Shed resolver, raw endpoint, manifest, known-file reads, and parsed pinning
together, with focused Tool Shed tests. Deploy that API before enabling the direct
Shed fetcher and cache/UI work in #82. Then update Foundry's instructions to use the
cached source artifact and same-node macro reads. Fixing the summary's omitted
output-filter fields remains a separate improvement; this API supplies the pinned
evidence needed in the meantime.
