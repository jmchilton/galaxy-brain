"""Statement counts for Dataset.full_delete on PR vs baseline vs subquery alternative."""
import sys, time, tempfile
from sqlalchemy import event, select, or_
from sqlalchemy.orm import object_session
import galaxy.model as model
from galaxy.model import mapping

URL = sys.argv[1] if len(sys.argv) > 1 else "sqlite:///:memory:"
assert "pr/24745" in model.__file__, model.__file__
m = mapping.init(tempfile.mkdtemp(), URL, create_tables=True)
engine = m.engine
stmts = []
event.listen(engine, "before_cursor_execute", lambda c, cur, s, p, ctx, em: stmts.append(s))

class Store:
    deletes = 0
    def get_store_by(self, o): return "id"
    def delete(self, o, **kw): Store.deletes += 1
    def exists(self, o, **kw): return False
model.Dataset.object_store = Store()
PR = model.Dataset._delete_metadata_files

def alt(self, user=None):
    session = object_session(self)
    if session is None:
        return
    store_by = self.object_store.get_store_by(self) or "id"
    hda_ids = select(model.HistoryDatasetAssociation.id).where(model.HistoryDatasetAssociation.dataset_id == self.id)
    ldda_ids = select(model.LibraryDatasetDatasetAssociation.id).where(model.LibraryDatasetDatasetAssociation.dataset_id == self.id)
    q = select(model.MetadataFile).where(
        or_(model.MetadataFile.hda_id.in_(hda_ids), model.MetadataFile.lda_id.in_(ldda_ids)),
        model.MetadataFile.purged.isnot(True),
    )
    for mf in session.scalars(q):
        self.object_store.delete(mf, extra_dir="_metadata_files", extra_dir_at_root=True, alt_name=f"metadata_{getattr(mf, store_by)}.dat")
        mf.deleted = True
        mf.purged = True
VARIANTS = {"baseline": lambda self, user=None: None, "PR": PR, "subquery": alt}

def build(n_datasets, n_copies, purged=True):
    s = m.session_factory() if hasattr(m, "session_factory") else m.session()
    h = model.History(name="h"); s.add(h)
    ids = []
    for _ in range(n_datasets):
        ds = model.Dataset(); s.add(ds)
        for _ in range(n_copies):
            hda = model.HistoryDatasetAssociation(extension="txt", dataset=ds, history=h, sa_session=s, create_dataset=False)
            hda.purged = purged; hda.deleted = purged
            s.add(hda)
            s.add(model.MetadataFile(dataset=hda, name="bai"))
        s.flush(); ids.append(ds.id)
    s.commit(); s.close()
    return ids

def run(label, fn):
    for name, impl in VARIANTS.items():
        model.Dataset._delete_metadata_files = impl
        s = m.session_factory() if hasattr(m, "session_factory") else m.session()
        stmts.clear(); Store.deletes = 0
        t = time.perf_counter()
        fn(s)
        elapsed = time.perf_counter() - t
        selects = sum(1 for x in stmts if x.lstrip().upper().startswith("SELECT"))
        mf_sel = sum(1 for x in stmts if "FROM metadata_file" in x)
        print(f"{label:34s} {name:9s} stmts={len(stmts):6d} selects={selects:6d} mf_selects={mf_sel:5d} store_deletes={Store.deletes:6d} {elapsed*1000:9.1f}ms")
        s.rollback(); s.close()

# 1: purge_datasets loop, K datasets, one purged HDA each
K = 500
def purge_loop_fresh(s):
    local = build(K, 1)
    stmts.clear(); Store.deletes = 0
    for i in local:
        d = s.get(model.Dataset, i)
        if d.user_can_purge:
            d.full_delete()
    s.commit()
run(f"purge_datasets {K}x1 copy", purge_loop_fresh)

# 3: popular dataset, N copies, full_delete with no prior association load (job finish / copy_from path)
N = 5000
pop = build(1, N)[0]
def popular_direct(s):
    s.get(model.Dataset, pop).full_delete()
    s.flush()
run(f"direct full_delete {N} copies", popular_direct)

# 4: popular dataset with associations already loaded by user_can_purge
def popular_can_purge(s):
    d = s.get(model.Dataset, pop)
    assert d.user_can_purge
    d.full_delete()
    s.flush()
run(f"user_can_purge+delete {N} copies", popular_can_purge)

# 5: copy_from dataset swap on 1 output (cached-job path) - HDA has no metadata file
def copy_from(s):
    h = model.History(name="c"); s.add(h)
    old = model.Dataset(); src_ds = model.Dataset(); s.add_all([old, src_ds])
    out = model.HistoryDatasetAssociation(extension="txt", dataset=old, history=h, sa_session=s, create_dataset=False)
    src = model.HistoryDatasetAssociation(extension="txt", dataset=src_ds, history=h, sa_session=s, create_dataset=False)
    s.add_all([out, src]); s.commit()
    out_id, src_id = out.id, src.id
    s.expire_all(); s.expunge_all()
    out = s.get(model.HistoryDatasetAssociation, out_id); src = s.get(model.HistoryDatasetAssociation, src_id)
    stmts.clear(); Store.deletes = 0
    out.copy_from(src, include_tags=False, include_metadata=False)
run("copy_from 1 output", copy_from)
