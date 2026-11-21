This is largely a one-way door: it adds a persistent `dataset_protection_grant` table and `job.protection_scheme` column, new public `/api/datasets/{id}/protection` endpoints and grant payload schema, a `<inner_ext>.c4gh` datatype naming convention that tools, workflows and histories will come to depend on, and a browser-to-localhost recryptor protocol that external services (the user-side and compute-side recryptors) must implement.

<details><summary>Risk Details</summary>

- The migration creates a new table and job column; downgrade drops grants, so once deployed, grants and job protection history are lost on rollback.
- `GET`/`PUT /api/datasets/{dataset_id}/protection` and `Crypt4GHGrantPayload` (`crypt4gh_compute_header`, `crypt4gh_compute_keypair_id`, `crypt4gh_compute_keypair_expiration_date`) become a public contract for external recryptor tooling; renaming fields or generalising beyond `scheme: crypt4gh` later is a breaking change.
- `<inner_ext>.c4gh` wrapper datatypes, auto-registered and matched as inputs to tools accepting the inner type, establish datatype and converter-dependency semantics (`get_converter_deps` refactor in the registry and model) that saved workflows, tool authors and histories will rely on.
- Config surface (`crypt4gh_enabled`, `crypt4gh_user_service_url`, the `crypt4gh_recrypt_service` user preference, job destination parameters) and the admin doc commit Galaxy to a specific deployment model: a user-run localhost service holding the private key, reached from the browser.
- Behavioural changes in core job code paths (`jobs/__init__.py`, `command_factory.py`, `handler.py`, runners, Pulsar, `set_metadata.py`, `output_collect`, `model/store/discover.py`, post-job actions) apply to every job; regressions here would affect non-Crypt4GH deployments even with the feature disabled.
- Jobs with `protection_scheme` set replace stored tool stdout/stderr with a fixed message and strip tool-output job messages; this changes what users and admins can see when debugging those jobs.
- Grants are bound to user and underlying `Dataset` and do not travel with copies; this sharing semantic will be hard to change once users depend on it.
- The scale (about 8.8k lines, a new 893-line manager, new `job_execution.protection` package and a new `crypt4gh` dependency) adds long-term maintenance cost for a security-sensitive feature.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should focus first on the API and data model: whether the grant table, the `protection_scheme` job column and the `/protection` endpoint/payload are generic enough for future protection schemes, since these are hard to change once released and external recryptor services build against them. The `.c4gh` datatype convention and the converter-dependency refactor deserve a datatype maintainer's eye, because they shape how tools and workflows see encrypted inputs.

Second, confirm the core job-execution changes are fully inert when `crypt4gh_enabled` is false (command construction, metadata setting, output collection, Pulsar staging, post-job actions), and that the decrypt/encrypt-on-compute path, grant expiry and the stdout suppression are reviewed by someone comfortable with the threat model the admin doc describes.

</details>
