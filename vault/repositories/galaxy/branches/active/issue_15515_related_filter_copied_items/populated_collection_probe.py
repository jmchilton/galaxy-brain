"""Probe real History.copy() on 250 nonempty output collections.

Run from a Galaxy worktree with PYTHONPATH=lib and GALAXY_REVIEW_DBURI pointing
at an isolated PostgreSQL database containing the Galaxy test model schema.
"""

import json
import os

from galaxy import model
from galaxy.managers.job_connections import JobConnectionsManager
from galaxy.model.unittest_utils import GalaxyDataTestApp
from sqlalchemy import event, text
from sqlalchemy.orm import Session

app = GalaxyDataTestApp(database_connection=os.environ["GALAXY_REVIEW_DBURI"])
engine = app.model.session.get_bind()
with Session(engine) as s:
    history = model.History()
    source = model.HistoryDatasetAssociation(
        sa_session=s, history=history, hid=1, create_dataset=True
    )
    output = model.HistoryDatasetAssociation(
        sa_session=s, history=history, hid=2, create_dataset=True
    )
    job = model.Job()
    job.add_input_dataset("input", source)
    job.add_output_dataset("output", output)
    s.add_all([history, source, output, job])
    s.flush()
    hid = 3
    for index in range(250):
        dc = model.DatasetCollection(collection_type="list")
        hdca = model.HistoryDatasetCollectionAssociation(
            history=history, hid=hid, collection=dc
        )
        hid += 1
        for element_index in range(3):
            hidden = model.HistoryDatasetAssociation(
                sa_session=s, history=history, hid=hid, create_dataset=True
            )
            hidden.copy_from(source)
            hidden.visible = False
            hid += 1
            dc.elements.append(
                model.DatasetCollectionElement(
                    element=hidden,
                    element_identifier=str(element_index),
                    element_index=element_index,
                )
            )
            s.add(hidden)
        filter_job = model.Job()
        filter_job.add_input_dataset("input", source)
        filter_job.add_output_dataset_collection("output", hdca)
        s.add_all([hdca, filter_job])
    s.flush()
    copied = history.copy()
    s.add(copied)
    s.commit()
    s.execute(text("ANALYZE"))
    s.commit()
    history_id = copied.id
    captured = []

    def capture(conn, cursor, statement, parameters, context, executemany):
        captured.append((statement, parameters))

    event.listen(engine, "before_cursor_execute", capture)
    try:
        hids = JobConnectionsManager(s).get_related_hids(history_id, 2)
    finally:
        event.remove(engine, "before_cursor_execute", capture)
    assert sorted(hids) == [1, 2], hids
    assert len(captured) == 2
    stmt, params = captured[-1]
    with engine.connect() as conn:
        plan = conn.exec_driver_sql(
            "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + stmt, params
        ).scalar()
        metadata = conn.exec_driver_sql(
            "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + captured[0][0], captured[0][1]
        ).scalar()
        plan[0]["Metadata Planning Time"] = metadata[0]["Planning Time"]
        plan[0]["Metadata Execution Time"] = metadata[0]["Execution Time"]
    with open("/tmp/24106-plan-imported_populated_collections.json", "w") as out:
        json.dump(plan, out, indent=2)
    print(
        "Populated imported history (250 collections, 750 hidden copies):",
        {k: plan[0][k] for k in ("Planning Time", "Execution Time")},
        flush=True,
    )

    def visit(n):
        if n.get("Relation Name") in (
            "history_dataset_association",
            "history_dataset_collection_association",
            "dataset_collection_element",
        ):
            print(
                {
                    k: n[k]
                    for k in (
                        "Node Type",
                        "Relation Name",
                        "Index Name",
                        "Actual Rows",
                        "Actual Loops",
                    )
                    if k in n
                }
            )
        for child in n.get("Plans", []):
            visit(child)

    visit(plan[0]["Plan"])
