# Native license acceptance in Galaxy

Some tools require Galaxy users to accept license terms, including tools restricted to non-commercial
or academic use. Today wrappers approximate that requirement with ordinary boolean parameters. This
proposal replaces that workaround with a first-class, persisted, auditable user acceptance enforced
server-side for both tool and workflow execution.

**Scope limitation:** v1 models only an unconditional agreement that applies to every execution of a
tool. It does not decide whether particular legal language is sufficient, record a factual
certification about the context of each use, or express an agreement that is required only for
particular input choices. Restrictions such as Clair3's Rerio models, GEMINI's optional CADD data and
InterProScan's optionally installed licensed applications therefore cannot be migrated to this v1
element without over-blocking unrelated runs. Those cases need a separate conditional/per-execution
design. A wrapper author must only use this element when accepting the declared terms once—or once
for a particular submission—is meaningful for every execution of the tool.

The intended follow-on does not introduce a Galaxy-specific path or predicate language. It adds an
optional workflow-style CWL JavaScript expression, `<when expression="$(inputs...)" />`, evaluated
against the same formal `JobRuntimeToolState.input_state` exposed to YAML tool expressions. That
evaluation necessarily happens later, after the concrete job state has been expanded, defaulted,
validated, and converted by `runtimeify()`. Later discovery makes workflow and batch UX harder, but
keeps one expression language and one runtime input contract; enforcement still happens before the
command is dispatched. The follow-on is described under **Conditional applicability extension**
below and remains out of scope for v1.

## Current state

Nine wrappers in tools-iuc gate every run on an ordinary boolean parameter: `sfold`, five wrappers
under `tools/meme` (`dreme`, `fimo`, `meme`, `meme_psp_gen`, `streme`), `meme_chip`, `egsea`, and
`maker`. Clair3 has a tenth boolean-plus-Cheetah guard, but only when the selected data-table model is
from Rerio. `gemini_load` and `interproscan` expose input-dependent restricted components without a
user affirmation. The unconditional wrappers use variations of:

```xml
<param name="non_commercial_use" type="boolean" checked="False"
       label="I certify that I am not using this tool for commercial purposes.">
  <validator type="expression" message="This tool is only available for non-commercial use.">value == True</validator>
</param>
```

plus, in the better cases, a Cheetah guard that `exit 1`s if unchecked (`tools/meme/macros.xml:12-17`).

Three problems:

1. **Invisible under workflow execution.** The value is baked into `WorkflowStep.tool_inputs` at save
   time and a checked boolean is not a runtime input, so `WorkflowRunForm.vue:76` never renders it.
   The workflow *author* affirmed on the runner's behalf, once, possibly years ago.
2. **Never persisted.** Every job re-asks; nothing is stored anywhere queryable, so "accept
   indefinitely" is impossible and so is any audit trail.
3. **It is a fake parameter.** It lands in `Job.parameters`, tool state, the rerun form, API
   responses, and every workflow embedding the tool. The six MEME-related wrappers each carry their
   own copy of an affirmation about a single license.

The existing `license` attribute on `<tool>` (`galaxy.xsd:212-219`) does not help: it is a display-only
SPDX id describing *the wrapper*, not the wrapped software, and SPDX has no identifier for "MEME
academic use".

---

## Proposal

### 1. Tool XML

Declared inside `<requirements>`, following the `<credentials>` precedent — which also means older
Galaxy releases ignore it silently, since `parse_requirements_from_xml` reads `<requirements>` by
`findall` on known child names only.

The terms come from an adjacent file. **This is the preferred form and the docs stemming from this
work should say so:**

```xml
<requirements>
  <requirement type="package" version="5.5.8">meme</requirement>
  <license_agreement id="meme-suite-academic" version="2" path="meme_license.txt">
    <label>MEME Suite academic-use license</label>
    <url>https://meme-suite.org/meme/doc/copyright.html</url>
    <affirmation>I have read and agree to the MEME Suite academic-use license terms.</affirmation>
  </license_agreement>
</requirements>
```

Inline `<text>` stays supported for standalone or simple tools, but is the lesser option:

```xml
  <license_agreement id="tiny-tool-nc" version="1">
    <label>Non-commercial use only</label>
    <affirmation>I have read and agree to these non-commercial-use terms.</affirmation>
    <text><![CDATA[
This software is free for non-commercial use...
    ]]></text>
  </license_agreement>
```

#### Conditional applicability extension (follow-on, not v1)

A later profile may allow an agreement to declare when it applies:

```xml
<requirements>
  <license_agreement id="rerio-public-license" version="1" path="rerio_license.txt">
    <label>Oxford Nanopore Technologies Public License</label>
    <url>https://github.com/nanoporetech/rerio/blob/master/LICENSE.txt</url>
    <affirmation>I have read and agree to the Oxford Nanopore Technologies Public License.</affirmation>
    <when expression="$(inputs.model_source.source === 'datatable' &amp;&amp; inputs.model_source.model.fields.source === 'rerio')" />
  </license_agreement>
</requirements>
```

