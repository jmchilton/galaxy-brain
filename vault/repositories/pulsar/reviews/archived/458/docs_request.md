🤖 *Drafted by Claude (AI assistant) on John Chilton's behalf — not authored by John personally.*

# PR #458 docs: pulsar-relay consistency additions

Scope: bring `docs/configure.rst` back to internal completeness now that PR #458
adds a capability snapshot to the relay. These are **consistency/maintenance**
additions describing only what this PR already does — not new design.

Speculative documentation is explicitly **excluded** (see "Out of scope" below):
the Galaxy-side BYOC consumer contract (how Galaxy fetches/interprets the
snapshot, auto-fill/downgrade logic) is a moving target on a separate, unmerged
Galaxy PR and arguably belongs in Galaxy's docs, not Pulsar's.

---

## Why these two are needed (not speculative)

1. **The Architecture enumeration is now incomplete.** The "Message Queue
   (pulsar-relay)" section numbers *every* interaction that crosses the relay
   (1–5). The capability snapshot is a real additional Pulsar→Relay interaction;
   omitting it makes that list an inaccurate description of what the relay carries.
2. **Config-option parity.** `configure.rst` documents every relay knob
   (`message_queue_url`, `message_queue_username`/`password`,
   `relay_topic_prefix`). `message_queue_publish_capabilities` is the only relay
   option that lives solely in `app.yml.sample` and nowhere in prose.

---

## Change 1 — extend the Architecture list

In `docs/configure.rst`, the numbered list under **Architecture** currently ends:

```rst
5. **File Transfers**: Pulsar transfers files directly to/from Galaxy via HTTP
   (not through the relay)
```

Add a sixth item immediately after it:

```rst
6. **Pulsar → Relay (capabilities)**: On startup Pulsar publishes a one-shot,
   advisory snapshot of its configuration and host capabilities (staging
   directories, dependency resolvers, available container runtimes, manager
   type) to the ``pulsar_capabilities`` topic. Galaxy reads the latest snapshot
   to auto-fill destination parameters and to downgrade per-job requests the
   remote Pulsar cannot satisfy. This publish is fire-and-forget — a failure
   never blocks Pulsar startup.
```

(The ASCII diagram below the list does not need to change — capabilities ride
the same Pulsar↔Relay channel already drawn.)

## Change 2 — new subsection after "Galaxy Configuration"

Insert a new sub-subsection (backtick underline, matching the existing
"Authentication"/"Architecture" heading style) between **Galaxy Configuration**
and **Authentication**:

```rst
Capability Snapshot
```````````````````

When using relay mode, Pulsar publishes a single capability snapshot per
manager when it binds to the relay at startup. Galaxy's "bring your own
compute" integration reads the most recent snapshot to pre-fill destination
parameters and to refuse or downgrade jobs that request something the remote
Pulsar does not provide (e.g. a container runtime that is not on ``PATH``).

The snapshot is published to the ``pulsar_capabilities`` topic — or
``<relay_topic_prefix>_pulsar_capabilities[_<manager>]`` when a topic prefix or
non-default manager name is configured, mirroring the other relay topics.

This behavior is on by default and can be disabled::

    message_queue_publish_capabilities: false

.. note::

    The snapshot is advisory. A publish failure is logged and swallowed — it
    never blocks Pulsar startup — and if no snapshot is available Galaxy falls
    back to the operator-supplied destination parameters. The data is collected
    once at startup and is static for the lifetime of the process.
```

---

## Optional (not consistency-required) — `docs/error_handling.rst`

`error_handling.rst` documents the relay *delivery-guarantee* machinery
(status-update outbox, per-topic cursor, at-least-once, the failure-mode
table). The capability publish deliberately has none of that — no outbox, no
cursor, no retry. Not a glaring gap, but one sentence prevents readers
assuming every relay POST is delivery-guaranteed. Suggested, in the relay
durability discussion:

> The startup capability snapshot is intentionally *advisory* and is excluded
> from these durability defenses — it carries no outbox or cursor; a missed or
> failed publish simply means Galaxy uses operator-supplied destination
> parameters until the next Pulsar restart re-publishes.

---

## Out of scope (deliberately excluded as speculative)

* **Galaxy-side BYOC consumer documentation** — how Galaxy fetches the snapshot
  (`GET /api/v1/topics/{topic}/messages?limit=1&order=desc`), interprets schema
  fields, and applies auto-fill/downgrade. That contract is still in flux on a
  separate unmerged Galaxy PR; documenting it in Pulsar now would pin a moving
  target and arguably belongs in Galaxy's documentation.
* **Wire schema reference** (`schema_version=1` field-by-field) — premature
  until at least one merged consumer exists; the docstring in
  `pulsar/capabilities.py` is the source of truth for now.
