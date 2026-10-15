"""Dataset-click cost versus history size, modelled on the second-round review fixture.

Original history: 10 lists, each with an input list, a mapped-over output list and a
__FILTER_FAILED__-style output whose elements are copies of the inputs, plus one
dataset job (hid 1 -> hid 2). The copied history is a full copy with copied collections.
Background HDAs live in another history and are job outputs.

Run from the Galaxy worktree with PYTHONPATH=lib and GALAXY_REVIEW_DBURI pointing at a
disposable PostgreSQL database. Optional PROBE_SIZES (comma separated datasets per history)
and PROBE_BACKGROUND_FACTOR (background HDAs per history dataset). Variants are loaded from
the Git revisions named in PROBE_REVISIONS plus the live worktree.
"""

import json
import os
import statistics
import subprocess
import time

from sqlalchemy import (
    event,
    text,
)

from galaxy.managers.job_connections import JobConnectionsManager
from galaxy.model.unittest_utils import GalaxyDataTestApp

LISTS = 10
SIZES = [int(size) for size in os.environ.get("PROBE_SIZES", "30000").split(",")]
BACKGROUND_FACTOR = int(os.environ.get("PROBE_BACKGROUND_FACTOR", "18"))
REVISIONS = os.environ.get("PROBE_REVISIONS", "origin/dev,4d82165af62").split(",")


def load_manager(revision):
    namespace: dict = {}
    source = subprocess.check_output(["git", "show", f"{revision}:lib/galaxy/managers/job_connections.py"], text=True)
    exec(source, namespace)
    return namespace["JobConnectionsManager"]