This deliberately reuses the expression contract already established by workflow `when` steps and
YAML tools:

- The expression is evaluated by the existing CWL JavaScript evaluator and must produce a boolean.
- `inputs` is the exact validated `JobRuntimeToolState.input_state` produced by `runtimeify()`, not a
  separately flattened parameter map or a license-specific projection.
- Sections and conditionals remain nested objects. Repeats remain arrays, so expressions can use
  ordinary indexing (`inputs.items[0]`) or ECMAScript 5.1 array operations rather than Galaxy's
  flattened `repeat_0|parameter` names.
- Evaluation is authoritative on the server after each concrete per-job state has been expanded,
  defaulted, and validated, and immediately before dispatch. Expression errors and non-boolean
  results fail closed. If the result is true and no applicable acceptance exists, Galaxy returns a
  structured `license_acceptance_required` failure and does not launch the command.
- Because applicability is discovered per concrete job, a batch or workflow may discover a required
  agreement later than the v1 fail-fast invocation preflight. Improving that UX may justify a
  speculative earlier check, but it must not define a second authoritative input representation or
  evaluator.

`JobInternalToolState` would permit earlier evaluation, but represents datasets as Galaxy-internal
references such as `{src: "hda", id: 5}`. `JobRuntimeToolState` instead supplies the CWL-style values
that YAML JavaScript expressions already consume. Reusing it avoids having license conditions and
tool commands interpret the same parameter through subtly different contracts. It remains a formal,
generated representation with strict Pydantic validation and a generated JSON Schema.

One general runtime gap must be closed before the Clair3 example above works: both current
`job_internal` and `job_runtime` select state contain only the selected string value (or list of
values). `runtimeify()` currently adapts data and data-collection parameters but does not expose the
selected dynamic-option row's named fields, while Clair3 needs `model.fields.source == "rerio"`.
That should be designed as a profile-versioned extension of the formal YAML `job_runtime` contract,
so YAML expressions and conditional agreements gain the capability together. It must not be a
license-only recreation of the implicit Cheetah parameter wrapper. Until then this extension can
cover conditions based on ordinary booleans, selects, conditionals, sections, and repeats, including
the simpler GEMINI and InterProScan shapes, but not Clair3's data-table provenance test.

| | Required | In the hash? | Meaning |
|---|---|---|---|
| `path` | one of `path` / `<text>` | **yes** (canonical UTF-8 text) | License file, **relative to the tool's directory**, matching `<required_files>` semantics (`galaxy.xsd:598`). Read at tool load time. |
| `<text>` | one of `path` / `<text>` | **yes** (canonical UTF-8 text) | Inline terms, for tools not worth a second file. |
| `<affirmation>` | yes | **yes** | The sentence the user asserts. Sits by the checkbox; quoted in the audit record. |
| `version` | yes | no | Displayed provenance for the upstream agreement; changing it without changing the displayed affirmation or terms does not re-prompt. |
| `id` | yes | no | Readable handle for logs and lint. Carries no uniqueness guarantee and grants no authority. |
| `<label>` | yes | no | Short name for the prefs panel and run dialog. |
| `<url>` | no | no | Canonical upstream terms. Display only. |

Exactly one of `path` / `<text>` must be present — validated in the parser and by lint rather than
contorting the XSD. A missing or unreadable `path` fails tool load, which is correct.

`path` is chosen over `filename` (which means job-working-directory paths for configfiles), `src`
(used once, for the tool icon), and `from_file` (marked Deprecated in the XSD).

Note the license file does **not** belong in `<required_files>`: it is needed at parse and display
time on the Galaxy side, never at job runtime, so it should not be shipped to remote compute.

**Non-goal, stated explicitly: Galaxy never fetches `<url>`.** Acceptance must work airgapped. The
only network request is the user clicking the link in their own browser.

### 2. Acceptance is keyed on the displayed agreement

`agreement_hash` is SHA-256 over a versioned, canonical JSON document:

```python
payload = json.dumps(
    {
        "affirmation": canonical_affirmation,
        "schema": 1,
        "terms": canonical_terms,
    },
    ensure_ascii=False,
    sort_keys=True,
    separators=(",", ":"),
).encode("utf-8")
agreement_hash = hashlib.sha256(payload).hexdigest()
```

The explicit `schema` field makes a future canonicalization change a new hash domain rather than an
accidental reinterpretation of existing rows. `id`, `label`, `url` and `version` are excluded, so
fixing display metadata does not re-prompt everyone. Changing either the displayed affirmation or the
terms does re-prompt.

Canonicalization is deliberately small and identical across the two source forms:

- **Both forms:** normalize CRLF and bare CR to LF; remove leading and trailing *blank lines*; preserve
  all other characters, including spaces on non-blank lines. Splitting on LF, removing outer elements
  for which `line.strip() == ""`, and rejoining with LF defines this exactly; a final LF is therefore
  not significant.
- **`path` form:** decode as UTF-8 first; an invalid UTF-8 file fails tool load.
- **`<text>` form:** apply `textwrap.dedent()` first to remove XML indentation, then apply the shared
  normalization above.
