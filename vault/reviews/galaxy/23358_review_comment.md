> **Posted by Claude (AI assistant) on behalf of jmchilton.** Reviewed and directed by them,
> but the analysis and wording below are the assistant's, not personally authored by them.

Reviewed at `349ad23084`. The user-defined filtering looks sound:
`UserDefinedFileSourcesImpl._user_file_source` only matches `gxuserfiles://`, so selecting those
sources by parsed UUID is exhaustive for the path that reads vault secrets and may mint OAuth
tokens.

I also traced the URI derivation in `MinimalJobWrapper._referenced_file_source_uris`
(`lib/galaxy/jobs/__init__.py:1087-1098`) and checked every current `ToolAction` subclass. The three
action-specific overrides cover history import, legacy upload, and fetch upload. History export is
covered generically because `directory_uri` is a `DirectoryUriToolParameter`. Deferred collection
elements, `ftp_import`, and the `sort` to `max` refactor also check out.

Relative to the previous revision (`97bc0d646a`), the four derivation tests were moved from
`test_job_io.py` to `test_job_wrapper.py`; aside from helper renames and the required `MockTool`
attributes, their assertions were not weakened.

I have one design concern and one failure-path issue.

## 1. Make completeness of URI derivation an explicit contract

At `lib/galaxy/files/__init__.py:299-314`, passing any `referenced_uris` set enables a subtractive
filter. An empty set serializes no configured sources, and a partial set serializes only the best
match for the URIs it contains. That is a reasonable fail-closed policy for credentials, but it
makes correctness depend on the derivation being complete.

The current actions appear complete, but the contract is implicit: a future action can persist a
URI in action-owned data, inherit the default empty hook, and fail only when the external job tries
to resolve that URI. Nothing in the type or tests distinguishes “this action is known to reference
no additional URIs” from “this action has not implemented discovery.” Three of the four current
URI-carrying actions already need an explicit override, which suggests this will be easy to miss.

Could completeness be represented or enforced directly? For example, the derivation could return
both the URI set and whether action-owned discovery is known to be complete. Audited actions could
declare completeness, while an unknown action could conservatively use the legacy full configured
set (with that compatibility/security tradeoff made explicit). Alternatively, require every custom
`ToolAction` to declare the contract and add a test that enumerates the subclasses. I do not think
`PluginKind.stock` is a safe fallback boundary: stock HTTP sources can carry templated authorization
headers or an `oidc_auth_provider` token.

## 2. `UploadToolAction` can replace the original failure during cleanup (P2)

`UploadToolAction.iter_referenced_file_source_uris` (`lib/galaxy/tools/actions/upload.py:91`) does an
unguarded `open()` / `json.load()` of the legacy upload paramfile. A missing or unreadable file,
malformed JSON, a non-list payload, or a non-dict list element can raise `OSError`, `ValueError`,
`TypeError`, or `AttributeError`.

This hook is evaluated while lazily constructing `job_io`
(`lib/galaxy/jobs/__init__.py:1101-1107`). The failure path later calls
`_fix_output_permissions()`, which accesses `self.job_io` (`:1439-1441`, called at `:1552-1553`).
That path is reachable when `prepare()` itself failed (`lib/galaxy/jobs/runners/__init__.py:299-317`).
In particular, `__prepare_upload_paramfile` already documents and handles an interrupted setup; if
both the original and stable copies are absent, it re-raises, after which `fail()` tries to open the
same missing file through the lazy `job_io` property.

The temporary paramfile normally lives under `new_file_path` with the default `override_tempdir`
configuration (`lib/galaxy/config/__init__.py:797-800`), and that directory is explicitly documented
as suitable for external `tmpwatch` cleanup
(`lib/galaxy/config/schemas/config_schema.yml:582-584`).

The job state is committed as `ERROR` before `_fix_output_permissions`, so the impact is bounded,
but the secondary exception can bury the original failure and skip error reporting, email actions,
tool-specific failure handling, and cleanup.

Rather than swallowing paramfile errors in the derivation hook—which could silently under-provision
a normal dispatch—I would make failure cleanup avoid lazily constructing `job_io` when it was never
initialized, or otherwise guard and log errors from `_fix_output_permissions`. Paramfile validation
can remain fail-fast during normal dispatch; if it is hardened separately, it should validate the
top-level list and each element's dict shape.

## Smaller notes

- `Dataset.source_uris` (`lib/galaxy/model/__init__.py:4861`) now sits beside
  `DatasetInstance.deferred_source_uri` (`:5542`) with overlapping semantics. Expressing the
  singular property in terms of the plural one, or documenting why both forms exist, would keep the
  model API from drifting.
- `lib/galaxy/files/sources/elabftw.py:178-184` removes comments that proposed checking
  `self.scheme == USER_FILE_SOURCES_SCHEME` once the circular import was resolved. This PR moves the
  constant to a usable layer but deletes the comments without applying the change; the retained
  custom-scheme behavior is not equivalent. Either make the proposed change or retain a short note
  explaining why the current behavior is intentional.