def build(session, per_history):
    session.execute(
        text(
            "TRUNCATE history, dataset, job, dataset_collection, history_dataset_association, "
            "history_dataset_collection_association, dataset_collection_element, job_to_input_dataset, "
            "job_to_output_dataset, job_to_input_dataset_collection, job_to_output_dataset_collection "
            "RESTART IDENTITY CASCADE"
        )
    )
    background = per_history * BACKGROUND_FACTOR
    k = per_history // (3 * LISTS)
    statements = [
        # history 1 = background, 2 = original, 3 = copy
        "INSERT INTO history (name) VALUES ('background'), ('original'), ('copy')",
        f"INSERT INTO dataset (state) SELECT 'ok' FROM generate_series(1, {background})",
        f"INSERT INTO job (state) SELECT 'ok' FROM generate_series(1, {background // 10})",
        "INSERT INTO history_dataset_association (history_id, hid, dataset_id, validated_state, visible) "
        "SELECT 1, id, id, 'unvalidated', true FROM dataset",
        "INSERT INTO job_to_output_dataset (job_id, dataset_id, name) "
        "SELECT (id - 1) / 10 + 1, id, 'out' FROM history_dataset_association",
        # Clicked pair in the original history.
        "CREATE TEMP TABLE clicked AS SELECT 1 AS hid UNION ALL SELECT 2",
        "INSERT INTO dataset (state) VALUES ('ok'), ('ok')",
        "INSERT INTO history_dataset_association (history_id, hid, dataset_id, validated_state, visible) "
        "SELECT 2, hid, (SELECT max(id) FROM dataset) - 2 + hid, 'unvalidated', true FROM clicked",
        "INSERT INTO job (state) VALUES ('clicked')",
        "INSERT INTO job_to_input_dataset (job_id, dataset_id, name) SELECT (SELECT max(id) FROM job), id, 'in' "
        "FROM history_dataset_association WHERE history_id = 2 AND hid = 1",
        "INSERT INTO job_to_output_dataset (job_id, dataset_id, name) SELECT (SELECT max(id) FROM job), id, 'out' "
        "FROM history_dataset_association WHERE history_id = 2 AND hid = 2",
    ]
    for statement in statements:
        session.execute(text(statement))
    for index in range(LISTS):
        base_hid = 10 + index * (3 * k + 3)
        params = dict(k=k, base=base_hid)
        for statement in [
            # input list
            "INSERT INTO dataset_collection (collection_type, populated_state) VALUES ('list', 'ok')",
            "CREATE TEMP TABLE input_c AS SELECT max(id) AS id FROM dataset_collection",
            "INSERT INTO history_dataset_collection_association (history_id, hid, collection_id, visible) "
            "SELECT 2, :base, id, true FROM input_c",
            "INSERT INTO dataset (state) SELECT 'ok' FROM generate_series(1, :k)",
            "INSERT INTO history_dataset_association (history_id, hid, dataset_id, validated_state, visible) "
            "SELECT 2, :base + 1 + n, (SELECT max(id) FROM dataset) - :k + n, 'unvalidated', false "
            "FROM generate_series(1, :k) n",
            "CREATE TEMP TABLE input_e AS SELECT id, hid - :base - 1 AS n FROM history_dataset_association "
            "WHERE history_id = 2 AND hid BETWEEN :base + 2 AND :base + 1 + :k",
            "INSERT INTO dataset_collection_element (dataset_collection_id, hda_id, element_index, "
            "element_identifier) SELECT (SELECT id FROM input_c), id, n, 'e' || n FROM input_e",
            # mapped-over output list, one job per element
            "INSERT INTO dataset_collection (collection_type, populated_state) VALUES ('list', 'ok')",
            "CREATE TEMP TABLE mapped_c AS SELECT max(id) AS id FROM dataset_collection",
            "INSERT INTO history_dataset_collection_association (history_id, hid, collection_id, visible) "
            "SELECT 2, :base + 1 + :k + 1, id, true FROM mapped_c",
            "INSERT INTO dataset (state) SELECT 'ok' FROM generate_series(1, :k)",
            "INSERT INTO history_dataset_association (history_id, hid, dataset_id, validated_state, visible) "
            "SELECT 2, :base + 2 + :k + n, (SELECT max(id) FROM dataset) - :k + n, 'unvalidated', false "
            "FROM generate_series(1, :k) n",
            "CREATE TEMP TABLE mapped_e AS SELECT id, hid - :base - 2 - :k AS n FROM history_dataset_association "
            "WHERE history_id = 2 AND hid BETWEEN :base + 3 + :k AND :base + 2 + 2 * :k",
            "INSERT INTO dataset_collection_element (dataset_collection_id, hda_id, element_index, "
            "element_identifier) SELECT (SELECT id FROM mapped_c), id, n, 'e' || n FROM mapped_e",
            "INSERT INTO job (state) SELECT 'mapped' FROM generate_series(1, :k)",
            "INSERT INTO job_to_input_dataset (job_id, dataset_id, name) "
            "SELECT (SELECT max(id) FROM job) - :k + n, id, 'in' FROM input_e",
            "INSERT INTO job_to_output_dataset (job_id, dataset_id, name) "
            "SELECT (SELECT max(id) FROM job) - :k + n, id, 'out' FROM mapped_e",
            # filter-style output whose elements are copies of the inputs
            "INSERT INTO dataset_collection (collection_type, populated_state) VALUES ('list', 'ok')",
            "CREATE TEMP TABLE filter_c AS SELECT max(id) AS id FROM dataset_collection",
            "INSERT INTO history_dataset_collection_association (history_id, hid, collection_id, visible) "
            "SELECT 2, :base + 3 + 2 * :k, id, true FROM filter_c",
            "INSERT INTO history_dataset_association (history_id, hid, dataset_id, validated_state, visible, "
            "copied_from_history_dataset_association_id) "
            "SELECT 2, :base + 3 + 2 * :k + e.n, h.dataset_id, 'unvalidated', false, h.id "
            "FROM input_e e JOIN history_dataset_association h ON h.id = e.id",
            "INSERT INTO dataset_collection_element (dataset_collection_id, hda_id, element_index, "
            "element_identifier) SELECT (SELECT id FROM filter_c), id, hid - :base - 3 - 2 * :k, 'e' "
            "FROM history_dataset_association WHERE history_id = 2 AND hid > :base + 3 + 2 * :k "
            "AND hid <= :base + 3 + 3 * :k",
            "INSERT INTO job (state) VALUES ('filter')",
            "INSERT INTO job_to_input_dataset_collection (job_id, dataset_collection_id, name) "
            "SELECT (SELECT max(id) FROM job), id, 'in' FROM history_dataset_collection_association "
            "WHERE history_id = 2 AND hid = :base",
            "INSERT INTO job_to_output_dataset_collection (job_id, dataset_collection_id, name) "
            "SELECT (SELECT max(id) FROM job), id, 'out' FROM history_dataset_collection_association "
            "WHERE history_id = 2 AND hid = :base + 3 + 2 * :k",
            "DROP TABLE input_c, input_e, mapped_c, mapped_e, filter_c",
        ]:
            session.execute(text(statement), params)
    # Full history copy: every HDA, collection and element.
    for statement in [
        "INSERT INTO history_dataset_association (history_id, hid, dataset_id, validated_state, visible, "
        "copied_from_history_dataset_association_id) "
        "SELECT 3, hid, dataset_id, 'unvalidated', visible, id FROM history_dataset_association WHERE history_id = 2",
        "CREATE TEMP TABLE collection_map AS SELECT id AS old_id, row_number() OVER (ORDER BY id) AS n "
        "FROM dataset_collection",
        "INSERT INTO dataset_collection (collection_type, populated_state) "
        "SELECT 'list', 'ok' FROM collection_map ORDER BY n",
        "ALTER TABLE collection_map ADD COLUMN new_id integer",
        "UPDATE collection_map SET new_id = n + (SELECT max(id) FROM dataset_collection) - "
        "(SELECT count(*) FROM collection_map)",
        "INSERT INTO dataset_collection_element (dataset_collection_id, hda_id, element_index, element_identifier) "
        "SELECT m.new_id, copy.id, e.element_index, e.element_identifier FROM dataset_collection_element e "
        "JOIN collection_map m ON m.old_id = e.dataset_collection_id "
        "JOIN history_dataset_association copy ON copy.copied_from_history_dataset_association_id = e.hda_id "
        "AND copy.history_id = 3",
        "INSERT INTO history_dataset_collection_association (history_id, hid, collection_id, visible, "
        "copied_from_history_dataset_collection_association_id) "
        "SELECT 3, h.hid, m.new_id, h.visible, h.id FROM history_dataset_collection_association h "
        "JOIN collection_map m ON m.old_id = h.collection_id WHERE h.history_id = 2",
        "DROP TABLE collection_map, clicked",
    ]:
        session.execute(text(statement))
    session.commit()
    session.execute(text("ANALYZE"))
    session.commit()
    counts = session.execute(
        text("SELECT history_id, count(*) FROM history_dataset_association GROUP BY history_id ORDER BY 1")
    ).all()
    return {str(history_id): count for history_id, count in counts}