- **Affirmation:** normalize line endings, strip leading and trailing whitespace, require a non-empty
  single line, and otherwise preserve it exactly.

Consequently a path file and inline CDATA containing the same visible text have the same canonical
terms. There is one canonical UTF-8 string to store and display; the database never has to reconstruct
text from the hash input.

Preferring the file form has three payoffs:

- **The XML reads better** — no multi-hundred-line CDATA block wedged into `<requirements>`.
- **Sharing across a suite becomes trivial and robust.** The five wrappers under `tools/meme` can
  reference one adjacent `meme_license.txt`, while `meme_chip` can ship a byte-identical copy. The six
  MEME-related wrappers then produce one agreement hash and require one acceptance.
- **The file usually already exists.** Bioconda recipes for these tools already ship the terms via
  `license_file:` — `sfold` (`license: OTHER`), `meme` (`license: Custom`), `pear`
  (`CC-BY-NC-SA-3.0`) — so the wrapper can carry the same artifact.

Two tools share an acceptance **iff their canonical affirmation and canonical terms are identical.**
Different ids with the same displayed agreement are one agreement; the same id with different terms
or a different affirmation is two.

Why not key on `tool_id + license_id`, which is the obvious choice:

- `self.id` for a shed-installed tool is the full GUID, which **includes the version**
  (`tools/__init__.py:1338-1340`, `:1448-1450`). Keying on it means MEME 5.5.8 → 5.5.9 invalidates
  every acceptance on the instance.
- The versionless `old_id` survives upgrades but is not unique — two repos can both ship `meme_meme`.

So tool-scoped keying relocates the identity problem rather than solving it, and adds a re-prompt
storm on every point release. Keying on `license_id` alone instead needs namespace governance nobody
owns, and invites one tool inheriting another's acceptance by declaring a well-known id.

Hashing the displayed agreement removes the identifier rather than namespacing it. Nothing can be
squatted, because forging a match means reproducing the affirmation and terms the user saw. It also
deduplicates the six current MEME-related wrappers to one prompt and one row in preferences if they
ship the same agreement.

**Cost:** transcription drift. If two wrappers ship the same license with different wrapping, users
are prompted twice. Shipping the file verbatim rather than retyping it into CDATA largely removes
this, which is the main argument for preferring `path`. Where the text genuinely differs, prompting
twice is correct.

Line endings and surrounding blank lines are normalized at hash time rather than enforced in the
repository, because Galaxy loads tools from arbitrary Tool Shed repos and cannot rely on any of them
configuring `.gitattributes`. Other whitespace remains meaningful. The canonicalization is pinned by
tests and the hash schema version; it must not change in place after first release.

### 3. Data model

```python
class ToolLicenseText(Base):
    """Content-addressed store of license terms. One row per distinct license, instance-wide."""
    __tablename__ = "tool_license_text"

    agreement_hash: Mapped[str] = mapped_column(TrimmedString(64), primary_key=True)
    license_text: Mapped[str] = mapped_column(Text)
    affirmation: Mapped[str] = mapped_column(Text)
    create_time: Mapped[datetime] = mapped_column(default=now)


class ToolLicenseAcceptanceEvent(Base, RepresentById):
    """Append-only in normal operation; user deletion may purge these personal events."""
    __tablename__ = "tool_license_acceptance_event"
    __table_args__ = (
        CheckConstraint("action IN ('accept', 'revoke')", name="ck_tool_license_acceptance_event_action"),
        Index("ix_tool_license_acceptance_event_current", "user_id", "agreement_hash", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    # identity: the whole key is (user_id, agreement_hash)
    user_id: Mapped[int] = mapped_column(ForeignKey("galaxy_user.id", ondelete="CASCADE"), index=True)
    agreement_hash: Mapped[str] = mapped_column(
        ForeignKey("tool_license_text.agreement_hash", ondelete="RESTRICT"), index=True
    )

    affirmation: Mapped[str] = mapped_column(Text)          # the sentence, exactly as displayed
    action: Mapped[str] = mapped_column(TrimmedString(16))  # "accept" | "revoke"

    # display + provenance only; never queried for authorization
    license_id: Mapped[Optional[str]] = mapped_column(TrimmedString(255), nullable=True)
    license_version: Mapped[Optional[str]] = mapped_column(TrimmedString(255), nullable=True)
    license_label: Mapped[Optional[str]] = mapped_column(TrimmedString(255), nullable=True)
    license_url: Mapped[Optional[str]] = mapped_column(TrimmedString(255), nullable=True)
    granted_by: Mapped[str] = mapped_column(TrimmedString(16))  # "user" | "admin"
    granted_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("galaxy_user.id", ondelete="SET NULL"), nullable=True
    )
    prompting_tool_id: Mapped[Optional[str]] = mapped_column(TrimmedString(255), nullable=True)
    prompting_tool_version: Mapped[Optional[str]] = mapped_column(TrimmedString(255), nullable=True)
    create_time: Mapped[datetime] = mapped_column(default=now, index=True)


class JobLicenseAcceptanceAssociation(Base, RepresentById):
    """Pins the acceptance that authorized a given job."""
    __tablename__ = "job_license_acceptance"
    __table_args__ = (
        CheckConstraint(
            "authorization_kind IN ('persistent', 'one_time')",
            name="ck_job_license_acceptance_authorization_kind",
        ),
        UniqueConstraint("job_id", "agreement_hash", name="uq_job_license_acceptance_job_agreement"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("job.id", ondelete="CASCADE"), index=True)
    acceptance_event_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tool_license_acceptance_event.id", ondelete="SET NULL"), index=True, nullable=True
    )
    agreement_hash: Mapped[str] = mapped_column(
        ForeignKey("tool_license_text.agreement_hash", ondelete="RESTRICT"), index=True
    )
    authorization_kind: Mapped[str] = mapped_column(TrimmedString(16))


class WorkflowInvocationLicenseAcceptanceAssociation(Base, RepresentById):
    """Pins a one-time acceptance for the lifetime of one workflow invocation."""
    __tablename__ = "workflow_invocation_license_acceptance"
    __table_args__ = (
        UniqueConstraint(
            "workflow_invocation_id",
            "agreement_hash",
            name="uq_workflow_invocation_license_acceptance_invocation_agreement",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    workflow_invocation_id: Mapped[int] = mapped_column(
        ForeignKey("workflow_invocation.id", ondelete="CASCADE"), index=True
    )
    agreement_hash: Mapped[str] = mapped_column(
        ForeignKey("tool_license_text.agreement_hash", ondelete="RESTRICT"), index=True
    )
    create_time: Mapped[datetime] = mapped_column(default=now)
```

