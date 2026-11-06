"""Compare DeleteLibraryDatasets SQL at base vs PR; measure row fan-out."""
import ast, subprocess, sys, tempfile, time
from sqlalchemy import text
from galaxy.model import mapping
WT = "/Users/jxc755/projects/worktrees/galaxy/pr/24745"
BASE = "ab036aead321293bd814df75d08fa7c7b4aaa998"
def sql_of(src):
    for n in ast.parse(src).body:
        if isinstance(n, ast.ClassDef) and n.name == "DeleteLibraryDatasets":
            for b in n.body:
                if isinstance(b, ast.Assign) and b.targets[0].id == "_action_sql":
                    return b.value.value
pr = sql_of(open(f"{WT}/scripts/cleanup_datasets/pgcleanup.py").read())
base = sql_of(subprocess.check_output(["git","-C",WT,"show",f"{BASE}:scripts/cleanup_datasets/pgcleanup.py"],text=True))
URL = sys.argv[1]
m = mapping.init(tempfile.mkdtemp(), URL, create_tables=True)
N = 200000
with m.engine.begin() as c:
    c.execute(text("TRUNCATE library_dataset, library_dataset_dataset_association, metadata_file, cleanup_event CASCADE"))
    c.execute(text("INSERT INTO library_dataset (id, deleted, purged, update_time, create_time) SELECT g, true, false, now() - interval '30 day', now() FROM generate_series(1,:n) g"), {"n": N})
    c.execute(text("INSERT INTO library_dataset_dataset_association (id, library_dataset_id, validated_state, deleted, update_time, create_time) SELECT g, g, 'unknown', false, now(), now() FROM generate_series(1,:n) g"), {"n": N})
    c.execute(text("INSERT INTO metadata_file (id, lda_id, deleted, purged, object_store_id, update_time, create_time) SELECT g, g, false, false, null, now(), now() FROM generate_series(1,:n) g"), {"n": N})
    # one library dataset with 20 versions, 3 metadata files per version
    c.execute(text("INSERT INTO library_dataset (id, deleted, purged, update_time, create_time) VALUES (:i, true, false, now() - interval '30 day', now())"), {"i": N+1})
    c.execute(text("INSERT INTO library_dataset_dataset_association (id, library_dataset_id, validated_state, deleted, update_time, create_time) SELECT :n + g, :i, 'unknown', false, now(), now() FROM generate_series(1,20) g"), {"n": N, "i": N+1})
    c.execute(text("INSERT INTO metadata_file (id, lda_id, deleted, purged, update_time, create_time) SELECT :n + 1000 + g, :n + 1 + (g % 20), false, false, now(), now() FROM generate_series(1,60) g"), {"n": N})
    ev = c.execute(text("INSERT INTO cleanup_event (create_time, message) VALUES (now(),'exp') RETURNING id")).scalar()
    c.execute(text("ANALYZE"))
def render(sql, force_retry):
    frs = "" if force_retry else " AND NOT purged"
    return sql.format(update_time_sql="", force_retry_sql=frs, epoch_time="0", object_store_id_sql="")
args = {"days": 14, "event_id": ev, "batch_size": 5000}
def trial(label, sql, force):
    q = render(sql, force)
    with m.engine.connect() as c:
        tx = c.begin()
        t = time.perf_counter(); r = c.execute(text(q), args).all(); dt = time.perf_counter()-t
        hot = sum(1 for x in r if x[0] == N+1)
        print(f"{label:28s} rows={len(r):7d} hot_ld_rows={hot:5d} {dt*1000:9.0f}ms", flush=True)
        tx.rollback()
trial("base first run", base, False)
trial("PR first run", pr, False)
# settle state, then time force-retry no-op
with m.engine.begin() as c:
    c.execute(text(render(pr, False)), args)
trial("base force-retry no-op", base, True)
trial("PR force-retry no-op", pr, True)
with m.engine.connect() as c:
    tx = c.begin()
    for row in c.execute(text("EXPLAIN (ANALYZE, BUFFERS) " + render(pr, True)), args):
        print(row[0][:130])
    tx.rollback()