def main():
    app = GalaxyDataTestApp(database_connection=os.environ["GALAXY_REVIEW_DBURI"])
    session = app.model.session
    engine = session.get_bind()
    managers = [(revision, load_manager(revision)(session)) for revision in REVISIONS]
    managers.append(("worktree", JobConnectionsManager(session)))
    results = []
    for per_history in SIZES:
        result: dict = {"datasets_per_history": per_history, "hdas_by_history": build(session, per_history)}
        for label, history_id in (("original", 2), ("copy", 3)):
            samples: dict[str, list[float]] = {name: [] for name, _ in managers}
            answers = {}
            for repeat in range(9):
                for name, manager in managers:
                    start = time.perf_counter()
                    answers[name] = sorted(manager.get_related_hids(history_id, 1))
                    if repeat >= 2:
                        samples[name].append((time.perf_counter() - start) * 1000)
            for name, answer in answers.items():
                if name != "origin/dev" or label == "original":
                    assert answer == [1, 2], (name, label, answer)
            result[f"{label}_median_ms"] = {name: round(statistics.median(vals), 2) for name, vals in samples.items()}
            captured = []

            def capture(conn, cursor, statement, parameters, context, executemany):
                captured.append((statement, parameters))

            event.listen(engine, "before_cursor_execute", capture)
            try:
                JobConnectionsManager(session).get_related_hids(history_id, 1)
            finally:
                event.remove(engine, "before_cursor_execute", capture)
            with engine.connect() as conn:
                plans = [
                    conn.exec_driver_sql("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + statement, parameters).scalar()[0]
                    for statement, parameters in captured
                ]
            result[f"{label}_worktree_execution_ms"] = [round(plan["Execution Time"], 2) for plan in plans]
            result[f"{label}_worktree_jit"] = [bool(plan.get("JIT")) for plan in plans]
            if os.environ.get("PROBE_PLAN_DIR"):
                path = os.path.join(os.environ["PROBE_PLAN_DIR"], f"{per_history}_{label}.json")
                with open(path, "w") as handle:
                    json.dump(plans, handle, indent=1)
        results.append(result)
        print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