Current persistent state is derived, not stored — accepted iff the newest event for
`(user, agreement_hash)` is `accept`. The implementation uses SQLAlchemy with a `row_number()` window
so the same query works on PostgreSQL and SQLite; conceptually:

```sql
SELECT agreement_hash, action
  FROM (
        SELECT agreement_hash, action,
               ROW_NUMBER() OVER (PARTITION BY agreement_hash ORDER BY id DESC) AS rn
          FROM tool_license_acceptance_event
         WHERE user_id = :user_id
       ) latest
 WHERE rn = 1
```

Ordering by the monotonically increasing primary key also makes simultaneous events deterministic.
Each accept or revoke API operation is atomic. Job associations are inserted in the job-creation
transaction, and workflow one-time associations are inserted in the invocation-creation transaction;
concurrent insertion of the content-addressed terms row uses an upsert.

`Job.license_acceptance_associations` mirrors `Job.credentials_context_associations`
(`model/__init__.py:1713`). `agreement_hash` on the job association means the authorization still
resolves to the exact displayed terms after a privacy purge nulls `acceptance_event_id`.
`authorization_kind` distinguishes an originally one-time authorization from a persistent event that
was later purged.

`WorkflowInvocation.license_acceptance_associations` stores only one-time acceptances. When a workflow
request is created, the server copies each applicable hash to every invocation in the newly created
subworkflow tree that contains a matching tool. This makes a one-time acceptance durable across
scheduling delays, restarts and resumed invocations without turning it into user-wide state.

Terms are stored **once per distinct displayed agreement for the whole instance**, not once per user,
event, job or invocation. The content row is retained indefinitely: it is non-personal data, and
deleting it would orphan job and audit records. Normal accept/revoke operations only append events.
Deleting a user cascades that user's personal events; job associations survive with a null event id,
their authorization kind and their agreement hash. This preserves what terms authorized a retained
job without retaining a separate user acceptance event after account erasure.

`UserPreference` (`model/__init__.py:12466`) is deliberately not used: mutable, untimestamped,
unqueryable. "Track in preferences" is delivered as a preferences *UI surface*, backed by real tables.

What this encodes:

| Question | Answer |
|---|---|
| Already-run jobs when a user revokes? | Unaffected. `job_license_acceptance` pins how the job was authorized; revocation is prospective for later direct jobs and persistent workflow checks. |
| License text or affirmation changes after acceptance? | Re-prompted. The displayed agreement has a different hash. |
| Can a user inspect what they agreed to? | Yes — the canonical affirmation and full terms are stored independently of mutable tool XML. |
| Revocability vs. auditability | Normal operations are append-only; privacy deletion may remove personal events while retained job records continue to identify the exact agreement and original authorization kind. |

### 4. Enforcement

Enforcement has to be server-side. Worth noting that the existing credentials feature is enforced
**only in the client** — `ToolForm.vue:284-296` disables the Run button, while
`managers/credentials.py:295-313` and `workflow/modules.py:3261-3264` both quietly skip missing
services — so a direct `POST /api/tools` submits a credentials-requiring job that runs with unset env
vars. Tolerable for credentials; fatal for a legal affirmation.

The chokepoint already exists. `DefaultToolAction._check_access` (`tools/actions/__init__.py:403`,
called at `:470`) is reached by every job-creating path: tool form, `POST /api/tools`, bioblend,
planemo, and `execute()` from `workflow/modules.py:3149`. It already encodes one precondition
(`require_login`, via `allow_user_access`), which is the precedent for generalizing it:

```python
# lib/galaxy/tools/preconditions.py  (new)

class ToolExecutionPrecondition(abc.ABC):
    """A condition that must hold before a tool may create a job."""

    @abc.abstractmethod
    def unmet(self, trans, tool, execution_context) -> Optional["UnmetPrecondition"]: ...


class UnmetPrecondition(Model):
    kind: Literal["license_agreement", "credentials", "login"]
    details: dict          # structured, renderable by the client
    remedy_route: str      # e.g. "/user/licenses"
```

`_check_access` becomes `_check_preconditions`, iterating `tool.execution_preconditions` and raising
`ToolExecutionPreconditionUnmet(MessageException)`. `LoginPrecondition` wraps today's behaviour;
`LicenseAcceptancePrecondition` is new; `CredentialsPrecondition` closes the hole above in a later PR,
since that is a behaviour change for existing deployments. The execution context carries request-local
one-time hashes for a direct tool submission or durable invocation associations for a workflow step.

**This extraction lands ahead of the license work as a standalone no-op refactor** — `LoginPrecondition`
only, same behaviour, reviewable on its own. See Sequencing. It also converts today's bare `assert`,
which would surface as a 500 under `python -O`, into a raised `MessageException`.

Because this sits in the ToolAction, the API and CLI paths are covered by construction — they get a
400 naming the agreements and the remedy route. The job and its license associations are created in
the same transaction, so a successful authorization cannot create an unassociated job.

### 5. Workflows

Two gaps today, both real:

- Nothing checks user preconditions before an invocation. `build_workflow_run_configs`
  (`workflow/run_request.py:310`) validates steps, cycles, parameters and object stores, nothing else.
- **Subworkflows are invisible.** `WorkflowRunForm.vue:193` and `WorkflowRunFormSimple.vue:522,550`
  filter `step_type === "tool"`, so a tool nested one level down is never scanned — an existing
  credentials bug too. There is no recursive step walker anywhere in the model.

**Layer 1 — fail fast at request build.** In `build_workflow_run_configs`, after the cycles check,
collect every declared agreement and compare it with both the user's current persistent state and
`one_time_license_acceptances` in the invocation request. An unknown hash, including one that belongs
to an installed tool but not this workflow, is a 400. Missing agreements raise the same structured
`ToolExecutionPreconditionUnmet` used for direct execution, with `agreement_hash`, label, affirmation,
url and prompting step paths. Results are deduplicated by `agreement_hash`, so repeated steps sharing
one agreement yield one entry. This needs a recursive walker, which the subworkflow credentials gap
needs anyway:

```python
# lib/galaxy/model/__init__.py, class Workflow
def walk_tool_steps(
    self,
    path: tuple[int, ...] = (),
    recursion_stack: Optional[set[int]] = None,
) -> Iterator[tuple[tuple[int, ...], "WorkflowStep"]]:
    """Yield each tool step and occurrence path, recursively through subworkflows."""
```

The recursion guard is a stack rather than a global `seen` set: if the same subworkflow is used twice,
both occurrence paths must be reported. After the invocation and its nested invocation tree are
created, every validated one-time hash is associated with each invocation containing a matching tool,
in the same transaction as invocation creation.

**Layer 2 — defence in depth at scheduling.** The precondition fires again inside the ToolAction when
`modules.py:3149` calls `execute()`. The scheduler supplies the current invocation's durable one-time
hashes in the execution context. The precondition passes if either that association exists or the
user's latest persistent event is `accept`; otherwise catch and raise `FailWorkflowEvaluation` with a
new `FailureReason.license_not_accepted`. This catches resumed invocations and a revoke landing between
request and scheduling. A later revoke does not invalidate a one-time acceptance already pinned to an
invocation, but it does invalidate persistent authorization for workflow steps not yet scheduled.

**Fail fast; do not pause.** A `REQUIRES_ATTESTATION` invocation state on the `PauseModule` /
`REQUIRES_MATERIALIZATION` precedent is deliberately not pursued — it is a large surface for a case
the user can always avoid by accepting up front.

### 6. User-facing surfaces

- **Tool form** — a row per unmet agreement, Run disabled until each is affirmed. Mirrors
  `ToolCredentials.vue`.
- **Preferences panel** — "Accepted licenses", listing current state with the terms viewable and a
  revoke action, plus the full event history. Route beside the credentials card
  (`UserPreferences.vue:221-225`).
- **Accept indefinitely vs. just this once.** The persistent path writes an event before submission.
  The one-time path writes no user-wide event and rides in the submission payload:

  ```
  POST /api/tools
  { ..., "one_time_license_acceptances": ["<agreement_hash>", ...] }

  POST /api/workflows/{workflow_id}/invocations
  { ..., "one_time_license_acceptances": ["<agreement_hash>", ...] }
  ```

  The server accepts only hashes declared by the submitted tool or recursive workflow. For a direct
  tool run the hashes live only for that request; for a workflow they are copied into the invocation
  associations described above. Every resulting job receives a job association. Persistent jobs pin
  the event and set `authorization_kind="persistent"`; one-time jobs set
  `authorization_kind="one_time"` and leave `acceptance_event_id` NULL.

