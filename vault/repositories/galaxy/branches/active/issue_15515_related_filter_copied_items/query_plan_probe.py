"""Run from a Galaxy worktree with PYTHONPATH=lib and GALAXY_REVIEW_DBURI set.

Use an isolated empty PostgreSQL database: this probe creates synthetic fixtures.
"""

import json
import os
import runpy
from types import SimpleNamespace

from galaxy import model
from galaxy.managers.job_connections import JobConnectionsManager
from galaxy.model.unittest_utils import GalaxyDataTestApp
from sqlalchemy import event, insert, select, text

app = GalaxyDataTestApp(database_connection=os.environ["GALAXY_REVIEW_DBURI"])
s = app.model.session
cases = runpy.run_path("test/unit/app/managers/test_JobConnectionsManager.py")
for kind in ("dataset", "collection"):
    for name in (
        "test_related_hids_job_output_copy_boundary",
        "test_related_hids_cached_job_output",
        "test_related_hids_consumers_on_intermediate_copies",
        "test_related_hids_deep_copy_query_count",
        "test_related_hids_cyclic_copy_links",
    ):
        depths = (
            (0, 20) if name == "test_related_hids_deep_copy_query_count" else (None,)
        )
        for depth in depths:
            fixture = cases["related_items"].__wrapped__(s, SimpleNamespace(param=kind))
            if depth is None:
                cases[name](s, fixture)
            else:
                cases[name](s, fixture, depth)
            print(f"PASS PostgreSQL: {name}[{kind}, depth={depth}]", flush=True)
cases["test_related_hids_shared_dataset_is_not_a_copy"](s)
for nested in (False, True):
    cases["test_related_hids_hidden_collection_output_copy_boundary"](s, nested)
    print(f"PASS PostgreSQL: hidden collection output[nested={nested}]", flush=True)
for collection_input in (False, True):
    cases["test_related_hids_reused_collection_element_keeps_provenance"](
        s, collection_input
    )
    print(
        f"PASS PostgreSQL: reused element[collection_input={collection_input}]",
        flush=True,
    )
print("PASS PostgreSQL: shared-dataset hidden-item exclusion", flush=True)

history, item = cases["related_items"].__wrapped__(s, SimpleNamespace(param="dataset"))
source = item(1)
output = item(2, creating_input=source)
ordinary_collection_history, collection_item = cases["related_items"].__wrapped__(
    s, SimpleNamespace(param="collection")
)
collection_input = collection_item(1)
collection_item(2, creating_input=collection_input)
imported_history = model.History()
s.add(imported_history)
s.flush()
item(1, copied_from=source, history=imported_history)
item(2, copied_from=output, history=imported_history)
# Many importers sharing the same physical data must not expand a dataset-id lookup.
other_histories = [model.History() for _ in range(10000)]
s.add_all(other_histories)
s.flush()
rows = []
for h in other_histories:
    for hid, original in ((1, source), (2, output)):
        rows.append(
            {
                "history_id": h.id,
                "hid": hid,
                "dataset_id": original.dataset_id,
                "copied_from_history_dataset_association_id": original.id,
            }
        )
s.execute(insert(model.HistoryDatasetAssociation.__table__), rows)
# Large ordinary history: no collection copy chains should be expanded.
collections = [model.DatasetCollection(collection_type="list") for _ in range(2000)]
s.add_all(collections)
s.flush()
s.execute(
    insert(model.HistoryDatasetCollectionAssociation.__table__),
    [
        {
            "history_id": ordinary_collection_history.id,
            "hid": hid,
            "collection_id": c.id,
        }
        for hid, c in enumerate(collections, 3)
    ],
)
copied_collection_history = model.History()
s.add(copied_collection_history)
s.flush()
hdca = model.HistoryDatasetCollectionAssociation
collection_rows = s.execute(
    select(hdca.id, hdca.hid, hdca.collection_id).where(
        hdca.history_id == ordinary_collection_history.id
    )
).all()
s.execute(
    insert(hdca.__table__),
    [
        {
            "history_id": copied_collection_history.id,
            "hid": row.hid,
            "collection_id": row.collection_id,
            "copied_from_history_dataset_collection_association_id": row.id,
        }
        for row in collection_rows
    ],
)
s.commit()
s.execute(text("ANALYZE"))
s.commit()

for label, history_id, hid in (
    ("imported_shared_datasets", imported_history.id, 1),
    ("ordinary_history_2002_collections", ordinary_collection_history.id, 1),
    ("imported_history_2002_collections", copied_collection_history.id, 1),
):
    captured = []

    def capture(conn, cursor, statement, parameters, context, executemany, recorded=captured):
        recorded.append((statement, parameters))

    engine = s.get_bind()
    event.listen(engine, "before_cursor_execute", capture)
    try:
        hids = JobConnectionsManager(s).get_related_hids(history_id, hid)
    finally:
        event.remove(engine, "before_cursor_execute", capture)
    assert sorted(hids) == [1, 2], hids
    assert len(captured) == 2
    statement, parameters = captured[-1]
    with engine.connect() as conn:
        plan = conn.exec_driver_sql(
            "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + statement, parameters
        ).scalar()
        metadata = conn.exec_driver_sql(
            "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + captured[0][0], captured[0][1]
        ).scalar()
        plan[0]["Metadata Planning Time"] = metadata[0]["Planning Time"]
        plan[0]["Metadata Execution Time"] = metadata[0]["Execution Time"]
    path = os.path.join(
        os.environ.get("GALAXY_REVIEW_PLAN_DIR", "/tmp"), f"24106-plan-{label}.json"
    )
    with open(path, "w") as out:
        json.dump(plan, out, indent=2)
    print(f'PLAN {label}: {plan[0]["Execution Time"]} ms; {path}', flush=True)

    def inspect(node):
        if node.get("Node Type") == "Recursive Union" or node.get("Relation Name") in (
            "history_dataset_association",
            "history_dataset_collection_association",
        ):
            print(
                {
                    k: node[k]
                    for k in (
                        "Node Type",
                        "CTE Name",
                        "Relation Name",
                        "Index Name",
                        "Actual Rows",
                        "Actual Loops",
                        "Filter",
                        "Index Cond",
                    )
                    if k in node
                },
                flush=True,
            )
        for child in node.get("Plans", []):
            inspect(child)

    inspect(plan[0]["Plan"])
