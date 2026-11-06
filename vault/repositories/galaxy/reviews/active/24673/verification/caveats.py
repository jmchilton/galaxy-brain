"""Exercise review caveats on real PostgreSQL: deadlock on one output, hid wait across connections."""
import os, sys, threading, time, uuid
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
from galaxy import model
from galaxy.datatypes.registry import Registry
from galaxy.objectstore import QuotaSourceMap

HDA = model.HistoryDatasetAssociation
Q, OK = model.Dataset.states.QUEUED, model.Dataset.states.OK

class Store:
    def __init__(self): self._quota_source_map = QuotaSourceMap()
    def get_quota_source_map(self): return self._quota_source_map
    def get_store_by(self, *a, **k): return "id"
    def exists(self, *a, **k): return False
    def delete(self, *a, **k): return True
    def size(self, *a, **k): return 0
    def is_private(self, *a, **k): return False
    def get_concrete_store_name(self, *a, **k): return "x"
    def get_concrete_store_badges(self, *a, **k): return []

admin = make_url(os.environ["GALAXY_TEST_DBURI"])
db = f"caveat_{uuid.uuid4().hex}"
aeng = create_engine(admin, isolation_level="AUTOCOMMIT")
with aeng.connect() as c: c.execute(text(f"CREATE DATABASE {db}"))
engine = create_engine(admin.set(database=db))
model.mapper_registry.metadata.create_all(engine)
model.setup_global_object_store_for_models(Store())
r = Registry(); r.load_datatypes(); model.set_datatypes_registry(r)

def S(): return Session(engine, autoflush=False)
def new(s, h, st):
    x = HDA(history=h, extension="txt", create_dataset=True, sa_session=s, flush=False); x.dataset.state = st; s.add(x); return x
def wait_lock(n=1, t=15):
    end = time.monotonic()+t
    with engine.connect() as c:
        while time.monotonic() < end:
            k = c.execute(text("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'")).scalar()
            if k >= n: return k
            c.commit(); time.sleep(0.05)
    return 0
def waiters():
    with engine.connect() as c:
        return [tuple(x) for x in c.execute(text("SELECT pid,state,wait_event_type,left(query,70) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()")).all()]
def run(fn):
    out = {}
    def go():
        try: fn(); out["ok"]=True
        except Exception as e: out["err"]=f"{type(e).__name__}: {str(e)[:160]}"
    t = threading.Thread(target=go, daemon=True); t.start(); return t, out

def caveat_a():
    print("== A: single output, copier locks copy then source, swap in between")
    with S() as s:
        h = model.History(name="a"); s.add(h)
        o = new(s,h,Q); c = new(s,h,OK); s.commit()
        el = o.copy(flush=False); s.commit()
        oid, cid, eid = o.id, c.id, el.id
    copier = S()
    copier.get(HDA, oid); e = copier.get(HDA, eid)
    e.copy(flush=False)
    def swap():
        with S() as rn:
            x = rn.get(HDA, oid)
            try:
                x.copy_from(rn.get(HDA, cid), include_metadata=True); rn.commit()
            except Exception as ex:
                print(" runner first error:", type(ex).__name__)
                try:
                    rn.refresh(x); print(" refresh ok")
                except Exception as ex2:
                    print(" refresh after deadlock raises:", type(ex2).__name__, str(ex2)[:80])
                raise
    t, out = run(swap)
    print(" runner waiting:", wait_lock())
    err = None
    t0=time.monotonic()
    try:
        copier.get(HDA, oid).copy(flush=False); copier.commit()
    except Exception as ex:
        err = f"{type(ex).__name__}: {str(ex)[:120]}"; copier.rollback()
    t.join(20)
    print(f" {time.monotonic()-t0:.2f}s copier:", err, " runner:", out)
    copier.close()

def caveat_b(with_history_update=True):
    print(f"== B: hid wait across connections, history_update={with_history_update}")
    with S() as s:
        h = model.History(name="b"); s.add(h)
        o = new(s,h,Q); c1 = new(s,h,OK); disc = new(s,h,OK)
        job = model.Job(); job.history=h; s.add(job); job.add_output_dataset("out1", o)
        cj = model.Job(); cj.history=h; s.add(cj); cj.add_output_dataset("out1", c1); cj.add_output_dataset("__new_primary_file_foo|bar", disc)
        s.commit()
        hid, oid, jid, cjid = h.id, o.id, job.id, cj.id
    copier = S()
    if with_history_update:
        copier.get(model.History, hid).genome_build = "hg19"; copier.flush()
    src = copier.get(HDA, oid); assert src.state == Q
    def swap():
        with S() as rn:
            rn.get(model.Job, jid).copy_from_job(rn.get(model.Job, cjid), copy_outputs=True); rn.commit()
    t, out = run(swap)
    n = wait_lock(t=4)
    print(" runner waiting:", n, waiters())
    t2, out2 = run(lambda: (src.copy(flush=False), copier.commit()))
    t.join(12); t2.join(1)
    print(" after 12s (deadlock_timeout 1s): runner alive", t.is_alive(), out, "copier alive", t2.is_alive(), out2)
    print(" backends:"); [print("  ", w) for w in waiters()]
    if t.is_alive() or t2.is_alive():
        with engine.connect() as c:
            c.execute(text("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()")); c.commit()
    t.join(5); t2.join(5)
    print(" after terminate: runner", out, "copier", out2)
    copier.close()

caveat_a()
caveat_b(True)
engine.dispose()
with aeng.connect() as c:
    c.execute(text(f"DROP DATABASE {db} WITH (FORCE)"))