- **Anonymous users:** `<license_agreement>` implies `require_login`. Technically it would cost no
  schema change to prompt anonymous users per submission — `Job.user_id` and `Job.session_id` are both
  nullable and the one-time path already exists — but an anonymous affirmation binds a session and an
  IP, not a person, which is not what these licenses are for. This changes tool availability on
  anonymous-usage instances; needs a release note.

### 7. Admin configuration — deferred

Worth doing, not in this pass. Two real needs exist: institutional site licenses (`maker.xml:249`
documents exactly this case) and simply blocking an encumbered tool.

The intended shape, for whenever it lands: `config/tool_license_agreements_conf.yml.sample` with
per-license `instance_accepted: true` plus a `note:`. When set the precondition passes without
prompting **but still writes an event** with `granted_by="admin"`, so the trail stays complete and the
user sees "accepted on your behalf by this Galaxy". Blocking is `disabled: true`, hiding the tool via
the existing `allow_user_access(user, attempting_access=False)` path.

The `granted_by` and `granted_by_user_id` columns are included in the initial migration so this needs
no schema change later.

---

## Implementation

| Layer | Work |
|---|---|
| Parse | `LicenseAgreementRequirement` beside `CredentialsRequirement` (`tool_util/deps/requirements.py:370`), same plain-class idiom. `parse_requirements_from_xml` 5-tuple → 6-tuple; update `parser/xml.py:441`, `parser/yaml.py:179`, `requirements.py:425`, `tools/__init__.py:1518`, `model_factory.py:47-49` |
| Resolve `path` | `parse_requirements_from_xml(xml_root, ...)` takes only the XML root and has no directory context, so it records the `path` string and the file read + hash happen at tool load, where `self.tool_dir` is available (`tools/__init__.py:1040`, used the same way at `:1434-1435` and `:1590-1591`). Resolved paths must stay inside the tool directory — reject `..` escapes |
| XSD | New type near `galaxy.xsd:635`, docs near `:763`, uniqueness selector mirroring `:113-115` |
| Model | Four tables above; migration mirrors `versions_gxy/c8c9bd29810d_add_user_credentials_table.py` |
| Manager | `managers/licenses.py` mirroring `managers/credentials.py` — `current_state`, `accept`, `revoke`, `history`, `unmet`, `associate_with_job`, `associate_one_time_with_invocation` |
| Schema / API | `schema/licenses.py`, `api/licenses.py` under `/api/users/{user_id}/license_acceptances` plus `GET /api/tools/{tool_id}/license_agreements`. Persistent acceptance names a tool and agreement id; the server loads the installed declaration and computes `agreement_hash` rather than accepting arbitrary terms from the client. Submission-time hashes must match declarations on the submitted tool or recursive workflow; anything else is a 400 |
| Enforce | `tools/preconditions.py`, `_check_preconditions`, job association at `tools/actions/__init__.py:762` |
| Workflow | `Workflow.walk_tool_steps`, layers 1 and 2 |
| Client | `ToolLicenseAgreements.vue`, `LicenseManagement.vue`, composable + store mirroring `userToolCredentials.ts` |

### tools-iuc adoption is out of scope

Migrating the existing wrappers is a separate, long-term effort and is **not** part of this plan.
Those tools would each need to establish a new base profile before they can carry new tool-XML syntax,
and `maker.xml` is still on `profile="16.04"` — that alone is a much bigger project than this feature.

Two properties worth recording for whenever that work happens:

- Old Galaxy ignores unknown `<requirements>` children, so a wrapper can carry `<license_agreement>`
  alongside the existing boolean param and guard without a version-gated fork. Adoption can therefore
  be incremental rather than a flag day. The profile bump, not XML tolerance, is the real blocker.
- **Do not auto-translate the old param.** Silent magic on a legal affirmation is exactly wrong.

Shed-installed tools need no special handling: content addressing means a shed install, a local copy,
and every future version that does not change the canonical affirmation or terms share one acceptance.

**Consequence:** with no tools-iuc adoption in this pass, the functional test tools are the feature's
only consumer, so they and their Selenium coverage carry the whole burden of proving it works. They
are treated as a deliverable of this plan rather than a by-product — see the test plan.

### Sequencing

| Phase | Lands | Depends on |
|---|---|---|
| **0** | **`tools/preconditions.py` + `_check_access` → `_check_preconditions`, with only `LoginPrecondition`.** Pure refactor, no behaviour change. Lands ahead of the feature | — |
| 1 | parser, XSD, `ParsedTool` | — |
| 2 | DB models + migration, including workflow-invocation associations | — |
| 3 | manager | 1, 2 |
| 4 | schema + API | 3 |
| 5 | `LicenseAcceptancePrecondition` + direct-execution job association | 0, 3 |
| 6 | `walk_tool_steps` + workflow request associations + layers 1 & 2 | 5 |
| 7 | tool form UI + preferences panel + **Selenium coverage** | 4 |
| 8 | credentials ported onto the precondition | 0 |
| — | *deferred:* admin config; tools-iuc adoption | |

