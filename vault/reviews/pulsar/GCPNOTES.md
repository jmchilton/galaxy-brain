Batch-only, this gets much tighter — and it corrects what I told you earlier.

The two clients already made the same choice

Galaxy's Batch runner, gcp_batch.py:218-219:

prefix = params.get("job_id_prefix") or "galaxy-job"
job_name = f"{prefix}-{int(time.time())}-{os.urandom(4).hex()}-{job_wrapper.get_id_tag()}"

Galaxy uses a timestamp too. Given the 473 review already established the sizing helpers are a near-verbatim fork of Galaxy's helpers.py, Keith's f"{prefix}-{job_id}-{int(time.time())}" is almost certainly a port of that line. It just dropped two things:

- os.urandom(4).hex() — the part that actually makes it collision-safe within a second
- the persistence — ajs.job_id = batch_job_name; job_wrapper.set_external_id(batch_job_name) (:196-197), recovered on restart via get_job_runner_external_id() (:832)

So I need to correct myself. I said the clock was the wrong instrument. It isn't — Galaxy proves it works. Non-recomputability is a feature once you persist: it's what lets a retry of the same Galaxy job get a fresh Batch ID without colliding. The defect in 473 is narrower than I framed it: it generates a name designed to be stored, and then doesn't store it.

Which also answers the instance_id question

Galaxy's Batch runner doesn't use instce_id if set, else timestamp" would move Galaxy away from its working design aneither. Batch-only, instance_id isn't
the axis — it's namespacing for a shartch solves with project+region scoping
and labels.

The tighter convergence

Both clients already have job_id_prefirent defaults (galaxy-job vs pulsar).
Four things line up:

1. One naming function. Adopt Galaxy'sictly better than 473's (random suffix,
includes the Galaxy job id). Prefix stfault.

2. Persistence on the Pulsar side. Thes typed: CoexecutionLaunchMixin.launch()
-> Optional[ExternalId] and staging/upxternalId change I flagged earlier — it
isn't an alternative to the timestamp,it.

  Ran 1 shell command

Now the picture is complete, and it chet me check one more thing — whether
Pulsar populates labels:

  Ran 1 shell command

Batch-only, this gets much tighter — and it corrects what I told you earlier.
The two clients already made the same

Galaxy's Batch runner, gcp_batch.py:218-219:
                                                                                                  prefix = params.get("job_id_prefix") o
job_name = f"{prefix}-{int(time.time())}-{os.urandom(4).hex()}-{job_wrapper.get_id_tag()}"

Galaxy uses a timestamp too. Given the 473 review already established the sizing helpers are a    near-verbatim fork of Galaxy's helpersob_id}-{int(time.time())}" is almostcertainly a port of that line. It just dropped two things:

- os.urandom(4).hex() — the part that actually makes it collision-safe within a second            - the persistence — ajs.job_id = batch_external_id(batch_job_name) (:196-197), recovered on restart via get_job_runner_external_id() (:832)

So I need to correct myself. I said the clock was the wrong instrument. It isn't — Galaxy proves iworks. Non-recomputability is a featurhat lets a retry of the same Galaxy jobget a fresh Batch ID without colliding. The defect in 473 is narrower than I framed it: it generates a name designed to be stored, and then doesn't store it.                                            
Which also answers the instance_id question
                                                                                                  Galaxy's Batch runner doesn't use instce_id if set, else timestamp" would move Galaxy away from its working design and wouldn't match Pulsar's either. Batch-only, instance_id isn't the axis — it's namespacing for a shared-cluster problem that Batch solves with project+region scoand labels.

The tighter convergence                                                                           
Both clients already have job_id_prefix — same param name, different defaults (galaxy-job vs pulsaFour things line up:
                                                                                                  1. One naming function. Adopt Galaxy'sictly better than 473's (random suffix,includes the Galaxy job id). Prefix stays the per-application default.                            2. Persistence on the Pulsar side. Thes typed: CoexecutionLaunchMixin.launch()-> Optional[ExternalId] and staging/upxternalId change I flagged earlier — itisn't an alternative to the timestamp,it.3. Labels. Galaxy sets galaxy-job-id, ner, galaxy-handler (:431-436). Pulsarhas the plumbing — GcpJobParams.labelsabels or {}(container_job_config.py:141, :271) — it's operator-supplied only. Pulsarshould set the same identifying labels4. sanitize_label_value. Galaxy has it has no equivalent. That's a naturalmember of the shared module, and its mob ids is what finding 19 was askingfor.One thing to check while doing it: Galrs with the default prefix, comfortablyunder Batch's 63-char cap — but a long operator-set job_id_prefix will silently push past it. Neitside validates. Worth fixing once, in
                                                                                                  So: same direction as the HTCondor utiodule mirrored into both, holding naming+ label sanitation + id validation, wig only its own prefix default andpersistence call. And it makes my openbranch partly wrong: it made Pulsar'snaming deterministic, which converges ES/k8s/GCP but moves the GCP path awayfrom Galaxy. Worth deciding which convat branch goes to Keith.
                                                                          