Functional test tools are built in phase 1 and extended as each phase lands — they are the only
consumer of the feature, so they are not deferred to the end.

Phase 0 is deliberately separate and first. Extracting the precondition abstraction from the existing
`require_login` check is a no-op refactor that can be reviewed and merged on its own merits, which
keeps the license PR focused on the license feature rather than bundling a chokepoint redesign into
it. Phase 8 then only has to add `CredentialsPrecondition`.

Phases 1–5 are one reviewable chain delivering a working, API-enforced feature with no UI. Phase 7
makes it usable. Everything after is independently shippable.

---

## Test plan

Red-to-green throughout; each step names the test written first and the failure it shows.

Since tools-iuc adoption is out of scope, **the functional test tools are the feature's only consumer
and have to carry the weight of proving it works.** They are a deliverable of this plan, not a
by-product — built in phase 1 and extended through phase 7, not retrofitted at the end.

### Functional test tools

All under `test/functional/tools/`, registered in `sample_tool_conf.xml` beside
`secret_tool.xml` (`:343`). `lib/galaxy_test/selenium/framework.py:401` sets
`framework_tool_and_types = True`, so the Selenium suite loads these automatically — no separate
config and no `test/integration_selenium/` variant needed.

| Fixture | Exercises |
|---|---|
| `license_agreement_tool.xml` | The base case: one agreement, inline `<text>` |
| `license_agreement_path_tool.xml` + `license_agreement_tool_license.txt` | The **preferred** `path` form, and adjacent-file resolution against `tool_dir` |
| `license_agreement_shared_tool.xml` + a byte-identical copy of that license file | Content addressing: a **different `id`, identical affirmation and terms** must share one acceptance |
| `license_agreement_variant_tool.xml` | The inverse: **same `id`, different affirmation or terms** must prompt separately |
| `license_agreement_multi_tool.xml` | Two agreements on one tool; partial acceptance still blocks |
| `license_agreement_missing_path_tool.xml` | Unreadable `path` fails tool load rather than loading an empty agreement |
| `license_agreement_and_secret_tool.xml` | A tool carrying both `<credentials>` and `<license_agreement>`, so the two preconditions are known to compose |
| A subworkflow fixture nesting `license_agreement_tool` one level down | The `walk_tool_steps` recursion and the subworkflow gap |

### Test matrix

| Phase | First test | Red |
|---|---|---|
| Parser | `test/unit/tool_util/test_license_parsing.py`, modelled on `test_credential_parsing.py`, over the fixtures above | `not enough values to unpack`; no `LicenseAgreementRequirement` |
| | `test_agreement_hash_stable_under_reindent` — inline `<text>`, same displayed agreement, different XML indentation | hashes differ |
| | `test_path_and_inline_agree` — a `path` file and inline `<text>` carrying identical affirmation and terms, including different surrounding blank lines; plus two tools in separate directories shipping byte-identical license files → one hash | hashes differ |
| | `test_crlf_and_lf_license_files_hash_identically` — pins line-ending normalization | hashes differ |
| | `test_version_and_label_changes_do_not_change_hash`; `test_affirmation_change_does_change_hash`; invalid UTF-8 path file fails tool load | hash contract is incomplete |
| | `test_missing_license_path_fails_tool_load` | tool loads with an empty agreement |
| Model | persist accept then revoke; assert two rows, state derives to revoked | `ImportError` on the models |
| Manager | `test_LicenseAcceptanceManager.py`. Cases: re-accept after revoke → **3 events**; affirmation or text change → not accepted; **different ids + identical displayed agreement → one acceptance covers both**; **same id + different displayed agreement → two prompts**; second user reuses the existing `tool_license_text` row; account deletion removes personal events but retained job associations still resolve terms | `ImportError` |
| API | `test/integration/test_license_acceptance.py` + populator. Cases: unknown tool/agreement id on persistent acceptance → 400 and nothing stored; a submission hash not declared by that tool/workflow → 400; `?include_history=true` ordering; anonymous → 403 with a log-in remedy | 404 on every route |
| Execution | `test_tool_execution_blocked_without_license_acceptance` — `POST /api/tools` | **200 and a job is created** |
| | then allowed-after-acceptance (asserting the job association pins the event), `test_revoke_does_not_affect_completed_job`, `test_execution_blocked_after_revoke` | |
| | `test_execution_allowed_with_one_time_acceptance` — asserts association has `authorization_kind="one_time"`, `acceptance_event_id IS NULL`, and **no** event row; a hash for another tool is rejected | 400 |
| Workflow | `test_invocation_request_rejected_when_license_unaccepted`; `test_subworkflow_license_enforced`; `test_one_time_acceptance_persisted_on_invocation_tree`; `test_one_time_acceptance_survives_restart_and_resume`; `test_one_time_workflow_acceptance_does_not_become_user_state`; `test_revoke_between_request_and_schedule_fails_persistently_authorized_invocation`; `test_revoke_does_not_invalidate_pinned_one_time_invocation`; `test_workflow_step_with_baked_in_boolean_still_prompts` | invocations schedule and run |
| Client | composable + component tests mirroring `userToolCredentials.test.ts` | module not found |

### Selenium

Required, not optional — with no real wrapper adopting the feature, browser coverage is what proves
the affirmation is actually shown, actually blocks, and actually persists. Note there is **no
credentials Selenium coverage to copy from**; this is written from scratch and is the slowest item in
the plan. New selectors go in `client/src/utils/navigation/navigation.yml`.

`lib/galaxy_test/selenium/test_tool_license_agreement.py`:

| Test | Asserts |
|---|---|
| `test_tool_form_blocks_until_accepted` | Agreement rendered with the affirmation text visible, Run disabled, enabled after checking, job runs |
| `test_license_terms_viewable_before_accepting` | The full terms are reachable from the form — the user can read what they are agreeing to without leaving the page |
| `test_acceptance_persists_across_sessions` | Accept, log out, log back in, tool form no longer prompts |
| `test_one_time_acceptance_does_not_persist` | The "just this once" path leaves the next run prompting again |
| `test_multi_agreement_partial_acceptance_blocks` | `license_agreement_multi_tool` with one of two checked keeps Run disabled |

`lib/galaxy_test/selenium/test_license_preferences.py`:

| Test | Asserts |
|---|---|
| `test_accepted_license_listed_in_preferences` | Appears after acceptance, with label and terms viewable |
| `test_revoke_from_preferences_reblocks_tool` | Revoke, return to the tool form, prompted again |
| `test_history_shows_accept_and_revoke_events` | Both events listed in order — the audit trail is user-visible, not just a table |

`lib/galaxy_test/selenium/test_workflow_license_agreement.py`:

| Test | Asserts |
|---|---|
| `test_workflow_run_form_prompts_for_step_licenses` | The run form surfaces agreements for tool steps |
| `test_workflow_run_form_prompts_for_subworkflow_licenses` | **The gap-closing test** — a nested tool's license is prompted for |
| `test_workflow_blocked_until_all_accepted` | Deduped: repeated steps sharing one license show **one** prompt |
| `test_workflow_one_time_acceptance_survives_scheduling` | A one-time choice authorizes the full invocation, including nested and delayed steps, but the next invocation prompts again |

One characterization test worth landing early: `test_job_submitted_without_credentials_is_not_blocked`
passes today and documents the §4 hole. It is inverted when credentials move onto the precondition in
phase 8, making that behaviour change explicit in a diff rather than a surprise.

---

## Decided

| Question | Decision |
|---|---|
| Keying | Content-addressed on `(user, agreement_hash)`, where the hash covers canonical affirmation and terms. `id`, `label`, `url`, `version`, and `tool_id` are display and provenance only. |
| Where the terms live | Adjacent file via `path`, preferred and documented as such; inline `<text>` supported for standalone or simple tools. |
| Normalization | Both forms normalize line endings and discard outer blank lines; inline `<text>` is additionally dedented. Canonical JSON schema 1 pins the hash domain. |
| Element placement | Under `<requirements>`, beside `<credentials>`. |
| Anonymous users | `<license_agreement>` implies `require_login`. |
| Workflow enforcement | **Fail fast.** Reject the invocation request; no pause state, no `REQUIRES_ATTESTATION`, no use of the `PauseModule` precedent. |
| One-time acceptance | **In v1.** Direct submissions carry request-local hashes. Workflow submissions persist validated hashes on each applicable invocation in the invocation tree; they never become user-wide acceptance events. |
| Retention | Acceptance/revocation is append-only in normal operation. User deletion purges personal events; agreement text and retained job authorization metadata remain. `tool_license_text` rows are never collected. |
| Precondition abstraction | **Lands ahead of this work** as a standalone no-op refactor carrying only `LoginPrecondition`. Phase 0. |
| `spdx` attribute | **Kept.** It describes the wrapped software's license and is independent metadata from the `license` attribute on `<tool>`, which describes the wrapper. |
| `client_ip` on events | **Not stored.** Out of scope — GDPR weight without a clear need. |
| Admin instance-wide acceptance | **Deferred.** Worth doing; `granted_by` columns ship now so it needs no later migration. |
| tools-iuc adoption | **Out of scope.** Each wrapper needs a new base profile first, which is a long-term project of its own. |
| Conditional applicability | **Out of scope for v1; direction decided for a follow-on profile.** Add `<when expression="$(inputs...)" />`, evaluated authoritatively against the exact YAML `JobRuntimeToolState.input_state` immediately before dispatch. Dynamic-option row fields require a general, profile-versioned `job_runtime` extension first. |

## Open questions

1. **Does the credentials Selenium gap get closed alongside this?** Writing license browser coverage
   from scratch builds page objects and `navigation.yml` selectors that credentials could reuse. Fold
   that in with the phase 8 port, or leave credentials uncovered?
